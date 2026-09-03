/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  executeSearchExternalJobs,
  executeSaveJobOpportunityToTracker,
  normalizeCompany,
  normalizeTitle,
  deduplicateJobs,
  detectJobWorkMode,
  type UnifiedRawJob,
} from "@/lib/ai/graph/tools/discovery-tools"
import { prisma } from "@/lib/prisma"
import * as learningEngine from "@/lib/ai/learning-engine"
import * as scrapers from "@/lib/discovery/scrapers"

const TEST_FIXTURE_JOBS: UnifiedRawJob[] = [
  {
    id: "test-1",
    title: "Senior Full Stack Engineer (React / Go)",
    company: "Stripe",
    location: "Remote",
    url: "https://stripe.com/jobs",
    sourceBoard: "remoteok",
    tags: ["react", "go", "typescript", "postgresql", "fullstack", "developer"],
    salaryMin: 160000,
    salaryMax: 210000,
    description: "Building global financial infrastructure with React, Go, and PostgreSQL.",
  },
  {
    id: "test-2",
    title: "Full Stack Developer",
    company: "bKash",
    location: "Dhaka, Bangladesh",
    url: "https://bkash.com/careers",
    sourceBoard: "linkedin",
    tags: ["go", "react", "postgresql", "fullstack", "developer"],
    salaryMin: 40000,
    salaryMax: 65000,
    description: "Onsite fintech engineering in Dhaka with Go and React microservices.",
  },
  {
    id: "test-3",
    title: "Lead Frontend Engineer",
    company: "Brain Station 23",
    location: "Dhaka, Bangladesh / Hybrid",
    url: "https://brainstation-23.com",
    sourceBoard: "linkedin",
    tags: ["react", "nextjs", "typescript"],
    salaryMin: 35000,
    salaryMax: 60000,
    description: "Hybrid engineering in Dhaka.",
  },
  {
    id: "test-4",
    title: "Backend Engineer",
    company: "Berlin Tech",
    location: "Berlin, Germany",
    url: "https://berlin.tech",
    sourceBoard: "arbeitnow",
    tags: ["go", "kubernetes"],
    description: "Onsite Berlin role.",
  },
]

describe("Multi-Board Job Discovery Engine Tools", () => {
  const testUserId = "user-discovery-test-123"

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(scrapers, "fetchMultiBoardOpportunities").mockResolvedValue(TEST_FIXTURE_JOBS)
  })

  it("normalizes company names and job titles for deduplication", () => {
    expect(normalizeCompany("Stripe, Inc.")).toBe("stripe")
    expect(normalizeCompany("Vercel LLC")).toBe("vercel")
    expect(normalizeCompany("Airbnb Technologies GmbH")).toBe("airbnb")

    expect(normalizeTitle("Senior Backend Engineer (Remote)")).toBe("senior backend engineer")
    expect(normalizeTitle("Fullstack Developer [Hybrid]")).toBe("fullstack developer")
  })

  it("deduplicates identical job postings across multiple boards", () => {
    const rawJobs: UnifiedRawJob[] = [
      {
        id: "rok-1",
        title: "Senior Backend Engineer (Go)",
        company: "Stripe, Inc.",
        location: "Remote",
        url: "https://remoteok.com/l/123",
        sourceBoard: "remoteok",
        tags: ["go", "postgresql"],
        salaryMin: 170000,
        salaryMax: 220000,
        description: "High performance Go systems at Stripe.",
      },
      {
        id: "an-1",
        title: "Senior Backend Engineer",
        company: "Stripe",
        location: "Remote",
        url: "https://arbeitnow.com/view/stripe-go",
        sourceBoard: "arbeitnow",
        tags: ["go", "distributed-systems"],
        description: "Short description.",
      },
      {
        id: "rok-2",
        title: "Lead AI Engineer",
        company: "Anthropic",
        location: "San Francisco",
        url: "https://remoteok.com/l/456",
        sourceBoard: "remoteok",
        tags: ["python", "llm"],
        description: "Leading frontier model tooling.",
      },
    ]

    const deduped = deduplicateJobs(rawJobs)
    expect(deduped).toHaveLength(2)
    const stripeJob = deduped.find((j) => normalizeCompany(j.company) === "stripe")
    expect(stripeJob).toBeDefined()
    expect(stripeJob?.salaryMin).toBe(170000) // Retained richer metadata
  })

  it("fetches, scores, and ranks opportunities with macro-learning boosts", async () => {
    vi.spyOn((prisma as any).userProfile, "findUnique").mockResolvedValueOnce({
      userId: testUserId,
      strengths: "Go, React, TypeScript, PostgreSQL",
      targetRoles: ["Full Stack Engineer", "Backend Engineer"],
    })
    vi.spyOn((prisma as any).resume, "findFirst").mockResolvedValueOnce({
      userId: testUserId,
      isDefault: true,
      textContent: "Built Go and React systems at scale with PostgreSQL.",
    })

    vi.spyOn(learningEngine, "getUserMacroOutcomes").mockResolvedValueOnce({
      totalApplications: 6,
      statusCounts: { Interview: 2, Offer: 1, Rejected: 1, Saved: 0, Applied: 2 },
      interviewCount: 2,
      offerCount: 1,
      rejectedCount: 1,
      appliedCount: 2,
      conversionRate: 75,
      winningRoles: ["Staff Backend Engineer"],
      winningCompanies: ["Stripe"],
      winningSkills: ["go", "postgresql"],
      penalizedSkills: ["php"],
      averageTimeToInterviewDays: 8,
    })

    const result = await executeSearchExternalJobs(testUserId, {
      query: "Go",
      limit: 4,
    })

    expect(result.success).toBe(true)
    expect(result.opportunities.length).toBeGreaterThan(0)
    expect(result.opportunities[0].fitScore).toBeGreaterThanOrEqual(50)
    expect(result.opportunities[0].matchRationale).toBeDefined()
    expect(result.opportunities[0].sourceBoard).toBeDefined()
  })

  it("successfully finds jobs with tokenized queries like 'Full stack developer'", async () => {
    vi.spyOn((prisma as any).userProfile, "findUnique").mockResolvedValueOnce({
      userId: testUserId,
      strengths: "React, TypeScript, Node.js",
      targetRoles: ["Full Stack Developer"],
    })
    vi.spyOn((prisma as any).resume, "findFirst").mockResolvedValueOnce({
      userId: testUserId,
      isDefault: true,
      textContent: "Full stack web developer with Next.js and Go experience.",
    })

    const result = await executeSearchExternalJobs(testUserId, {
      query: "Full stack developer",
      limit: 6,
    })

    expect(result.success).toBe(true)
    expect(result.opportunities.length).toBeGreaterThan(0)
    const titles = result.opportunities.map((o) => o.title.toLowerCase())
    const hasFullStackMatch = titles.some((t) => t.includes("full stack") || t.includes("fullstack"))
    expect(hasFullStackMatch).toBe(true)
  })

  it("saves discovered job opportunity directly into the user tracker", async () => {
    const mockCreatedApp = {
      id: "app-discovered-1",
      userId: testUserId,
      companyName: "Stripe",
      jobTitle: "Senior Full Stack Engineer",
      jobUrl: "https://stripe.com/jobs",
      source: "Discovery Engine",
      status: "Saved",
      notes: "Location: Remote\nSalary: $160k - $210k\nDiscovered via CareerTrack Autonomous Multi-Board Job Discovery Engine",
    }

    vi.spyOn((prisma as any).application, "create").mockResolvedValueOnce(mockCreatedApp)

    const result = await executeSaveJobOpportunityToTracker(testUserId, {
      companyName: "Stripe",
      jobTitle: "Senior Full Stack Engineer",
      jobUrl: "https://stripe.com/jobs",
      location: "Remote",
      salary: "$160k - $210k",
      status: "Saved",
    })

    expect(result.success).toBe(true)
    expect(result.applicationId).toBe("app-discovered-1")
    expect(result.message).toContain("Stripe")
  })

  it("prioritizes local onsite jobs when user prefers onsite in specific location", async () => {
    vi.spyOn((prisma as any).userProfile, "findUnique").mockResolvedValueOnce({
      userId: testUserId,
      strengths: "React, Node.js, TypeScript",
      targetRoles: ["Full Stack Software Engineer"],
      workPreference: "onsite",
      location: "Dhaka, Bangladesh",
    })
    vi.spyOn((prisma as any).resume, "findFirst").mockResolvedValueOnce({
      userId: testUserId,
      isDefault: true,
      textContent: "React and Node.js full stack developer located in Dhaka.",
    })

    const result = await executeSearchExternalJobs(testUserId, {
      limit: 5,
    })

    expect(result.success).toBe(true)
    expect(result.opportunities.length).toBeGreaterThan(0)
    // Top job should be local Dhaka opportunity
    const topJob = result.opportunities[0]
    expect(topJob.location.toLowerCase()).toContain("dhaka")
    expect(topJob.fitScore).toBeGreaterThanOrEqual(70)
    expect(topJob.matchRationale.toLowerCase()).toContain("dhaka")
  })

  it("strictly eliminates onsite jobs when candidate specifies remote only", async () => {
    vi.spyOn((prisma as any).userProfile, "findUnique").mockResolvedValueOnce({
      userId: testUserId,
      strengths: "React, TypeScript",
      targetRoles: ["Frontend Engineer"],
      workPreference: "remote",
      location: "Dhaka, Bangladesh",
    })
    vi.spyOn((prisma as any).resume, "findFirst").mockResolvedValueOnce({
      userId: testUserId,
      isDefault: true,
      textContent: "React and frontend developer.",
    })

    const result = await executeSearchExternalJobs(testUserId, {
      limit: 10,
    })

    expect(result.success).toBe(true)
    expect(result.opportunities.length).toBeGreaterThan(0)
    // Every single job must be remote or hybrid-remote
    for (const job of result.opportunities) {
      const loc = job.location.toLowerCase()
      const isRemote = loc.includes("remote") || loc.includes("anywhere")
      expect(isRemote).toBe(true)
    }
  })

  it("shows Dhaka tech hub onsite jobs to candidates located anywhere in Bangladesh (e.g. Sylhet, Chittagong)", async () => {
    vi.spyOn((prisma as any).userProfile, "findUnique").mockResolvedValueOnce({
      userId: testUserId,
      strengths: "React, Node.js, Go",
      targetRoles: ["Full Stack Developer"],
      workPreference: "onsite",
      location: "Sylhet, Bangladesh",
    })
    vi.spyOn((prisma as any).resume, "findFirst").mockResolvedValueOnce({
      userId: testUserId,
      isDefault: true,
      textContent: "Senior full stack engineer experienced with React and Go.",
    })

    const result = await executeSearchExternalJobs(testUserId, {
      limit: 10,
    })

    expect(result.success).toBe(true)
    expect(result.opportunities.length).toBeGreaterThan(0)
    // Should include Dhaka Tech Hub opportunities (e.g. bKash)
    const dhakaJob = result.opportunities.find((j) => j.location.toLowerCase().includes("dhaka"))
    expect(dhakaJob).toBeDefined()
    expect(dhakaJob?.matchRationale).toContain("Dhaka Tech Hub")

    // Foreign onsite jobs (like London, Berlin) must still be strictly excluded
    for (const job of result.opportunities) {
      const isRemote = detectJobWorkMode({
        location: job.location,
        title: job.title,
        description: job.descriptionSnippet,
        sourceBoard: job.sourceBoard,
      }) === "remote"
      const isDhakaOrLocal = job.location.toLowerCase().includes("dhaka") || job.location.toLowerCase().includes("sylhet")
      expect(isRemote || isDhakaOrLocal).toBe(true)
    }
  })
})

