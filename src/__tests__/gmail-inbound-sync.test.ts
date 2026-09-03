/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { classifyEmailOutcome, matchMessageToApplication, syncUserInbox } from "@/lib/gmail-sync"
import { inboxSyncScheduler } from "@/inngest/functions/inbox-sync"
import { prisma } from "@/lib/prisma"
import * as gmailModule from "@/lib/gmail"

const mockMessagesList = vi.fn()
const mockMessagesGet = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    statusChange: {
      create: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    connectedAccount: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
  withDbRetry: vi.fn((fn) => fn()),
}))

describe("Inbound Gmail Sync & Recruiter Reply Detection Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("classifyEmailOutcome", () => {
    it("classifies interview invitations with high confidence", () => {
      const result = classifyEmailOutcome(
        "Invitation to Interview: Senior Backend Engineer @ Stripe",
        "Hi Alex, we would love to schedule a technical screen with the hiring manager. Here is my Calendly link."
      )

      expect(result.intent).toBe("INTERVIEW")
      expect(result.targetStatus).toBe("Interview")
      expect(result.confidence).toBeGreaterThanOrEqual(0.9)
    })

    it("classifies formal job offers with top precedence", () => {
      const result = classifyEmailOutcome(
        "Offer Letter - Staff Systems Engineer",
        "We are pleased to offer you the position of Staff Systems Engineer. Please review the attached compensation package."
      )

      expect(result.intent).toBe("OFFER")
      expect(result.targetStatus).toBe("Offer")
      expect(result.confidence).toBeGreaterThanOrEqual(0.95)
    })

    it("classifies rejection emails accurately", () => {
      const result = classifyEmailOutcome(
        "Update regarding your application at Datadog",
        "Thank you for taking the time to apply. Unfortunately, we have decided to pursue other candidates whose experience aligns more closely."
      )

      expect(result.intent).toBe("REJECTION")
      expect(result.targetStatus).toBe("Rejected")
      expect(result.confidence).toBeGreaterThanOrEqual(0.9)
    })

    it("handles general correspondence gracefully", () => {
      const result = classifyEmailOutcome(
        "We received your application",
        "Thank you for submitting your resume. Our talent team is currently reviewing submissions."
      )

      expect(result.intent).toBe("GENERAL")
      expect(result.targetStatus).toBeUndefined()
    })
  })

  describe("matchMessageToApplication", () => {
    it("matches application by recruiter email domain", async () => {
      vi.mocked(prisma.application.findMany).mockResolvedValueOnce([
        {
          id: "app-stripe-1",
          companyName: "Stripe",
          jobTitle: "Software Engineer",
          status: "Applied",
          notes: null,
          company: { name: "Stripe", website: "https://stripe.com" },
        },
      ] as any)

      const matched = await matchMessageToApplication(
        "user-123",
        "sarah.recruiter@stripe.com",
        "Next Steps in your hiring process",
        "Hi, thanks for reaching out..."
      )

      expect(matched).toBeDefined()
      expect(matched?.id).toBe("app-stripe-1")
      expect(matched?.companyName).toBe("Stripe")
    })

    it("matches application by company name in email subject", async () => {
      vi.mocked(prisma.application.findMany).mockResolvedValueOnce([
        {
          id: "app-uber-1",
          companyName: "Uber",
          jobTitle: "DevOps Engineer",
          status: "Applied",
          notes: null,
          company: { name: "Uber", website: "https://uber.com" },
        },
      ] as any)

      const matched = await matchMessageToApplication(
        "user-123",
        "recruiting-agency@externalheadhunters.com",
        "Your Application at Uber for DevOps Role",
        "Hi Alex, regarding your candidacy at Uber..."
      )

      expect(matched).toBeDefined()
      expect(matched?.id).toBe("app-uber-1")
      expect(matched?.companyName).toBe("Uber")
    })
  })

  describe("syncUserInbox Execution", () => {
    it("polls unread messages, matches applications, updates status, and sends notification", async () => {
      const mockGmailClient = {
        users: {
          messages: {
            list: mockMessagesList,
            get: mockMessagesGet,
          },
        },
      }

      vi.spyOn(gmailModule, "getAuthenticatedGmailClient").mockResolvedValueOnce({
        gmail: mockGmailClient as any,
        email: "candidate@gmail.com",
      })

      // 1 unread message found
      mockMessagesList.mockResolvedValueOnce({
        data: {
          messages: [{ id: "msg-recruiter-123" }],
          historyId: "hist-9999",
        },
      })

      mockMessagesGet.mockResolvedValueOnce({
        data: {
          id: "msg-recruiter-123",
          snippet: "We would love to invite you to an interview for the Staff Engineer position next week.",
          payload: {
            headers: [
              { name: "From", value: "Recruiter Team <talent@stripe.com>" },
              { name: "Subject", value: "Stripe Interview Invitation - Staff Engineer" },
            ],
          },
        },
      })

      vi.mocked(prisma.application.findMany).mockResolvedValueOnce([
        {
          id: "app-stripe-1",
          companyName: "Stripe",
          jobTitle: "Staff Engineer",
          status: "Applied",
          notes: null,
          company: { name: "Stripe", website: "https://stripe.com" },
        },
      ] as any)

      vi.mocked(prisma.application.update).mockResolvedValueOnce({} as any)
      vi.mocked(prisma.statusChange.create).mockResolvedValueOnce({} as any)
      vi.mocked(prisma.notification.create).mockResolvedValueOnce({} as any)
      vi.mocked(prisma.connectedAccount.update).mockResolvedValueOnce({} as any)

      const syncResult = await syncUserInbox("user-123")

      expect(syncResult.messagesScanned).toBe(1)
      expect(syncResult.repliesMatched).toBe(1)
      expect(syncResult.statusUpdates).toBe(1)
      expect(syncResult.notificationsCreated).toBe(1)

      // Verify status updated to Interview
      expect(prisma.application.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "app-stripe-1" },
          data: expect.objectContaining({
            status: "Interview",
          }),
        })
      )

      // Verify StatusChange audit record created
      expect(prisma.statusChange.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            applicationId: "app-stripe-1",
            fromStatus: "Applied",
            toStatus: "Interview",
          }),
        })
      )

      // Verify In-App Notification created
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-123",
            title: expect.stringContaining("Recruiter Reply: Stripe"),
            type: "INTERVIEW",
            link: "/applications/app-stripe-1",
          }),
        })
      )
    })
  })

  describe("Inngest 1-Hour Cron Scheduler", () => {
    it("runs 1-hour cron, queries connected Google accounts, and iterates inbox syncs", async () => {
      vi.mocked(prisma.connectedAccount.findMany).mockResolvedValueOnce([
        { userId: "user-a" },
        { userId: "user-b" },
      ] as any)

      const mockStep = {
        run: vi.fn(async (stepName: string) => {
          if (stepName === "fetch-connected-google-accounts") {
            return [{ userId: "user-a" }, { userId: "user-b" }]
          }
          return {
            userId: "user-a",
            messagesScanned: 2,
            repliesMatched: 1,
            statusUpdates: 1,
            notificationsCreated: 1,
            errors: [],
          }
        }),
      }

      const handler = (inboxSyncScheduler as any)["fn"]
      const result = await handler({
        event: {},
        step: mockStep,
      })

      expect(result.status).toBe("completed")
      expect(result.usersProcessed).toBe(2)
      expect(result.totalScanned).toBe(4)
      expect(result.totalMatched).toBe(2)
      expect(result.totalUpdated).toBe(2)
    })
  })
})
