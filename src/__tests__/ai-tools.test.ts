/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  executeCreateApplication,
  executeUpdateApplicationStatus,
  executeSearchApplications,
  executeDeleteApplication,
} from "@/lib/ai/graph/tools/job-tools"
import { executeSendOutreachEmail } from "@/lib/ai/graph/tools/email-tools"
import { executeCreateWeeklyGoal } from "@/lib/ai/graph/tools/goal-tools"
import { executeToolByName } from "@/lib/ai/graph/tools"
import { prisma, withDbRetry } from "@/lib/prisma"

// Mock prisma and withDbRetry
vi.mock("@/lib/prisma", () => {
  const mockPrisma = {
    application: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    statusChange: {
      create: vi.fn(),
    },
    company: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
    },
    weeklyGoal: {
      upsert: vi.fn(),
    },
    userMemory: {
      create: vi.fn(),
      upsert: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    userProfile: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    resume: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    connectedAccount: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  }
  return {
    prisma: mockPrisma,
    withDbRetry: vi.fn((fn: () => any) => fn()),
  }
})

vi.mock("@/lib/redis", () => ({
  invalidateCache: vi.fn().mockResolvedValue(true),
  getCachedJson: vi.fn().mockResolvedValue(null),
  setCachedJson: vi.fn().mockResolvedValue(true),
}))

describe("Decoupled Domain AI Agent Tools Suite", () => {
  const testUserId = "test-user-uuid-999"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Application Lifecycle Tools", () => {
    it("createApplication creates new record with default Applied status", async () => {
      const mockCreated = {
        id: "app-1",
        userId: testUserId,
        companyName: "Google",
        jobTitle: "Staff Software Engineer",
        status: "Applied",
        source: "LinkedIn",
        applicationDate: new Date(),
      }
      vi.mocked(prisma.application.create).mockResolvedValueOnce(mockCreated as any)

      const result = await executeCreateApplication(testUserId, {
        companyName: "Google",
        jobTitle: "Staff Software Engineer",
        source: "LinkedIn",
      })

      expect(result.success).toBe(true)
      expect(result.applicationId).toBe("app-1")
    })

    it("updateApplicationStatus updates existing application status", async () => {
      const existingApp = {
        id: "app-2",
        userId: testUserId,
        companyName: "Amazon",
        jobTitle: "Backend Lead",
        status: "Applied",
        notes: null,
      }
      const updatedApp = { ...existingApp, status: "Interview" }

      vi.mocked(prisma.application.findMany).mockResolvedValueOnce([existingApp] as any)
      vi.mocked(prisma.application.update).mockResolvedValueOnce(updatedApp as any)

      const result = await executeUpdateApplicationStatus(testUserId, {
        companyOrTitle: "Amazon",
        newStatus: "Interview",
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain("Interview")
    })

    it("deleteApplication removes target application", async () => {
      const mockDeleted = {
        id: "app-3",
        userId: testUserId,
        companyName: "Uber",
        jobTitle: "Senior DevOps",
      }
      vi.mocked(prisma.application.findFirst).mockResolvedValueOnce(mockDeleted as any)
      vi.mocked(prisma.application.delete).mockResolvedValueOnce(mockDeleted as any)

      const result = await executeDeleteApplication(testUserId, {
        companyOrTitle: "Uber",
      })

      expect(result.success).toBe(true)
      expect(result.deletedId).toBe("app-3")
    })

    it("searchApplications queries applications by criteria", async () => {
      const mockList = [
        { id: "app-4", companyName: "Netflix", jobTitle: "Frontend Engineer", status: "Offer" },
      ]
      vi.mocked(prisma.application.findMany).mockResolvedValueOnce(mockList as any)

      const result = await executeSearchApplications(testUserId, {
        query: "Netflix",
      })

      expect(result.success).toBe(true)
      expect(result.count).toBe(1)
      expect(result.applications?.[0]?.companyName).toBe("Netflix")
    })
  })

  describe("Productivity & Outreach Dispatch Tools", () => {
    it("createWeeklyGoal upserts goals for the current week", async () => {
      const mockGoal = {
        id: "goal-1",
        userId: testUserId,
        goal1: "Apply to 10 companies",
        goal1Target: 10,
        goal1Status: "NotStarted",
      }
      vi.mocked(prisma.weeklyGoal.upsert).mockResolvedValueOnce(mockGoal as any)

      const result = await executeCreateWeeklyGoal(testUserId, {
        goal1: "Apply to 10 companies",
        goal1Target: 10,
      })

      expect(result.success).toBe(true)
      expect((result as any).goal?.goal1).toBe("Apply to 10 companies")
    })

    it("sendOutreachEmailViaResend dispatches or simulates email", async () => {
      const result = await executeSendOutreachEmail(testUserId, {
        toEmail: "recruiter@stripe.com",
        subject: "Senior Backend Engineer Application",
        bodyText: "I am excited to apply for this role.",
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain("recruiter@stripe.com")
    })
  })

  describe("Master Tool Dispatcher", () => {
    it("dispatches recognized tools via executeToolByName", async () => {
      const mockCreated = {
        id: "app-10",
        userId: testUserId,
        companyName: "Meta",
        jobTitle: "Production Engineer",
        status: "Applied",
      }
      vi.mocked(prisma.application.create).mockResolvedValueOnce(mockCreated as any)

      const result = await executeToolByName("createApplication", {
        companyName: "Meta",
        jobTitle: "Production Engineer",
      }, testUserId)

      expect(result.success).toBe(true)
    })

    it("returns error for unrecognized tool", async () => {
      const result = await executeToolByName("unknownToolXYZ", {}, testUserId)
      expect(result.success).toBe(false)
      expect(result.error).toContain("not recognized")
    })
  })
})
