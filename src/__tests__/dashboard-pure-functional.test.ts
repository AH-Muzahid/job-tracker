/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET as getDashboardStats } from "@/app/api/dashboard/stats/route"
import { generateExecutiveBriefing } from "@/lib/dashboard/briefing-engine"
import { prisma } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"

vi.mock("@/lib/auth", () => ({
  getInternalUserId: vi.fn(),
}))

vi.mock("@/lib/redis", () => ({
  getCachedJson: vi.fn().mockResolvedValue(null),
  setCachedJson: vi.fn().mockResolvedValue(undefined),
  invalidateCache: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/ai/config", () => ({
  getUserAIConfig: vi.fn().mockResolvedValue(null),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    application: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    userJobMatch: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    canonicalJob: {
      count: vi.fn(),
    },
    weeklyGoal: {
      findFirst: vi.fn(),
    },
    discoveryEvent: {
      findMany: vi.fn(),
    },
    interviewSession: {
      findMany: vi.fn(),
    },
    userProfile: {
      findUnique: vi.fn(),
    },
    resume: {
      count: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
  withDbRetry: vi.fn((fn: any) => fn()),
}))

describe("Purely Functional Dashboard Data & Metrics", () => {
  const mockUserId = "user-pure-functional-123"

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getInternalUserId).mockResolvedValue(mockUserId)

    vi.mocked(prisma.application.groupBy).mockResolvedValue([])
    vi.mocked(prisma.application.findMany).mockResolvedValue([])
    vi.mocked(prisma.application.count).mockResolvedValue(0)
    vi.mocked(prisma.userJobMatch.count).mockResolvedValue(0)
    vi.mocked(prisma.canonicalJob.count).mockResolvedValue(0)
    vi.mocked(prisma.userJobMatch.findMany).mockResolvedValue([])
    vi.mocked(prisma.$queryRaw).mockResolvedValue([])
    vi.mocked(prisma.discoveryEvent.findMany).mockResolvedValue([])
    vi.mocked(prisma.interviewSession.findMany).mockResolvedValue([])
    vi.mocked((prisma as any).userProfile.findUnique).mockResolvedValue(null)
    vi.mocked((prisma as any).resume.count).mockResolvedValue(0)
  })

  it("returns completely empty recommended opportunities (NO fake Google/Stripe/Notion) when user has 0 matches", async () => {
    vi.mocked(prisma.userJobMatch.findMany).mockResolvedValue([])
    vi.mocked(prisma.userJobMatch.count).mockResolvedValue(0)

    const res = await getDashboardStats()
    expect(res.status).toBe(200)

    const data = await res.json()
    // Must be empty array, not mock fallback items
    expect(data.recommendedOpportunities).toEqual([])
    // Must be exact zero count, not Math.min(canonicalCount, 28)
    expect(data.kpi.opportunities.count).toBe(0)
    expect(data.kpi.opportunities.newThisWeek).toBe(0)
  })

  it("computes authentic weeklyActivity streak based on real user activity timestamps", async () => {
    const now = new Date()
    const currentDayIdx = (now.getDay() + 6) % 7 // 0 = Mon, 6 = Sun

    // Construct Monday timestamp of this week
    const monday = new Date(now)
    monday.setDate(now.getDate() - currentDayIdx)
    monday.setHours(10, 0, 0, 0)

    // User had application updated on Monday
    const appOnMonday = {
      id: "app-mon",
      companyName: "Acme",
      jobTitle: "Developer",
      status: "Applied",
      updatedAt: monday,
      createdAt: monday,
      applicationDate: monday,
    }

    vi.mocked(prisma.application.findMany)
      .mockResolvedValueOnce([]) // 1. recent
      .mockResolvedValueOnce([]) // 2. followUpApps
      .mockResolvedValueOnce([]) // 3. upcomingInterviewsRaw
      .mockResolvedValueOnce([appOnMonday] as any) // 4. velocityApps (contains Monday app)
      .mockResolvedValueOnce([]) // 5. userExistingApps

    const res = await getDashboardStats()
    const data = await res.json()

    const activity = data.weeklyActivity
    expect(activity).toHaveLength(7)

    // Monday (day index 0) must be active because of appOnMonday
    expect(activity[0].day).toBe("Mon")
    expect(activity[0].active).toBe(true)

    // Today must be active because user accessed dashboard
    expect(activity[currentDayIdx].active).toBe(true)

    // A day with no activity (if today is not Wednesday and Monday is not Wednesday)
    if (currentDayIdx !== 2) {
      expect(activity[2].day).toBe("Wed")
      expect(activity[2].active).toBe(false)
    }
  })

  it("dynamically sets discover-opportunities title according to user's real target role in briefing-engine", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: mockUserId,
      name: "Tariq",
      profile: { targetRoles: ["Senior DevOps Engineer", "SRE"] },
    } as any)

    vi.mocked(prisma.application.findMany).mockResolvedValue([])
    vi.mocked(prisma.weeklyGoal.findFirst).mockResolvedValue(null)

    const briefing = await generateExecutiveBriefing(mockUserId)
    const discoverAction = briefing.priorityActions.find((a) => a.type === "DISCOVER_JOBS")

    expect(discoverAction).toBeDefined()
    expect(discoverAction?.title).toBe("Source 2 new Senior DevOps Engineer roles")
    expect(discoverAction?.title).not.toContain("senior frontend roles")
  })

  it("handles user without target roles gracefully in briefing priority actions", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: mockUserId,
      name: "Sarah",
      profile: null,
    } as any)

    vi.mocked(prisma.application.findMany).mockResolvedValue([])
    vi.mocked(prisma.weeklyGoal.findFirst).mockResolvedValue(null)

    const briefing = await generateExecutiveBriefing(mockUserId)
    const discoverAction = briefing.priorityActions.find((a) => a.type === "DISCOVER_JOBS")

    expect(discoverAction).toBeDefined()
    expect(discoverAction?.title).toBe("Source high-fit opportunities")
  })

  it("calculates profile completeness as 0% with master resume prompt for a brand new user", async () => {
    vi.mocked((prisma as any).userProfile.findUnique).mockResolvedValue(null)
    vi.mocked((prisma as any).resume.count).mockResolvedValue(0)

    const res = await getDashboardStats()
    const data = await res.json()

    expect(data.profileCompleteness).toEqual({
      score: 0,
      isComplete: false,
      nextStepText: "Upload your master resume",
      completedPillars: 0,
      totalPillars: 4,
      hasResume: false,
      hasRoles: false,
      hasSkills: false,
      hasPreferences: false,
    })
  })

  it("calculates profile completeness incrementally (50%) when resume and roles are provided", async () => {
    vi.mocked((prisma as any).resume.count).mockResolvedValue(1)
    vi.mocked((prisma as any).userProfile.findUnique).mockResolvedValue({
      targetRoles: ["Fullstack Developer"],
      strengths: "",
      location: "",
      workPreference: "",
    })

    const res = await getDashboardStats()
    const data = await res.json()

    expect(data.profileCompleteness.score).toBe(50)
    expect(data.profileCompleteness.isComplete).toBe(false)
    expect(data.profileCompleteness.hasResume).toBe(true)
    expect(data.profileCompleteness.hasRoles).toBe(true)
    expect(data.profileCompleteness.nextStepText).toBe("Add your core technical skills")
  })

  it("calculates profile completeness as 100% and isComplete: true when all 4 pillars are filled", async () => {
    vi.mocked((prisma as any).resume.count).mockResolvedValue(2)
    vi.mocked((prisma as any).userProfile.findUnique).mockResolvedValue({
      targetRoles: ["Staff Engineer"],
      strengths: "TypeScript, React, Go, PostgreSQL",
      location: "San Francisco, CA",
      workPreference: "remote",
    })

    const res = await getDashboardStats()
    const data = await res.json()

    expect(data.profileCompleteness.score).toBe(100)
    expect(data.profileCompleteness.isComplete).toBe(true)
    expect(data.profileCompleteness.completedPillars).toBe(4)
  })
})
