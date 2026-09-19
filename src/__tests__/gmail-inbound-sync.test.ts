/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  classifyEmailOutcome,
  matchMessageToApplication,
  syncUserInbox,
  extractMeetingUrl,
  extractInterviewRound,
  extractInterviewDate,
  extractBodyText,
} from "@/lib/gmail-sync"
import { inboxSyncScheduler } from "@/inngest/functions/inbox-sync"
import { prisma } from "@/lib/prisma"
import * as gmailModule from "@/lib/gmail"
import { invalidateCache } from "@/lib/redis"

const mockMessagesList = vi.fn()
const mockMessagesGet = vi.fn()

vi.mock("@/lib/redis", () => ({
  invalidateCache: vi.fn().mockResolvedValue(true),
}))

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
    interviewSession: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
  withDbRetry: vi.fn((fn) => fn()),
}))

describe("Inbound Gmail Sync & Recruiter Reply Detection Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Extraction Helpers", () => {
    it("extracts various meeting platform URLs correctly", () => {
      expect(extractMeetingUrl("Join with Google Meet: https://meet.google.com/abc-defg-hij")).toBe(
        "https://meet.google.com/abc-defg-hij"
      )
      expect(extractMeetingUrl("Here is the Zoom: https://zoom.us/j/987654321?pwd=abc")).toBe(
        "https://zoom.us/j/987654321?pwd=abc"
      )
      expect(extractMeetingUrl("Teams meeting: https://teams.microsoft.com/l/meetup-join/19%3ameeting_xyz")).toBe(
        "https://teams.microsoft.com/l/meetup-join/19%3ameeting_xyz"
      )
      expect(extractMeetingUrl("Please pick a time on Calendly: https://calendly.com/recruiter-sarah/30min")).toBe(
        "https://calendly.com/recruiter-sarah/30min"
      )
      expect(extractMeetingUrl("No link here.")).toBeNull()
    })

    it("extracts interview rounds correctly", () => {
      expect(extractInterviewRound("Let's do a quick recruiter screen.")).toBe("Recruiter Screen")
      expect(extractInterviewRound("Next step is a 60min technical screen.")).toBe("Technical Screen")
      expect(extractInterviewRound("You will be meeting with the hiring manager.")).toBe("Hiring Manager")
      expect(extractInterviewRound("The upcoming round will focus on system design.")).toBe("System Design")
      expect(extractInterviewRound("Please complete the take-home technical assessment.")).toBe("Technical Assessment")
      expect(extractInterviewRound("This is a behavioral interview with HR.")).toBe("Behavioral")
      expect(extractInterviewRound("Congratulations on reaching the final round onsite.")).toBe("Final Round")
      expect(extractInterviewRound("Just an update on your profile.")).toBeNull()
    })

    it("extracts interview dates accurately", () => {
      const isoDate = extractInterviewDate("Your interview is scheduled for 2026-10-15T14:00:00Z.")
      expect(isoDate).toBeInstanceOf(Date)
      expect(isoDate?.toISOString()).toBe("2026-10-15T14:00:00.000Z")

      const englishDate = extractInterviewDate("The call will be on October 20, 2026 at 3:00 PM.")
      expect(englishDate).toBeInstanceOf(Date)
      expect(englishDate?.getFullYear()).toBe(2026)

      expect(extractInterviewDate("No date specified here.")).toBeNull()
    })

    it("extracts and decodes body text from single and multipart payloads", () => {
      // Base64 encoded: "Hello world" -> "SGVsbG8gd29ybGQ="
      const singlePart = {
        mimeType: "text/plain",
        body: { data: "SGVsbG8gd29ybGQ=" },
      }
      expect(extractBodyText(singlePart)).toBe("Hello world")

      // Multipart with HTML
      const multiPart = {
        parts: [
          {
            mimeType: "text/html",
            body: { data: Buffer.from("<p>Please join our call at <b>Stripe</b></p>").toString("base64") },
          },
        ],
      }
      expect(extractBodyText(multiPart)).toBe("Please join our call at Stripe")
    })
  })

  describe("classifyEmailOutcome", () => {
    it("classifies interview invitations with extracted meeting URL and round", () => {
      const result = classifyEmailOutcome(
        "Invitation to Interview: Senior Backend Engineer @ Stripe",
        "Hi Alex, we would love to schedule a technical screen with the hiring manager. Here is my Calendly link: https://calendly.com/sarah/screen on October 15, 2026 at 2:00 PM."
      )

      expect(result.intent).toBe("INTERVIEW")
      expect(result.targetStatus).toBe("Interview")
      expect(result.confidence).toBeGreaterThanOrEqual(0.9)
      expect(result.round).toBe("Technical Screen")
      expect(result.meetingUrl).toBe("https://calendly.com/sarah/screen")
      expect(result.interviewDate).toBeInstanceOf(Date)
    })

    it("classifies application confirmation / receipt emails to Applied status", () => {
      const result = classifyEmailOutcome(
        "Thank you for applying to Stripe",
        "We have received your application for Senior Software Engineer. Our team will review your application soon."
      )

      expect(result.intent).toBe("CONFIRMATION")
      expect(result.targetStatus).toBe("Applied")
      expect(result.confidence).toBe(0.9)
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
        "Checking in regarding your questions",
        "Hi Alex, hope you are having a great week. Reaching out regarding your query from yesterday."
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
          interviewDate: null,
          interviewRound: null,
          interviewMeetingUrl: null,
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
          interviewDate: null,
          interviewRound: null,
          interviewMeetingUrl: null,
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
    it("advances STAGED application to Applied when confirmation email is received", async () => {
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

      mockMessagesList.mockResolvedValueOnce({
        data: {
          messages: [{ id: "msg-confirm-1" }],
        },
      })

      mockMessagesGet.mockResolvedValueOnce({
        data: {
          id: "msg-confirm-1",
          snippet: "Thank you for applying to Netflix. We have received your application.",
          payload: {
            headers: [
              { name: "From", value: "Netflix Jobs <jobs@netflix.com>" },
              { name: "Subject", value: "Netflix: Thank you for applying" },
            ],
            body: {
              data: Buffer.from("Thank you for applying. We received your application.").toString("base64"),
            },
          },
        },
      })

      vi.mocked(prisma.application.findMany).mockResolvedValueOnce([
        {
          id: "app-netflix-1",
          companyName: "Netflix",
          jobTitle: "Senior Software Engineer",
          status: "STAGED",
          notes: null,
          interviewDate: null,
          interviewRound: null,
          interviewMeetingUrl: null,
          company: { name: "Netflix", website: "https://netflix.com" },
        },
      ] as any)

      vi.mocked(prisma.application.update).mockResolvedValueOnce({} as any)
      vi.mocked(prisma.statusChange.create).mockResolvedValueOnce({} as any)
      vi.mocked(prisma.notification.create).mockResolvedValueOnce({} as any)

      const syncResult = await syncUserInbox("user-123")

      expect(syncResult.repliesMatched).toBe(1)
      expect(syncResult.statusUpdates).toBe(1)

      // Verified status updated to Applied from STAGED
      expect(prisma.application.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "app-netflix-1" },
          data: expect.objectContaining({
            status: "Applied",
          }),
        })
      )

      expect(prisma.statusChange.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            applicationId: "app-netflix-1",
            fromStatus: "STAGED",
            toStatus: "Applied",
            metadata: expect.objectContaining({
              source: "gmail_inbox_sync",
              intent: "CONFIRMATION",
            }),
          }),
        })
      )
    })

    it("handles interview email: updates status, extracts meeting details, initializes InterviewSession, and invalidates cache", async () => {
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

      mockMessagesList.mockResolvedValueOnce({
        data: {
          messages: [{ id: "msg-recruiter-123" }],
          historyId: "hist-9999",
        },
      })

      const emailBody =
        "Hi Alex, we would love to schedule a technical screen with the hiring manager on 2026-10-15T15:00:00Z. Join us via Zoom: https://zoom.us/j/123456789?pwd=test."

      mockMessagesGet.mockResolvedValueOnce({
        data: {
          id: "msg-recruiter-123",
          snippet: "We would love to invite you to a technical screen interview.",
          payload: {
            headers: [
              { name: "From", value: "Recruiter Team <talent@stripe.com>" },
              { name: "Subject", value: "Stripe Interview Invitation - Staff Engineer" },
            ],
            body: {
              data: Buffer.from(emailBody).toString("base64"),
            },
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
          interviewDate: null,
          interviewRound: null,
          interviewMeetingUrl: null,
          company: { name: "Stripe", website: "https://stripe.com" },
        },
      ] as any)

      vi.mocked(prisma.interviewSession.findFirst).mockResolvedValueOnce(null)
      vi.mocked(prisma.interviewSession.create).mockResolvedValueOnce({} as any)
      vi.mocked(prisma.application.update).mockResolvedValueOnce({} as any)
      vi.mocked(prisma.statusChange.create).mockResolvedValueOnce({} as any)
      vi.mocked(prisma.notification.create).mockResolvedValueOnce({} as any)
      vi.mocked(prisma.connectedAccount.update).mockResolvedValueOnce({} as any)

      const syncResult = await syncUserInbox("user-123")

      expect(syncResult.messagesScanned).toBe(1)
      expect(syncResult.repliesMatched).toBe(1)
      expect(syncResult.statusUpdates).toBe(1)
      expect(syncResult.notificationsCreated).toBe(1)

      // Verify status updated to Interview with round and meeting url
      expect(prisma.application.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "app-stripe-1" },
          data: expect.objectContaining({
            status: "Interview",
            interviewRound: "Technical Screen",
            interviewMeetingUrl: "https://zoom.us/j/123456789?pwd=test",
            interviewDate: expect.any(Date),
          }),
        })
      )

      // Verify StatusChange audit record created with rich metadata
      expect(prisma.statusChange.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            applicationId: "app-stripe-1",
            fromStatus: "Applied",
            toStatus: "Interview",
            metadata: expect.objectContaining({
              source: "gmail_inbox_sync",
              sender: "talent@stripe.com",
              meetingUrl: "https://zoom.us/j/123456789?pwd=test",
              round: "Technical Screen",
            }),
          }),
        })
      )

      // Verify InterviewSession initialized
      expect(prisma.interviewSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-123",
          applicationId: "app-stripe-1",
          targetRole: "Staff Engineer",
          targetCompany: "Stripe",
          interviewType: "Technical Screen",
          dialogue: [],
        }),
      })

      // Verify Cache Invalidation
      expect(invalidateCache).toHaveBeenCalledWith(
        "dashboard:stats:user-123",
        "applications:user-123",
        "user:stats:user-123"
      )

      // Verify In-App Notification created linking to /interview-prep
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-123",
            title: expect.stringContaining("Interview Invitation: Stripe"),
            type: "INTERVIEW",
            link: "/interview-prep?applicationId=app-stripe-1",
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
