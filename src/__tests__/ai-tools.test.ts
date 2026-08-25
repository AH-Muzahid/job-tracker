/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { createAiTools } from "@/lib/ai/tools"
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
    prepNote: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    prepQuestion: {
      createMany: vi.fn(),
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
    resume: {
      findFirst: vi.fn(),
    },
    userProfile: {
      findUnique: vi.fn(),
    },
    careerKnowledgeGraph: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  }

  return {
    prisma: mockPrisma,
    withDbRetry: vi.fn(async (fn: () => unknown) => fn()),
  }
})

// Mock Redis cache functions
vi.mock("@/lib/redis", () => ({
  getCachedData: vi.fn(async (_key, fetcher) => fetcher()),
  setCachedData: vi.fn(async () => {}),
  getCachedJson: vi.fn(async () => null),
  setCachedJson: vi.fn(async () => true),
  invalidateCache: vi.fn(async () => {}),
}))

describe("Autonomous AI Agent Tools Suite", () => {
  const userId = "test-user-123"
  let tools: ReturnType<typeof createAiTools>

  beforeEach(() => {
    vi.clearAllMocks()
    tools = createAiTools(userId)
  })

  describe("Application Lifecycle Tools", () => {
    it("createApplication creates new job entry in tracker", async () => {
      vi.mocked(prisma.application.findFirst).mockResolvedValueOnce(null)
      vi.mocked(prisma.application.create).mockResolvedValueOnce({
        id: "app-1",
        userId,
        companyName: "Stripe",
        jobTitle: "Senior Backend Engineer",
        status: "Applied",
        jobUrl: "https://stripe.com/jobs/1",
        source: "LinkedIn",
        notes: "Referral from teammate",
        applicationDate: new Date(),
        companyId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      const result = await (tools.createApplication as any).execute({
        companyName: "Stripe",
        jobTitle: "Senior Backend Engineer",
        status: "Applied",
        jobUrl: "https://stripe.com/jobs/1",
        source: "LinkedIn",
        notes: "Referral from teammate",
      })

      expect(result.success).toBe(true)
      expect(result.companyName).toBe("Stripe")
      expect(result.status).toBe("Applied")
    })

    it("createApplication prevents duplicate application creation", async () => {
      vi.mocked(prisma.application.findFirst).mockResolvedValueOnce({
        id: "app-1",
        userId,
        companyName: "Stripe",
        jobTitle: "Senior Backend Engineer",
        status: "Applied",
      } as any)

      const result = await (tools.createApplication as any).execute({
        companyName: "Stripe",
        jobTitle: "Senior Backend Engineer",
        status: "Applied",
      })

      expect(result.success).toBe(false)
      expect(result.isDuplicate).toBe(true)
      expect(result.message).toContain("Duplicate Detected")
      expect(prisma.application.create).not.toHaveBeenCalled()
    })

    it("updateApplicationStatus updates application and creates status change history", async () => {
      vi.mocked(prisma.application.findFirst).mockResolvedValueOnce({
        id: "app-1",
        userId,
        companyName: "Stripe",
        jobTitle: "Senior Backend Engineer",
        status: "Applied",
        notes: null,
      } as any)

      vi.mocked(prisma.application.update).mockResolvedValueOnce({
        id: "app-1",
        status: "Interview",
      } as any)

      const result = await (tools.updateApplicationStatus as any).execute({
        companyOrTitle: "Stripe",
        newStatus: "Interview",
        notes: "Recruiter screened successfully",
      })

      expect(result.success).toBe(true)
      expect(result.fromStatus).toBe("Applied")
      expect(result.toStatus).toBe("Interview")
      expect(prisma.statusChange.create).toHaveBeenCalled()
    })

    it("deleteApplication removes target application", async () => {
      vi.mocked(prisma.application.findFirst).mockResolvedValueOnce({
        id: "app-1",
        userId,
        companyName: "Uber",
        jobTitle: "iOS Engineer",
      } as any)

      vi.mocked(prisma.application.delete).mockResolvedValueOnce({ id: "app-1" } as any)

      const result = await (tools.deleteApplication as any).execute({
        companyOrTitle: "Uber",
      })

      expect(result.success).toBe(true)
      expect(result.deletedCompany).toBe("Uber")
      expect(prisma.application.delete).toHaveBeenCalledWith({ where: { id: "app-1" } })
    })

    it("batchImportApplications imports multiple applications in a single run", async () => {
      vi.mocked(prisma.application.create)
        .mockResolvedValueOnce({ id: "app-1", companyName: "Google", jobTitle: "SRE", status: "Saved" } as any)
        .mockResolvedValueOnce({ id: "app-2", companyName: "Apple", jobTitle: "Systems Engineer", status: "Applied" } as any)

      const result = await (tools.batchImportApplications as any).execute({
        applications: [
          { companyName: "Google", jobTitle: "SRE", status: "Saved" },
          { companyName: "Apple", jobTitle: "Systems Engineer", status: "Applied" },
        ],
      })

      expect(result.success).toBe(true)
      expect(result.importedCount).toBe(2)
      expect(result.applications[0].companyName).toBe("Google")
      expect(result.applications[1].companyName).toBe("Apple")
    })
  })

  describe("Company Intelligence & Outreach Dispatch Tools", () => {
    it("researchCompanyIntel stores company details and saves prep note", async () => {
      vi.mocked(prisma.company.upsert).mockResolvedValueOnce({
        id: "comp-1",
        userId,
        name: "Netflix",
        industry: "Streaming & Cloud",
        website: "https://netflix.com",
        notes: "Values freedom and responsibility",
        createdAt: new Date(),
        updatedAt: new Date(),
        logoUrl: null,
      })

      vi.mocked(prisma.prepNote.create).mockResolvedValueOnce({
        id: "note-1",
        title: "Intel: Netflix",
        category: "Company Research",
      } as any)

      const result = await (tools.researchCompanyIntel as any).execute({
        companyName: "Netflix",
        industry: "Streaming & Cloud",
        techStack: ["Java", "Spring Boot", "AWS", "Kafka"],
        interviewStyleNotes: "Values freedom and responsibility",
        websiteUrl: "https://netflix.com",
      })

      expect(result.success).toBe(true)
      expect(result.companyName).toBe("Netflix")
      expect(result.industry).toBe("Streaming & Cloud")
      expect(prisma.prepNote.create).toHaveBeenCalled()
    })

    it("sendOutreachEmailViaResend simulates safely without API key", async () => {
      delete process.env.RESEND_API_KEY

      const result = await (tools.sendOutreachEmailViaResend as any).execute({
        recipientEmail: "recruiter@stripe.com",
        candidateName: "Alex Doe",
        companyName: "Stripe",
        jobTitle: "Backend Engineer",
        subject: "Senior Backend Engineer Application - Alex Doe",
        bodyText: "I am writing to express my strong interest in the backend engineering opening.",
      })

      expect(result.success).toBe(true)
      expect(result.simulated).toBe(true)
      expect(result.recipient).toBe("recruiter@stripe.com")
    })

    it("scrapeJobLink blocks private IP addresses and localhost (SSRF prevention)", async () => {
      const resultLocal = await (tools.scrapeJobLink as any).execute({
        url: "http://localhost:3000/internal",
      })
      expect(resultLocal.success).toBe(false)
      expect(resultLocal.message).toContain("blocked")

      const resultMetadata = await (tools.scrapeJobLink as any).execute({
        url: "http://169.254.169.254/latest/meta-data",
      })
      expect(resultMetadata.success).toBe(false)
      expect(resultMetadata.message).toContain("blocked")

      const resultIpv6 = await (tools.scrapeJobLink as any).execute({
        url: "http://[::1]:8080/admin",
      })
      expect(resultIpv6.success).toBe(false)
      expect(resultIpv6.message).toContain("blocked")

      const resultClassB = await (tools.scrapeJobLink as any).execute({
        url: "http://172.20.10.5/secrets",
      })
      expect(resultClassB.success).toBe(false)
      expect(resultClassB.message).toContain("blocked")

      const resultDecimal = await (tools.scrapeJobLink as any).execute({
        url: "http://2130706433/",
      })
      expect(resultDecimal.success).toBe(false)
      expect(resultDecimal.message).toContain("blocked")
    })
  })

  describe("Interview Preparation & Evaluation Tools", () => {
    it("recordMockInterviewScore saves STAR rating and strengths/improvements", async () => {
      vi.mocked(prisma.prepNote.create).mockResolvedValueOnce({
        id: "note-eval-1",
        title: "Mock Evaluation: React Performance (8.5/10)",
        category: "Mock Evaluation",
      } as any)

      const result = await (tools.recordMockInterviewScore as any).execute({
        roleOrTopic: "React Performance",
        scoreOutOfTen: 8.5,
        strengths: ["Clear explanation of reconciliation", "Mentioned memoization tradeoffs"],
        improvements: ["Elaborate more on Concurrent Mode"],
      })

      expect(result.success).toBe(true)
      expect(result.score).toBe(8.5)
      expect(prisma.prepNote.create).toHaveBeenCalled()
    })

    it("savePrepNote saves notes linked to an application", async () => {
      vi.mocked(prisma.application.findFirst).mockResolvedValueOnce({
        id: "app-amazon",
        companyName: "Amazon",
      } as any)

      vi.mocked(prisma.prepNote.create).mockResolvedValueOnce({
        id: "note-prep-1",
        title: "Amazon Leadership Principles",
        category: "Behavioral",
      } as any)

      const result = await (tools.savePrepNote as any).execute({
        title: "Amazon Leadership Principles",
        category: "Behavioral",
        content: "Customer Obsession & Bias for Action examples",
        companyName: "Amazon",
      })

      expect(result.success).toBe(true)
      expect(result.title).toBe("Amazon Leadership Principles")
      expect(prisma.prepNote.create).toHaveBeenCalled()
    })
  })

  describe("Accountability & Semantic Memory Tools", () => {
    it("setWeeklyGoals upserts current week targets", async () => {
      vi.mocked(prisma.weeklyGoal.upsert).mockResolvedValueOnce({
        id: "goal-1",
        userId,
        weekStart: new Date(),
        goal1: "Apply to 10 tier-1 roles",
      } as any)

      const result = await (tools.setWeeklyGoals as any).execute({
        goal1: "Apply to 10 tier-1 roles",
        goal2: "Complete 2 system design mock interviews",
      })

      expect(result.success).toBe(true)
      expect(prisma.weeklyGoal.upsert).toHaveBeenCalled()
    })

    it("saveUserMemory saves and categorizes long-term user facts", async () => {
      vi.mocked(prisma.userMemory.findFirst).mockResolvedValueOnce(null)
      vi.mocked(prisma.userMemory.create).mockResolvedValueOnce({
        id: "mem-1",
        userId,
        category: "preference",
        content: "Prefers remote Golang and TypeScript roles",
      } as any)

      const result = await (tools.saveUserMemory as any).execute({
        category: "preference",
        content: "Prefers remote Golang and TypeScript roles",
      })

      expect(result.success).toBe(true)
      expect(result.content).toContain("Golang")
    })
  })
})
