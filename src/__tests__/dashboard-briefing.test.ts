import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  generateDeterministicExecutiveSummary,
  generateExecutiveBriefing,
} from "@/lib/dashboard/briefing-engine"
import { GET } from "@/app/api/dashboard/briefing/route"

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  getInternalUserId: vi.fn(),
}))

vi.mock("@/lib/rate-limit", () => ({
  checkDistributedRateLimit: vi.fn(),
}))

vi.mock("@/lib/ai/config", () => ({
  getUserAIConfig: vi.fn().mockResolvedValue(null), // Default to deterministic mode
}))

vi.mock("@/lib/prisma", () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
    },
    application: {
      findMany: vi.fn(),
    },
    weeklyGoal: {
      findFirst: vi.fn(),
    },
  }
  return {
    prisma: mockPrisma,
    withDbRetry: vi.fn((fn: () => unknown) => fn()),
  }
})

describe("CAG-12: Daily Strategic Executive Briefing", () => {
  const mockUserId = "test-user-briefing-123"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Deterministic Executive Summary Generation", () => {
    it("generates interview-focused summary when interview is upcoming within 72 hours", () => {
      const summary = generateDeterministicExecutiveSummary({
        candidateName: "Alex Mercer",
        metrics: {
          stagedCount: 1,
          followUpsDueCount: 1,
          upcomingInterviewsCount: 1,
          activeApplicationsCount: 3,
        },
        upcomingInterviews: [
          {
            id: "app-int-1",
            companyName: "Stripe",
            jobTitle: "Senior Frontend Engineer",
            interviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            interviewRound: "Technical Screen",
            hoursUntil: 24,
          },
        ],
        stagedApplications: [
          {
            id: "app-staged-1",
            companyName: "Linear",
            jobTitle: "Fullstack Engineer",
            packagedAt: new Date().toISOString(),
          },
        ],
        followUpsDue: [
          {
            id: "app-applied-1",
            companyName: "Datadog",
            jobTitle: "Software Engineer",
            appliedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            businessDaysDormant: 5,
          },
        ],
      })

      expect(summary).toHaveLength(3)
      expect(summary[0]).toContain("Upcoming interview with Stripe (Technical Screen)")
      expect(summary[1]).toContain("1 pre-packaged application is staged")
      expect(summary[2]).toContain("1 application (including Datadog) is dormant past 5 business days")
    })

    it("generates discovery-focused summary when pipeline is completely empty", () => {
      const summary = generateDeterministicExecutiveSummary({
        candidateName: "New Candidate",
        metrics: {
          stagedCount: 0,
          followUpsDueCount: 0,
          upcomingInterviewsCount: 0,
          activeApplicationsCount: 0,
        },
        upcomingInterviews: [],
        stagedApplications: [],
        followUpsDue: [],
      })

      expect(summary).toHaveLength(3)
      expect(summary[0]).toContain("Your active pipeline is currently open")
      expect(summary[1]).toContain("Evaluate external job descriptions or run Discovery")
      expect(summary[2]).toContain("Pipeline hygiene is solid")
    })
  })

  describe("generateExecutiveBriefing Core Engine", () => {
    it("aggregates staged apps, upcoming interviews, follow-ups due, and weekly goals", async () => {
      const { prisma } = await import("@/lib/prisma")

      // Mock user
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        name: "Muzahid",
        profile: { targetRoles: ["Fullstack Engineer"] },
      } as any)

      const now = new Date()
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000) // Beyond 72h
      const sevenBusinessDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)

      // Mock applications
      vi.mocked(prisma.application.findMany).mockResolvedValue([
        // Staged app
        {
          id: "app-staged",
          companyName: "Vercel",
          jobTitle: "Next.js Core Developer",
          status: "Staged",
          createdAt: now,
          updatedAt: now,
          applicationDate: now,
          interviewDate: null,
          interviewRound: null,
          interviewMeetingUrl: null,
        },
        // Interview upcoming in 24h
        {
          id: "app-interview-soon",
          companyName: "Anthropic",
          jobTitle: "AI Systems Engineer",
          status: "Interview",
          createdAt: sevenBusinessDaysAgo,
          updatedAt: now,
          applicationDate: sevenBusinessDaysAgo,
          interviewDate: in24h,
          interviewRound: "System Design",
          interviewMeetingUrl: "https://meet.google.com/xyz-abc",
        },
        // Interview in 5 days (> 72h window, should NOT be in upcomingInterviews)
        {
          id: "app-interview-later",
          companyName: "OpenAI",
          jobTitle: "Research Engineer",
          status: "Interview",
          createdAt: now,
          updatedAt: now,
          applicationDate: now,
          interviewDate: in5Days,
          interviewRound: "Final Round",
          interviewMeetingUrl: null,
        },
        // Applied and dormant 7 business days ago -> follow-up due
        {
          id: "app-dormant",
          companyName: "Figma",
          jobTitle: "Frontend Architect",
          status: "Applied",
          createdAt: sevenBusinessDaysAgo,
          updatedAt: sevenBusinessDaysAgo,
          applicationDate: sevenBusinessDaysAgo,
          interviewDate: null,
          interviewRound: null,
          interviewMeetingUrl: null,
        },
      ] as any)

      // Mock weekly goals
      vi.mocked(prisma.weeklyGoal.findFirst).mockResolvedValue({
        id: "goal-1",
        userId: mockUserId,
        weekStart: now,
        goal1: "Submit 5 high-fit applications",
        goal1Target: 5,
        goal1Progress: 3,
        goal1Status: "In Progress",
        goal2: "Complete 2 mock interviews",
        goal2Target: 2,
        goal2Progress: 2,
        goal2Status: "Completed",
        goal3: null,
        goal3Target: null,
        goal3Progress: null,
        goal3Status: "NotStarted",
        createdAt: now,
        updatedAt: now,
      } as any)

      const briefing = await generateExecutiveBriefing(mockUserId)

      expect(briefing.candidateName).toBe("Muzahid")
      expect(briefing.metrics.stagedCount).toBe(1)
      expect(briefing.metrics.upcomingInterviewsCount).toBe(1)
      expect(briefing.upcomingInterviews[0].companyName).toBe("Anthropic")
      expect(briefing.upcomingInterviews[0].interviewRound).toBe("System Design")
      expect(briefing.metrics.followUpsDueCount).toBe(1)
      expect(briefing.followUpsDue[0].companyName).toBe("Figma")

      // Check weekly goal summary
      expect(briefing.weeklyGoalSummary).not.toBeNull()
      expect(briefing.weeklyGoalSummary?.totalTarget).toBe(7)
      expect(briefing.weeklyGoalSummary?.totalProgress).toBe(5)
      expect(briefing.weeklyGoalSummary?.completionPercentage).toBe(71)

      // Check priority actions: prep interview (urgent) and review staged (high)
      expect(briefing.priorityActions.length).toBeGreaterThanOrEqual(2)
      expect(briefing.priorityActions.some((a) => a.type === "PREP_INTERVIEW")).toBe(true)
      expect(briefing.priorityActions.some((a) => a.type === "REVIEW_STAGED")).toBe(true)
      expect(briefing.priorityActions.some((a) => a.type === "SEND_FOLLOWUP")).toBe(true)

      // Check 3 executive summary bullets
      expect(briefing.executiveSummary).toHaveLength(3)
    })
  })

  describe("GET /api/dashboard/briefing Endpoint", () => {
    it("returns 401 when user is not authenticated", async () => {
      const { getInternalUserId } = await import("@/lib/auth")
      vi.mocked(getInternalUserId).mockResolvedValueOnce(null)

      const res = await GET()
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe("Unauthorized")
    })

    it("returns 429 when rate limit is exceeded", async () => {
      const { getInternalUserId } = await import("@/lib/auth")
      const { checkDistributedRateLimit } = await import("@/lib/rate-limit")

      vi.mocked(getInternalUserId).mockResolvedValueOnce(mockUserId)
      vi.mocked(checkDistributedRateLimit).mockResolvedValueOnce({
        success: false,
        limit: 30,
        remaining: 0,
        resetInSeconds: 60,
      })

      const res = await GET()
      expect(res.status).toBe(429)
      const data = await res.json()
      expect(data.error).toContain("Too many requests")
    })

    it("returns 200 with briefing payload when authenticated and within limit", async () => {
      const { getInternalUserId } = await import("@/lib/auth")
      const { checkDistributedRateLimit } = await import("@/lib/rate-limit")
      const { prisma } = await import("@/lib/prisma")

      vi.mocked(getInternalUserId).mockResolvedValueOnce(mockUserId)
      vi.mocked(checkDistributedRateLimit).mockResolvedValueOnce({
        success: true,
        limit: 30,
        remaining: 29,
        resetInSeconds: 60,
      })

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: mockUserId,
        name: "Test Engineer",
        profile: null,
      } as any)

      vi.mocked(prisma.application.findMany).mockResolvedValueOnce([])
      vi.mocked(prisma.weeklyGoal.findFirst).mockResolvedValueOnce(null)

      const res = await GET()
      expect(res.status).toBe(200)
      expect(res.headers.get("Cache-Control")).toBe("no-store, max-age=0")

      const data = await res.json()
      expect(data.candidateName).toBe("Test Engineer")
      expect(data.metrics.stagedCount).toBe(0)
      expect(data.priorityActions[0].type).toBe("DISCOVER_JOBS")
      expect(data.executiveSummary).toHaveLength(3)
    })
  })
})
