/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const mockGetInternalUserId = vi.fn()
const mockCheckDistributedRateLimit = vi.fn()
const mockGetCachedJson = vi.fn()
const mockFindUniqueCanonical = vi.fn()
const mockFindFirstMatch = vi.fn()
const mockFindManyApplications = vi.fn()
const mockFindManyCanonical = vi.fn()
const mockFindManyMatches = vi.fn()
const mockFindUniqueProfile = vi.fn()

vi.mock("@/lib/auth", () => ({
  getInternalUserId: () => mockGetInternalUserId(),
}))

vi.mock("@/lib/rate-limit", () => ({
  checkDistributedRateLimit: (...args: any[]) => mockCheckDistributedRateLimit(...args),
  rateLimitResponse: () => new Response("Too Many Requests", { status: 429 }),
}))

vi.mock("@/lib/redis", () => ({
  getCachedJson: (...args: any[]) => mockGetCachedJson(...args),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userJobMatch: {
      findFirst: (...args: any[]) => mockFindFirstMatch(...args),
      findMany: (...args: any[]) => mockFindManyMatches(...args),
    },
    canonicalJob: {
      findUnique: (...args: any[]) => mockFindUniqueCanonical(...args),
      findMany: (...args: any[]) => mockFindManyCanonical(...args),
    },
    application: {
      findMany: (...args: any[]) => mockFindManyApplications(...args),
    },
    userProfile: {
      findUnique: (...args: any[]) => mockFindUniqueProfile(...args),
    },
  },
  withDbRetry: (fn: any) => fn(),
}))

describe("Opportunity Detail API Route (/api/discovery/[id])", () => {
  let GET: typeof import("@/app/api/discovery/[id]/route").GET

  beforeEach(async () => {
    vi.clearAllMocks()
    mockGetInternalUserId.mockResolvedValue("test-user-123")
    mockCheckDistributedRateLimit.mockResolvedValue({ success: true, remaining: 59 })
    mockFindManyApplications.mockResolvedValue([])
    mockFindManyCanonical.mockResolvedValue([])
    mockFindManyMatches.mockResolvedValue([])
    mockFindUniqueProfile.mockResolvedValue({
      targetRoles: ["Software Engineer", "Full Stack Developer"],
      skills: ["React", "Next.js", "TypeScript", "Node.js"],
      experienceLevel: "mid",
      location: "Remote",
    })

    const mod = await import("@/app/api/discovery/[id]/route")
    GET = mod.GET
  })

  it("authentically adopts score and breakdown from Redis discovery feed cache when match is not in DB", async () => {
    // Simulate unstaged, unsaved job that exists only in discovery feed
    mockFindFirstMatch.mockResolvedValue(null)
    mockFindUniqueCanonical.mockResolvedValue({
      id: "cmu6o9kou000cl704bj2rhz6h",
      title: "Full Stack Developer - Next.js",
      company: "nextjobz",
      location: "Uttara, Dhaka, Bangladesh",
      url: "https://bd.linkedin.com/jobs/view/4453454410",
      sourceBoard: "linkedin_post",
      tags: ["nextjs", "fullstack", "react"],
      salary: null,
      salaryMin: null,
      salaryMax: null,
      description: "Full Stack Developer role with Next.js in Uttara.",
      isRemote: false,
      visaSponsorship: "unknown",
      employmentType: "full-time",
      createdAt: new Date("2026-09-18T08:00:00Z"),
      postedAt: new Date("2026-09-18T08:00:00Z"),
    })

    // Cached feed with 66% score
    mockGetCachedJson.mockResolvedValue({
      opportunities: [
        {
          id: "cmu6o9kou000cl704bj2rhz6h",
          title: "Full Stack Developer - Next.js",
          company: "nextjobz",
          fitScore: 66,
          matchRationale: "Direct semantic vector match",
          scoreBreakdown: { skills: 25, role: 20, location: 15, seniority: 10 },
        },
      ],
    })

    const req = new NextRequest("http://localhost/api/discovery/cmu6o9kou000cl704bj2rhz6h")
    const res = await GET(req, { params: Promise.resolve({ id: "cmu6o9kou000cl704bj2rhz6h" }) })
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    const { opportunity } = json.data

    // Score MUST match the feed's 66% - NOT the hardcoded 85!
    expect(opportunity.fitScore).toBe(66)
    expect(opportunity.scores.overall).toBe(66)

    // Sub-scores must be derived from scoreBreakdown
    // skills: 25/40 = 63%
    expect(opportunity.scores.skillsMatch).toBe(63)
    // role: 20/25 = 80%
    expect(opportunity.scores.roleFit).toBe(80)
    // experience: 10/15 = 67%
    expect(opportunity.scores.experienceMatch).toBe(67)
    // location/company: 15/20 = 75%
    expect(opportunity.scores.companyFit).toBe(75)

    // Salary must not be hardcoded to $140,000 - $180,000
    expect(opportunity.salary).toBe("Competitive / Not disclosed")
    expect(opportunity.cleanSalary).toBe("Competitive")
  })

  it("uses UserJobMatch fitScore and breakdown when record exists in DB", async () => {
    mockFindFirstMatch.mockResolvedValue({
      id: "match-db-1",
      jobId: "canonical-job-1",
      userId: "test-user-123",
      fitScore: 92,
      matchRationale: "📊 Fit Breakdown: 92% (Skills: 38/40 • Role: 23/25 • Location: 20/20 • Seniority: 11/15)",
      isSaved: true,
      status: "SAVED",
      job: {
        id: "canonical-job-1",
        title: "Senior Next.js Architect",
        company: "Vercel",
        location: "Remote",
        isRemote: true,
        tags: ["Next.js", "React", "TypeScript"],
        salary: "$180,000 - $220,000",
        description: "Lead architect role",
        createdAt: new Date(),
        postedAt: new Date(),
      },
    })

    const req = new NextRequest("http://localhost/api/discovery/match-db-1")
    const res = await GET(req, { params: Promise.resolve({ id: "match-db-1" }) })
    expect(res.status).toBe(200)

    const json = await res.json()
    const { opportunity } = json.data
    expect(opportunity.fitScore).toBe(92)
    expect(opportunity.scores.overall).toBe(92)
    expect(opportunity.scores.skillsMatch).toBe(95) // 38/40
    expect(opportunity.scores.roleFit).toBe(92) // 23/25
    expect(opportunity.scores.experienceMatch).toBe(73) // 11/15
    expect(opportunity.scores.companyFit).toBe(100) // 20/20
    expect(opportunity.isSaved).toBe(true)
  })

  it("dynamically scores unindexed canonical jobs without falling back to 85", async () => {
    mockFindFirstMatch.mockResolvedValue(null)
    mockGetCachedJson.mockResolvedValue(null) // Cache miss
    mockFindUniqueCanonical.mockResolvedValue({
      id: "unrated-job-99",
      title: "Full Stack Developer",
      company: "Acme Corp",
      location: "Remote",
      isRemote: true,
      tags: ["React", "TypeScript"],
      description: "Building modern apps",
      createdAt: new Date(),
      postedAt: new Date(),
    })

    const req = new NextRequest("http://localhost/api/discovery/unrated-job-99")
    const res = await GET(req, { params: Promise.resolve({ id: "unrated-job-99" }) })
    expect(res.status).toBe(200)

    const json = await res.json()
    const { opportunity } = json.data
    expect(opportunity.fitScore).toBeGreaterThan(0)
    expect(opportunity.scores.overall).toBe(opportunity.fitScore)
    expect(opportunity.scores.skillsMatch).toBeGreaterThan(0)
  })

  it("returns 404 when opportunity does not exist", async () => {
    mockFindFirstMatch.mockResolvedValue(null)
    mockFindUniqueCanonical.mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/discovery/nonexistent")
    const res = await GET(req, { params: Promise.resolve({ id: "nonexistent" }) })
    expect(res.status).toBe(404)
  })
})
