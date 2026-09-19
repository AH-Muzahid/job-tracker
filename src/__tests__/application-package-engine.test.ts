import { describe, it, expect, vi, beforeEach } from "vitest"
import { compileApplicationPackage } from "@/lib/applications/package-engine"
import { GET } from "@/app/api/applications/[id]/package/route"
import { NextRequest } from "next/server"

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  getInternalUserId: vi.fn(),
}))

vi.mock("@/lib/rate-limit", () => ({
  checkDistributedRateLimit: vi.fn(),
}))

vi.mock("@/lib/prisma", () => {
  const mockPrisma = {
    application: {
      findFirst: vi.fn(),
    },
    resume: {
      findFirst: vi.fn(),
    },
  }
  return {
    prisma: mockPrisma,
    withDbRetry: vi.fn((fn: () => unknown) => fn()),
  }
})

describe("CAG-06: Application Multi-Asset Studio Package Engine", () => {
  const mockUserId = "test-user-package-123"
  const mockAppId = "test-app-package-456"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("compileApplicationPackage Engine", () => {
    it("returns null when application does not exist or tenant mismatch", async () => {
      const { prisma } = await import("@/lib/prisma")
      vi.mocked(prisma.application.findFirst).mockResolvedValueOnce(null)

      const result = await compileApplicationPackage(mockUserId, "non-existent")
      expect(result).toBeNull()
    })

    it("compiles complete package for a STAGED application with tailored resume and outreach", async () => {
      const { prisma } = await import("@/lib/prisma")
      const now = new Date()

      vi.mocked(prisma.application.findFirst).mockResolvedValueOnce({
        id: mockAppId,
        userId: mockUserId,
        companyName: "Vercel",
        jobTitle: "Senior Next.js Developer",
        jobUrl: "https://vercel.com/careers/senior-nextjs",
        status: "Staged",
        source: "Discovery 1-Click Package",
        applicationDate: now,
        createdAt: now,
        updatedAt: now,
        notes: "Exciting frontend cloud role",
        company: {
          id: "comp-1",
          name: "Vercel",
        },
        analysis: {
          id: "analysis-1",
          matchScore: 92,
          jdKeywords: ["Next.js", "React", "Server Components"],
          rawJd: "We are seeking a Senior Next.js Developer experienced with TypeScript and Tailwind CSS.",
          rawAnalysis: "Strong candidate fit.",
          applyStrategy: {
            coverLetter: "Dear Vercel Hiring Team, I am thrilled to apply for the Senior Next.js Developer role.",
          },
          outreachSubject: "Next.js Core Passionate Developer - Alex Mercer",
          outreachBody: "Hi team, I noticed the open Senior Next.js Developer role...",
          outreachChecklist: ["Mention App Router experience", "Highlight open source PRs"],
          outreachGeneratedAt: now,
          tailoredResumeJson: {
            summary: "Frontend architect specializing in high-performance Next.js apps.",
            skills: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
          },
          analyzedAt: now,
        },
        statusChanges: [
          {
            fromStatus: null,
            toStatus: "Staged",
            changedAt: now,
            metadata: { trigger: "1-click-packaging" },
          },
        ],
        tags: [
          {
            tag: { name: "Remote" },
          },
        ],
      } as any)

      vi.mocked(prisma.resume.findFirst).mockResolvedValueOnce({
        id: "res-default",
        title: "Master Software Engineer Resume",
        fileName: "resume-2026.pdf",
        fileUrl: "https://storage.careertrack.io/resume-2026.pdf",
      } as any)

      const pkg = await compileApplicationPackage(mockUserId, mockAppId)

      expect(pkg).not.toBeNull()
      expect(pkg?.application.companyName).toBe("Vercel")
      expect(pkg?.application.status).toBe("Staged")

      // Check tech stack extraction combines keywords + rawJd tags + tags
      expect(pkg?.techStack).toContain("Next.js")
      expect(pkg?.techStack).toContain("React")
      expect(pkg?.techStack).toContain("typescript")

      // Check resume & default resume
      expect(pkg?.resume.hasTailoredResume).toBe(true)
      expect(pkg?.resume.atsScore).toBe(92)
      expect(pkg?.resume.defaultResumeTitle).toBe("Master Software Engineer Resume")

      // Check cover letter & outreach
      expect(pkg?.coverLetter.hasCoverLetter).toBe(true)
      expect(pkg?.coverLetter.text).toContain("Dear Vercel Hiring Team")
      expect(pkg?.outreach.hasOutreachDraft).toBe(true)
      expect(pkg?.outreach.subject).toContain("Next.js Core Passionate Developer")
      expect(pkg?.outreach.checklist).toHaveLength(2)

      // Check company intel verified flag
      expect(pkg?.companyIntel.verified).toBe(true)
      expect(pkg?.companyIntel.companyName).toBe("Vercel")

      // Check next best action
      expect(pkg?.nextBestAction.type).toBe("SUBMIT_APPLICATION")
      expect(pkg?.nextBestAction.ctaLabel).toBe("Submit Application")
      expect(pkg?.nextBestAction.urgency).toBe("high")
    })

    it("determines SEND_FOLLOWUP next action for dormant APPLIED application", async () => {
      const { prisma } = await import("@/lib/prisma")
      const now = new Date()
      const eightBusinessDaysAgo = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000)

      vi.mocked(prisma.application.findFirst).mockResolvedValueOnce({
        id: mockAppId,
        userId: mockUserId,
        companyName: "Stripe",
        jobTitle: "Software Engineer - Payments",
        status: "Applied",
        source: "Manual",
        applicationDate: eightBusinessDaysAgo,
        createdAt: eightBusinessDaysAgo,
        updatedAt: eightBusinessDaysAgo,
        notes: null,
        company: null,
        analysis: null,
        statusChanges: [],
        tags: [],
      } as any)

      const pkg = await compileApplicationPackage(mockUserId, mockAppId)

      expect(pkg).not.toBeNull()
      expect(pkg?.nextBestAction.type).toBe("SEND_FOLLOWUP")
      expect(pkg?.nextBestAction.urgency).toBe("urgent")
      expect(pkg?.nextBestAction.ctaLabel).toBe("Review & Send Follow-Up")
    })

    it("determines PREP_INTERVIEW next action for INTERVIEW application", async () => {
      const { prisma } = await import("@/lib/prisma")
      const now = new Date()
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      vi.mocked(prisma.application.findFirst).mockResolvedValueOnce({
        id: mockAppId,
        userId: mockUserId,
        companyName: "Linear",
        jobTitle: "Product Engineer",
        status: "Interview",
        source: "LinkedIn",
        applicationDate: now,
        createdAt: now,
        updatedAt: now,
        interviewDate: tomorrow,
        interviewRound: "System Architecture",
        interviewMeetingUrl: "https://meet.google.com/lin-ear-123",
        company: null,
        analysis: null,
        statusChanges: [],
        tags: [],
      } as any)

      const pkg = await compileApplicationPackage(mockUserId, mockAppId)

      expect(pkg).not.toBeNull()
      expect(pkg?.interviewPrep.hasScheduledInterview).toBe(true)
      expect(pkg?.interviewPrep.interviewRound).toBe("System Architecture")
      expect(pkg?.interviewPrep.interviewMeetingUrl).toBe("https://meet.google.com/lin-ear-123")
      expect(pkg?.nextBestAction.type).toBe("PREP_INTERVIEW")
      expect(pkg?.nextBestAction.title).toContain("System Architecture")
    })
  })

  describe("GET /api/applications/[id]/package Endpoint", () => {
    it("returns 401 when unauthorized", async () => {
      const { getInternalUserId } = await import("@/lib/auth")
      vi.mocked(getInternalUserId).mockResolvedValueOnce(null)

      const req = new NextRequest("http://localhost/api/applications/123/package")
      const res = await GET(req, { params: Promise.resolve({ id: "123" }) })

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe("Unauthorized")
    })

    it("returns 429 when rate limited", async () => {
      const { getInternalUserId } = await import("@/lib/auth")
      const { checkDistributedRateLimit } = await import("@/lib/rate-limit")

      vi.mocked(getInternalUserId).mockResolvedValueOnce(mockUserId)
      vi.mocked(checkDistributedRateLimit).mockResolvedValueOnce({
        success: false,
        limit: 60,
        remaining: 0,
        resetInSeconds: 45,
      })

      const req = new NextRequest("http://localhost/api/applications/123/package")
      const res = await GET(req, { params: Promise.resolve({ id: "123" }) })

      expect(res.status).toBe(429)
      const data = await res.json()
      expect(data.error).toContain("Too many requests")
    })

    it("returns 404 when application is not found", async () => {
      const { getInternalUserId } = await import("@/lib/auth")
      const { checkDistributedRateLimit } = await import("@/lib/rate-limit")
      const { prisma } = await import("@/lib/prisma")

      vi.mocked(getInternalUserId).mockResolvedValueOnce(mockUserId)
      vi.mocked(checkDistributedRateLimit).mockResolvedValueOnce({
        success: true,
        limit: 60,
        remaining: 59,
        resetInSeconds: 60,
      })
      vi.mocked(prisma.application.findFirst).mockResolvedValueOnce(null)

      const req = new NextRequest(`http://localhost/api/applications/${mockAppId}/package`)
      const res = await GET(req, { params: Promise.resolve({ id: mockAppId }) })

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe("Application not found")
    })

    it("returns 200 with full package and no-store headers", async () => {
      const { getInternalUserId } = await import("@/lib/auth")
      const { checkDistributedRateLimit } = await import("@/lib/rate-limit")
      const { prisma } = await import("@/lib/prisma")
      const now = new Date()

      vi.mocked(getInternalUserId).mockResolvedValueOnce(mockUserId)
      vi.mocked(checkDistributedRateLimit).mockResolvedValueOnce({
        success: true,
        limit: 60,
        remaining: 59,
        resetInSeconds: 60,
      })

      vi.mocked(prisma.application.findFirst).mockResolvedValueOnce({
        id: mockAppId,
        userId: mockUserId,
        companyName: "Anthropic",
        jobTitle: "Research Engineer",
        status: "Applied",
        source: "Referral",
        applicationDate: now,
        createdAt: now,
        updatedAt: now,
        notes: null,
        company: null,
        analysis: null,
        statusChanges: [],
        tags: [],
      } as any)

      const req = new NextRequest(`http://localhost/api/applications/${mockAppId}/package`)
      const res = await GET(req, { params: Promise.resolve({ id: mockAppId }) })

      expect(res.status).toBe(200)
      expect(res.headers.get("Cache-Control")).toBe("no-store, max-age=0")

      const data = await res.json()
      expect(data.application.companyName).toBe("Anthropic")
      expect(data.application.jobTitle).toBe("Research Engineer")
      expect(data.nextBestAction.type).toBe("AWAIT_RESPONSE")
    })
  })
})
