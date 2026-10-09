/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { executeSearchExternalJobs } from "@/lib/discovery/scoring"
import { prisma } from "@/lib/prisma"
import * as learningEngine from "@/lib/ai/learning-engine"
import * as preferences from "@/lib/discovery/preferences"

describe("Discovery Scoring Calibration & Actionability Tiering", () => {
  const testUserId = "user-calibration-test-456"

  const mockJobs = [
    {
      id: "job-fresh-unapplied",
      title: "Full Stack Developer",
      company: "Modern Cloud Corp",
      location: "Remote",
      isRemote: true,
      url: "https://moderncloud.com/job/1",
      sourceBoard: "remoteok",
      tags: ["react", "nodejs", "typescript", "fullstack"],
      salaryMin: 90000,
      salaryMax: 120000,
      description: "Full stack engineering with React, Node.js, and TypeScript.",
      postedAt: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12h ago (fresh)
      visaSponsorship: "available",
      isExpired: false,
      scamScore: 0.1,
    },
    {
      id: "job-heavy-requirements",
      title: "Senior Full Stack Architect",
      company: "Legacy Enterprise",
      location: "Remote",
      isRemote: true,
      url: "https://enterprise.com/job/2",
      sourceBoard: "jobicy",
      tags: ["react", "nodejs", "kubernetes", "kafka", "aws", "golang", "terraform", "cassandra"],
      salaryMin: 140000,
      salaryMax: 180000,
      description: "Requires Kubernetes, Kafka, AWS, Golang, Terraform, Cassandra along with React and Node.",
      postedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20), // 20 days ago (stale)
      visaSponsorship: "unknown",
      isExpired: false,
      scamScore: 0.1,
    },
    {
      id: "job-onsite-dhaka",
      title: "Full Stack Developer",
      company: "Local Dhaka Tech",
      location: "Dhaka, Bangladesh",
      isRemote: false,
      url: "https://localdhaka.com/job/3",
      sourceBoard: "bdjobs",
      tags: ["react", "nodejs", "typescript"],
      salaryMin: 80000,
      salaryMax: 100000,
      description: "Onsite developer role in Dhaka office.",
      postedAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
      visaSponsorship: "unknown",
      isExpired: false,
      scamScore: 0.1,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn((prisma as any).canonicalJob, "findMany").mockResolvedValue(mockJobs)
    vi.spyOn((prisma as any).userProfile, "findUnique").mockResolvedValue({
      userId: testUserId,
      strengths: "React, Node.js, TypeScript",
      targetRoles: ["Full Stack Developer"],
      workPreference: "remote",
      location: "Remote",
      experienceLevel: "mid",
    })
    vi.spyOn((prisma as any).resume, "findFirst").mockResolvedValue({
      userId: testUserId,
      isDefault: true,
      textContent: "Full stack engineer experienced in React, TypeScript, and Node.js.",
    })
    vi.spyOn(learningEngine, "getUserMacroOutcomes").mockResolvedValue({
      totalApplications: 0,
      statusCounts: { Saved: 0, Applied: 0, Interview: 0, Offer: 0, Rejected: 0 },
      interviewCount: 0,
      offerCount: 0,
      rejectedCount: 0,
      appliedCount: 0,
      conversionRate: 0,
      winningRoles: [],
      winningCompanies: [],
      winningSkills: [],
      penalizedSkills: [],
      averageTimeToInterviewDays: null,
    })
    vi.spyOn(preferences, "getUserImplicitPreferences").mockResolvedValue({
      userId: testUserId,
      updatedAt: new Date().toISOString(),
      favoredSkills: {},
      favoredRoles: {},
      favoredCompanies: {},
      favoredWorkModes: {},
      dislikedRoles: {},
      dislikedSkills: {},
      dislikedCompanies: {},
      dislikedLocations: {},
      averseToOnsite: false,
      totalSaved: 0,
      totalDismissed: 0,
      totalApplied: 0,
      dismissReasons: {},
    })
  })

  it("calibrates scores realistically instead of inflating every job to 99%", async () => {
    const result = await executeSearchExternalJobs(testUserId, { limit: 10 })
    expect(result.success).toBe(true)
    expect(result.opportunities.length).toBeGreaterThan(0)

    const freshJob = result.opportunities.find((o) => o.id === "job-fresh-unapplied")
    expect(freshJob).toBeDefined()
    // Fresh job matching 100% of requirements should have a strong, realistic score (82-98%), not capped arbitrarily at 99%
    expect(freshJob!.fitScore).toBeGreaterThanOrEqual(80)
    expect(freshJob!.fitScore).toBeLessThanOrEqual(98)

    const heavyReqJob = result.opportunities.find((o) => o.id === "job-heavy-requirements")
    expect(heavyReqJob).toBeDefined()
    // Job missing 6 out of 8 required technologies (Kubernetes, Kafka, AWS, Go, etc.) must be penalized
    // and should NOT receive a 90%+ score
    expect(heavyReqJob!.fitScore).toBeLessThan(freshJob!.fitScore)
    expect(heavyReqJob!.fitScore).toBeLessThan(75)
  })

  it("awards a meaningful freshness advantage to recently posted jobs over stale postings", async () => {
    const result = await executeSearchExternalJobs(testUserId, { limit: 10 })
    const freshJob = result.opportunities.find((o) => o.id === "job-fresh-unapplied")
    const staleJob = result.opportunities.find((o) => o.id === "job-heavy-requirements")

    expect(freshJob!.freshnessLabel).toBe("Just posted (<24h)")
    expect(freshJob!.matchRationale).toContain("Freshness: Just posted (<24h)")
    // Fresh job must easily outrank stale job
    expect(freshJob!.fitScore).toBeGreaterThan(staleJob!.fitScore)
  })

  it("produces a transparent breakdown with the 35pt skill scale in matchRationale", async () => {
    const result = await executeSearchExternalJobs(testUserId, { limit: 10 })
    const freshJob = result.opportunities.find((o) => o.id === "job-fresh-unapplied")
    expect(freshJob!.matchRationale).toContain("Skills:")
    expect(freshJob!.matchRationale).toContain("/35")
    expect(freshJob!.matchRationale).toContain("Role:")
    expect(freshJob!.matchRationale).toContain("/25")
    expect(freshJob!.matchRationale).toContain("Location:")
    expect(freshJob!.matchRationale).toContain("/20")
    expect(freshJob!.matchRationale).toContain("Seniority:")
    expect(freshJob!.matchRationale).toContain("/15")
  })

  it("strictly disqualifies onsite jobs when candidate has workPreference='remote'", async () => {
    const result = await executeSearchExternalJobs(testUserId, { limit: 10 })
    expect(result.success).toBe(true)
    const onsiteJob = result.opportunities.find((o) => o.id === "job-onsite-dhaka")
    // Gate 1A must completely eliminate the onsite job from candidate's discovery feed
    expect(onsiteJob).toBeUndefined()
  })

  it("scores local onsite jobs accurately when candidate prefers onsite in Dhaka", async () => {
    // Override profile for onsite candidate in Dhaka
    vi.spyOn((prisma as any).userProfile, "findUnique").mockResolvedValue({
      userId: testUserId,
      strengths: "React, Node.js, TypeScript",
      targetRoles: ["Full Stack Developer"],
      workPreference: "onsite",
      location: "Dhaka, Bangladesh",
      experienceLevel: "mid",
    })

    const result = await executeSearchExternalJobs(testUserId, { limit: 10 })
    expect(result.success).toBe(true)
    const onsiteJob = result.opportunities.find((o) => o.id === "job-onsite-dhaka")
    expect(onsiteJob).toBeDefined()
    // Local Dhaka job must receive 20/20 location points
    expect(onsiteJob!.matchRationale).toContain("Location: 20/20")
  })
})

