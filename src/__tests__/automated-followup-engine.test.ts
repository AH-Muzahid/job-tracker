/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  calculateBusinessDays,
  isFollowUpDue,
  generateFollowUpDraft,
  stageFollowUpForApplication,
  dispatchFollowUpForApplication,
} from "@/lib/applications/follow-up-engine"
import { prisma } from "@/lib/prisma"
import * as emailTools from "@/lib/ai/graph/tools/email-tools"
import { GET, POST } from "@/app/api/applications/[id]/follow-up/route"
import { NextRequest } from "next/server"

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    applicationAnalysis: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    statusChange: {
      create: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
  withDbRetry: vi.fn((fn) => fn()),
}))

// Mock Auth
vi.mock("@/lib/auth", () => ({
  getInternalUserId: vi.fn().mockResolvedValue("user-test-123"),
}))

// Mock Redis
vi.mock("@/lib/redis", () => ({
  invalidateCache: vi.fn().mockResolvedValue(true),
  getCachedJson: vi.fn().mockResolvedValue(null),
  setCachedJson: vi.fn().mockResolvedValue(true),
}))

// Mock Rate Limit
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ success: true }),
  checkDistributedRateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}))

// Mock AI
vi.mock("ai", () => ({
  generateText: vi.fn(),
}))

vi.mock("@/lib/ai/config", () => ({
  getUserAIConfig: vi.fn().mockResolvedValue(null),
}))

// Mock Email Tools
vi.mock("@/lib/ai/graph/tools/email-tools", () => ({
  executeSendOutreachEmail: vi.fn().mockResolvedValue({
    success: true,
    message: "Follow-up email sent",
    provider: "resend",
  }),
}))

describe("CAG-15: Automated 5-Day Follow-Up Dispatch Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Dormancy & Business Days Calculation", () => {
    it("accurately calculates business days excluding weekends", () => {
      // Monday to Friday of the same week = 4 days elapsed
      const monday = new Date("2026-09-07T10:00:00Z") // Monday
      const friday = new Date("2026-09-11T10:00:00Z") // Friday
      expect(calculateBusinessDays(monday, friday)).toBe(4)

      // Friday to next Monday = 1 business day (Saturday/Sunday skipped)
      const nextMonday = new Date("2026-09-14T10:00:00Z")
      expect(calculateBusinessDays(friday, nextMonday)).toBe(1)

      // 7 calendar days (Mon to next Mon) = 5 business days
      expect(calculateBusinessDays(monday, nextMonday)).toBe(5)
    })

    it("identifies application as follow-up due when Applied >= 5 business days ago", () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      const app = {
        status: "Applied",
        applicationDate: tenDaysAgo.toISOString(),
      }

      expect(isFollowUpDue(app)).toBe(true)
    })

    it("does not flag applications applied recently (< 5 business days)", () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const app = {
        status: "Applied",
        applicationDate: oneDayAgo.toISOString(),
      }

      expect(isFollowUpDue(app)).toBe(false)
    })

    it("ignores non-active pipeline stages (Staged, Saved, Rejected, Offer)", () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      expect(isFollowUpDue({ status: "Staged", applicationDate: tenDaysAgo })).toBe(false)
      expect(isFollowUpDue({ status: "Saved", applicationDate: tenDaysAgo })).toBe(false)
      expect(isFollowUpDue({ status: "Rejected", applicationDate: tenDaysAgo })).toBe(false)
      expect(isFollowUpDue({ status: "Offer", applicationDate: tenDaysAgo })).toBe(false)
    })
  })

  describe("Draft Generation & Staging", () => {
    it("generates structured follow-up draft using fallback when offline", async () => {
      const draft = await generateFollowUpDraft({
        userId: "user-test-123",
        applicationId: "app-1",
        companyName: "Linear",
        jobTitle: "Senior Frontend Engineer",
        candidateName: "Alex Mercer",
        applicationDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      })

      expect(draft.subject).toContain("Linear")
      expect(draft.subject).toContain("Senior Frontend Engineer")
      expect(draft.body).toContain("Dear Linear Hiring Team")
      expect(draft.body).toContain("Senior Frontend Engineer")
      expect(draft.checklist.length).toBeGreaterThanOrEqual(3)
      expect(draft.daysSinceApplied).toBeGreaterThanOrEqual(5)
    })

    it("stages follow-up draft into PostgreSQL ApplicationAnalysis", async () => {
      const mockDraft = {
        subject: "Following up on Frontend Role - Alex",
        body: "Dear Hiring Team,\n\nFollowing up on my application...",
        checklist: ["Checked links", "Brief & concise"],
        generatedAt: new Date().toISOString(),
        daysSinceApplied: 6,
      }

      vi.mocked(prisma.applicationAnalysis.findUnique).mockResolvedValueOnce({
        id: "analysis-1",
        applicationId: "app-1",
        applyStrategy: {},
      } as any)

      await stageFollowUpForApplication("app-1", mockDraft)

      expect(prisma.applicationAnalysis.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { applicationId: "app-1" },
          update: expect.objectContaining({
            outreachSubject: mockDraft.subject,
            outreachBody: mockDraft.body,
            outreachChecklist: mockDraft.checklist,
          }),
        })
      )
    })
  })

  describe("1-Click Dispatch & Audit Trail", () => {
    it("dispatches follow-up email and logs StatusChange audit trail", async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValueOnce({
        id: "app-linear-1",
        userId: "user-test-123",
        companyName: "Linear",
        jobTitle: "Product Engineer",
        status: "Applied",
        notes: "Apply via email: jobs@linear.app",
        company: { name: "Linear" },
      } as any)

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        name: "Alex Mercer",
        email: "alex@example.com",
      } as any)

      vi.mocked(prisma.applicationAnalysis.findUnique).mockResolvedValueOnce({
        id: "analysis-1",
        applicationId: "app-linear-1",
        outreachSubject: "Following up: Product Engineer at Linear",
        outreachBody: "Dear Linear Hiring Team...",
        applyStrategy: {},
      } as any)

      const result = await dispatchFollowUpForApplication("user-test-123", "app-linear-1")

      expect(result.success).toBe(true)
      expect(emailTools.executeSendOutreachEmail).toHaveBeenCalledWith(
        "user-test-123",
        expect.objectContaining({
          toEmail: "jobs@linear.app",
          subject: "Following up: Product Engineer at Linear",
        })
      )

      // Verify StatusChange audit logging
      expect(prisma.statusChange.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          applicationId: "app-linear-1",
          fromStatus: "Applied",
          toStatus: "Applied",
          metadata: expect.objectContaining({
            event: "FOLLOW_UP_DISPATCHED",
            toEmail: "jobs@linear.app",
          }),
        }),
      })

      // Verify Application.updatedAt reset
      expect(prisma.application.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "app-linear-1" },
          data: expect.objectContaining({
            updatedAt: expect.any(Date),
          }),
        })
      )
    })
  })

  describe("API Endpoints /api/applications/[id]/follow-up", () => {
    it("GET returns dormancy status, days elapsed, and staged draft", async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      vi.mocked(prisma.application.findUnique).mockResolvedValueOnce({
        id: "app-1",
        userId: "user-test-123",
        companyName: "Vercel",
        jobTitle: "Software Engineer",
        status: "Applied",
        applicationDate: tenDaysAgo,
        analysis: {
          outreachSubject: "Following up on Software Engineer",
          outreachBody: "Dear Vercel Hiring Team...",
          outreachChecklist: ["Clear CTA"],
          outreachGeneratedAt: new Date(),
          applyStrategy: { followUpStatus: "DRAFTED" },
        },
      } as any)

      const req = new NextRequest("http://localhost:3000/api/applications/app-1/follow-up")
      const res = await GET(req, { params: Promise.resolve({ id: "app-1" }) })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.isFollowUpDue).toBe(true)
      expect(json.businessDaysElapsed).toBeGreaterThanOrEqual(5)
      expect(json.draft).toBeDefined()
      expect(json.draft.subject).toBe("Following up on Software Engineer")
    })

    it("POST with action=generate generates and stages draft", async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValueOnce({
        id: "app-1",
        userId: "user-test-123",
        companyName: "GitHub",
        jobTitle: "Staff Engineer",
        status: "Applied",
        applicationDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        user: { name: "Alex" },
      } as any)

      const req = new NextRequest("http://localhost:3000/api/applications/app-1/follow-up", {
        method: "POST",
        body: JSON.stringify({ action: "generate" }),
      })

      const res = await POST(req, { params: Promise.resolve({ id: "app-1" }) })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.draft.subject).toContain("GitHub")
    })

    it("POST with action=send triggers dispatch and returns confirmation", async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValueOnce({
        id: "app-1",
        userId: "user-test-123",
        companyName: "Stripe",
        jobTitle: "Backend Engineer",
        status: "Applied",
        notes: "hiring@stripe.com",
        user: { name: "Alex" },
      } as any)

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        name: "Alex",
        email: "alex@example.com",
      } as any)

      vi.mocked(prisma.applicationAnalysis.findUnique).mockResolvedValueOnce({
        id: "analysis-1",
        applicationId: "app-1",
        outreachSubject: "Follow-up",
        outreachBody: "Body",
      } as any)

      const req = new NextRequest("http://localhost:3000/api/applications/app-1/follow-up", {
        method: "POST",
        body: JSON.stringify({ action: "send", toEmail: "recruiter@stripe.com" }),
      })

      const res = await POST(req, { params: Promise.resolve({ id: "app-1" }) })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.action).toBe("send")
      expect(json.dispatchedAt).toBeDefined()
    })
  })
})
