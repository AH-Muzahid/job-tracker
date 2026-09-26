/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET as getDashboardStats } from "@/app/api/dashboard/stats/route"
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

vi.mock("@/lib/prisma", () => ({
  prisma: {
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
    $queryRaw: vi.fn(),
  },
  withDbRetry: vi.fn((fn: any) => fn()),
}))

describe("Dashboard Recommended Opportunities Batch & Deduplication", () => {
  const mockUserId = "user-rec-test-123"

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getInternalUserId).mockResolvedValue(mockUserId)

    // Base mock setups
    vi.mocked(prisma.application.groupBy).mockResolvedValue([])
    vi.mocked(prisma.application.findMany).mockResolvedValue([])
    vi.mocked(prisma.application.count).mockResolvedValue(0)
    vi.mocked(prisma.userJobMatch.count).mockResolvedValue(0)
    vi.mocked(prisma.canonicalJob.count).mockResolvedValue(10)
    vi.mocked(prisma.$queryRaw).mockResolvedValue([])
  })

  it("filters out already STAGED or APPLIED jobs, excludes jobs >30 days old, and deduplicates identical company:title", async () => {
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)

    // User already has an application for "over99" with status "Staged"
    const mockUserApps = [
      {
        id: "app-staged-1",
        companyName: "over99",
        jobTitle: "Frontend Engineer",
        status: "Staged",
      },
    ]

    // Candidate matches from DB
    const mockUserMatches = [
      // 1. over99 (already staged in tracker -> should be filtered out!)
      {
        id: "m-1",
        jobId: "j-1",
        fitScore: 95,
        status: "PUBLISHED",
        isSaved: true,
        createdAt: fiveDaysAgo,
        publishedAt: fiveDaysAgo,
        job: {
          id: "j-1",
          title: "Frontend Engineer",
          company: "over99",
          location: "Remote",
          isRemote: true,
          url: "https://remoteok.com/over99-1",
          salary: "$120k",
          tags: ["react"],
          postedAt: fiveDaysAgo,
        },
      },
      // 2. over99 duplicate from 40 days ago (> 30 days old -> should be filtered out!)
      {
        id: "m-2",
        jobId: "j-2",
        fitScore: 90,
        status: "PUBLISHED",
        isSaved: true,
        createdAt: fortyDaysAgo,
        publishedAt: fortyDaysAgo,
        job: {
          id: "j-2",
          title: "Frontend Engineer",
          company: "over99",
          location: "Remote",
          isRemote: true,
          url: "https://remoteok.com/over99-2",
          salary: "$120k",
          tags: ["react"],
          postedAt: fortyDaysAgo,
        },
      },
      // 3. Sticker Mule (Fresh, unacted -> should be picked #1!)
      {
        id: "m-3",
        jobId: "j-3",
        fitScore: 89,
        status: "PUBLISHED",
        isSaved: false,
        createdAt: fiveDaysAgo,
        publishedAt: fiveDaysAgo,
        job: {
          id: "j-3",
          title: "AI Agent Engineer",
          company: "Sticker Mule",
          location: "Remote",
          isRemote: true,
          url: "https://remoteok.com/stickermule-1",
          salary: "$130k",
          tags: ["ai", "python"],
          postedAt: fiveDaysAgo,
        },
      },
      // 4. Duplicate Sticker Mule with slightly different title casing -> should be deduplicated!
      {
        id: "m-4",
        jobId: "j-4",
        fitScore: 88,
        status: "PUBLISHED",
        isSaved: false,
        createdAt: fiveDaysAgo,
        publishedAt: fiveDaysAgo,
        job: {
          id: "j-4",
          title: "AI agent engineer",
          company: "Sticker Mule",
          location: "Remote",
          isRemote: true,
          url: "https://remoteok.com/stickermule-2",
          salary: "$130k",
          tags: ["ai"],
          postedAt: fiveDaysAgo,
        },
      },
      // 5. defdone (Fresh, unacted -> should be picked #2!)
      {
        id: "m-5",
        jobId: "j-5",
        fitScore: 88,
        status: "PUBLISHED",
        isSaved: false,
        createdAt: fiveDaysAgo,
        publishedAt: fiveDaysAgo,
        job: {
          id: "j-5",
          title: "Frontend Developer",
          company: "defdone",
          location: "Remote",
          isRemote: true,
          url: "https://defdone.com/jobs",
          salary: "$110k",
          tags: ["react"],
          postedAt: fiveDaysAgo,
        },
      },
      // 6. Supabase (Fresh, unacted -> should be picked #3!)
      {
        id: "m-6",
        jobId: "j-6",
        fitScore: 77,
        status: "PUBLISHED",
        isSaved: false,
        createdAt: fiveDaysAgo,
        publishedAt: fiveDaysAgo,
        job: {
          id: "j-6",
          title: "Edge Functions Engineer",
          company: "Supabase",
          location: "Remote",
          isRemote: true,
          url: "https://supabase.com/jobs",
          salary: "$140k",
          tags: ["typescript", "deno"],
          postedAt: fiveDaysAgo,
        },
      },
    ]

    vi.mocked(prisma.userJobMatch.findMany).mockResolvedValue(mockUserMatches as any)
    vi.mocked(prisma.application.findMany)
      .mockResolvedValueOnce([]) // 1. recent
      .mockResolvedValueOnce([]) // 2. followUpApps
      .mockResolvedValueOnce([]) // 3. upcomingInterviewsRaw
      .mockResolvedValueOnce([]) // 4. velocityApps
      .mockResolvedValueOnce(mockUserApps as any) // 5. userExistingApps

    const res = await getDashboardStats()
    expect(res.status).toBe(200)

    const data = await res.json()
    const recs = data.recommendedOpportunities

    // Must return exactly 3 opportunities
    expect(recs).toHaveLength(3)

    // 1. over99 must NOT be in recommendations (already staged)
    expect(recs.find((r: any) => r.company.toLowerCase() === "over99")).toBeUndefined()

    // 2. Sticker Mule is slot 1
    expect(recs[0].company).toBe("Sticker Mule")
    expect(recs[0].title).toBe("AI Agent Engineer")
    expect(recs[0].fitScore).toBe(89)

    // 3. defdone is slot 2 (duplicate Sticker Mule was skipped!)
    expect(recs[1].company).toBe("defdone")
    expect(recs[1].title).toBe("Frontend Developer")
    expect(recs[1].fitScore).toBe(88)

    // 4. Supabase is slot 3
    expect(recs[2].company).toBe("Supabase")
    expect(recs[2].title).toBe("Edge Functions Engineer")
    expect(recs[2].fitScore).toBe(77)
  })
})
