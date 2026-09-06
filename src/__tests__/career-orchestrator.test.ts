/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { createCareerOrchestratorGraph } from "@/lib/ai/graph/workflows/career-orchestrator"
import { prisma } from "@/lib/prisma"
import * as vectorRetrieval from "@/lib/discovery/vector-retrieval"
import * as aiReranker from "@/lib/discovery/ai-reranker"
import * as coverLetterAgent from "@/lib/discovery/cover-letter-agent"
import * as preferences from "@/lib/discovery/preferences"
import * as telemetry from "@/lib/discovery/telemetry"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: {
      findUnique: vi.fn(),
    },
    resume: {
      findFirst: vi.fn(),
    },
    application: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    applicationAnalysis: {
      upsert: vi.fn(),
    },
    userJobMatch: {
      upsert: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
  withDbRetry: vi.fn((cb: any) => cb()),
}))

vi.mock("@/lib/discovery/vector-retrieval", () => ({
  retrieveCandidateJobsTier1: vi.fn(),
}))

vi.mock("@/lib/discovery/ai-reranker", () => ({
  deepReRankCandidateJobs: vi.fn(),
}))

vi.mock("@/lib/discovery/cover-letter-agent", () => ({
  generateApplicationMaterialsAgent: vi.fn(),
}))

vi.mock("@/lib/discovery/preferences", () => ({
  invalidateUserImplicitPreferences: vi.fn(),
}))

vi.mock("@/lib/discovery/telemetry", () => ({
  logDiscoveryEvent: vi.fn(),
}))

describe("Career Orchestrator State Machine (REC-18)", () => {
  const testUserId = "user-orchestrator-101"

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.userProfile.findUnique).mockResolvedValue({
      id: "profile-1",
      userId: testUserId,
      targetRoles: ["Senior Fullstack Engineer"],
      strengths: "TypeScript, React, Node.js, PostgreSQL",
      experienceLevel: "senior",
      location: "Remote",
      workPreference: "remote",
      bestProjects: [
        {
          name: "TaskStream",
          stack: "Next.js, TypeScript, PostgreSQL",
          description: "Distributed task orchestrator",
        },
      ],
    } as any)

    vi.mocked(prisma.resume.findFirst).mockResolvedValue({
      id: "resume-1",
      userId: testUserId,
      textContent: "Skilled in TypeScript, React, Next.js, Node, PostgreSQL, Redis",
    } as any)
  })

  it("executes the full unified pipeline when high-fit opportunities are discovered (>=80% fit)", async () => {
    // 1. Mock Tier 1 vector retrieval candidates
    vi.mocked(vectorRetrieval.retrieveCandidateJobsTier1).mockResolvedValue([
      {
        id: "job-high-1",
        title: "Senior Fullstack Engineer",
        company: "Stripe",
        location: "Remote",
        isRemote: true,
        url: "https://stripe.com/jobs/123",
        salary: "$160k - $190k",
        salaryMin: 160000,
        salaryMax: 190000,
        tags: ["typescript", "react", "node"],
        description: "Build payment platforms and web experiences.",
        postedAt: new Date(),
        visaSponsorship: "available",
        cosineSimilarity: 0.91,
      },
      {
        id: "job-high-2",
        title: "Frontend Platform Engineer",
        company: "Vercel",
        location: "Remote",
        isRemote: true,
        url: "https://vercel.com/jobs/456",
        salary: "$150k - $180k",
        salaryMin: 150000,
        salaryMax: 180000,
        tags: ["react", "nextjs", "typescript"],
        description: "Architect Next.js compiler and developer tooling.",
        postedAt: new Date(),
        visaSponsorship: "available",
        cosineSimilarity: 0.88,
      },
    ])

    // 2. Mock Tier 2 re-ranker returning 85%+ fit scores
    vi.mocked(aiReranker.deepReRankCandidateJobs).mockResolvedValue([
      {
        id: "job-high-1",
        title: "Senior Fullstack Engineer",
        company: "Stripe",
        location: "Remote",
        isRemote: true,
        url: "https://stripe.com/jobs/123",
        salary: "$160k - $190k",
        salaryMin: 160000,
        salaryMax: 190000,
        tags: ["typescript", "react", "node"],
        description: "Build payment platforms and web experiences.",
        postedAt: new Date(),
        visaSponsorship: "available",
        cosineSimilarity: 0.91,
        fitScore: 94,
        matchRationale: "Exceptional alignment with Stripe engineering stack.",
        missingSkills: [],
        scoreBreakdown: { skills: 38, role: 24, location: 20, seniority: 12 },
      },
      {
        id: "job-high-2",
        title: "Frontend Platform Engineer",
        company: "Vercel",
        location: "Remote",
        isRemote: true,
        url: "https://vercel.com/jobs/456",
        salary: "$150k - $180k",
        salaryMin: 150000,
        salaryMax: 180000,
        tags: ["react", "nextjs", "typescript"],
        description: "Architect Next.js compiler and developer tooling.",
        postedAt: new Date(),
        visaSponsorship: "available",
        cosineSimilarity: 0.88,
        fitScore: 88,
        matchRationale: "Strong match for React and Next.js frontend skills.",
        missingSkills: [],
        scoreBreakdown: { skills: 36, role: 22, location: 20, seniority: 10 },
      },
    ])

    // 3. Mock Asset Generator Agent
    vi.mocked(coverLetterAgent.generateApplicationMaterialsAgent).mockResolvedValue({
      coverLetter: "Dear Hiring Team, I am eager to contribute...",
      highlights: ["Engineered distributed task orchestrator", "TypeScript / React expert"],
      outreachPitch: "Hi, I noticed the Senior Fullstack role...",
      atsKeywords: ["typescript", "react", "nextjs"],
    })

    // 4. Mock Prisma operations
    vi.mocked(prisma.application.findFirst).mockResolvedValue(null)
    ;(vi.mocked(prisma.application.create) as any).mockImplementation(
      async (args: any) => ({ id: `app-${args.data.companyName.toLowerCase()}`, ...args.data } as any)
    )
    vi.mocked(prisma.applicationAnalysis.upsert).mockResolvedValue({ id: "analysis-1" } as any)
    vi.mocked(prisma.userJobMatch.upsert).mockResolvedValue({ id: "match-1" } as any)
    vi.mocked(prisma.notification.create).mockResolvedValue({ id: "notif-1" } as any)

    const graph = createCareerOrchestratorGraph()
    const result = await graph.invoke({
      userId: testUserId,
      candidateGoal: { targetRole: "Senior Fullstack Engineer" },
    })

    // Assertions
    expect(result.discoveredJobs).toHaveLength(2)
    expect(result.approvedOpportunities).toHaveLength(2)
    expect(Object.keys(result.applicationPackages)).toHaveLength(2)

    // Verify package contents
    expect(result.applicationPackages["job-high-1"]?.coverLetter).toContain("Dear Hiring Team")
    expect(result.applicationPackages["job-high-1"]?.resumeBullets).toHaveLength(2)
    expect(result.applicationPackages["job-high-1"]?.outreachPitch).toContain("Hi, I noticed")

    // Verify persistence calls
    expect(prisma.application.create).toHaveBeenCalledTimes(2)
    expect(prisma.application.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: testUserId,
          companyName: "Stripe",
          status: "STAGED",
        }),
      })
    )

    // Verify notification was dispatched
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: testUserId,
          title: expect.stringContaining("Applications Staged"),
          type: "ORCHESTRATOR_BATCH",
        }),
      })
    )

    // Verify preferences invalidated & telemetry logged
    expect(preferences.invalidateUserImplicitPreferences).toHaveBeenCalledWith(testUserId)
    expect(telemetry.logDiscoveryEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: testUserId,
        eventType: "BATCH_PUBLISHED",
      })
    )

    // Verify audit log sequence
    const actions = result.executionAuditLog.map((log: any) => log.action)
    expect(actions).toContain("TIER_1_AND_2_DISCOVERY")
    expect(actions).toContain("EVALUATE_AND_GATE")
    expect(actions).toContain("GENERATE_APPLICATION_PACKAGES")
    expect(actions).toContain("PERSIST_APPLICATIONS_AND_NOTIFY")
    expect(actions).toContain("UPDATE_PREFERENCES_AND_TELEMETRY")
  })

  it("early-exits cleanly when no opportunities meet the >=80% fit threshold", async () => {
    vi.mocked(vectorRetrieval.retrieveCandidateJobsTier1).mockResolvedValue([
      {
        id: "job-low-1",
        title: "Junior Support Assistant",
        company: "Generic Co",
        location: "Remote",
        isRemote: true,
        url: "https://generic.com/jobs/1",
        salary: null,
        salaryMin: null,
        salaryMax: null,
        tags: ["helpdesk"],
        description: "Customer service and tickets.",
        postedAt: new Date(),
        visaSponsorship: "unknown",
        cosineSimilarity: 0.55,
      },
    ])

    // Re-ranker gives 65% (below 80% threshold)
    vi.mocked(aiReranker.deepReRankCandidateJobs).mockResolvedValue([
      {
        id: "job-low-1",
        title: "Junior Support Assistant",
        company: "Generic Co",
        location: "Remote",
        isRemote: true,
        url: "https://generic.com/jobs/1",
        salary: null,
        salaryMin: null,
        salaryMax: null,
        tags: ["helpdesk"],
        description: "Customer service and tickets.",
        postedAt: new Date(),
        visaSponsorship: "unknown",
        cosineSimilarity: 0.55,
        fitScore: 65,
        matchRationale: "Poor alignment with software engineering goals.",
        missingSkills: ["typescript", "react"],
        scoreBreakdown: { skills: 20, role: 15, location: 20, seniority: 10 },
      },
    ])

    const graph = createCareerOrchestratorGraph()
    const result = await graph.invoke({
      userId: testUserId,
      candidateGoal: { targetRole: "Senior Fullstack Engineer" },
    })

    // Approved list must be empty
    expect(result.discoveredJobs).toHaveLength(1)
    expect(result.approvedOpportunities).toHaveLength(0)
    expect(Object.keys(result.applicationPackages)).toHaveLength(0)

    // Downstream nodes should NEVER have been called
    expect(coverLetterAgent.generateApplicationMaterialsAgent).not.toHaveBeenCalled()
    expect(prisma.application.create).not.toHaveBeenCalled()
    expect(prisma.notification.create).not.toHaveBeenCalled()
    expect(preferences.invalidateUserImplicitPreferences).not.toHaveBeenCalled()

    // Audit log should record the early exit
    const actions = result.executionAuditLog.map((log: any) => log.action)
    expect(actions).toContain("TIER_1_AND_2_DISCOVERY")
    expect(actions).toContain("EVALUATE_AND_GATE")
    expect(actions).toContain("NO_OPPORTUNITIES_QUALIFIED")
  })

  it("disqualifies high-fit jobs with suspicious financial demands (scamScore >= 0.3)", async () => {
    vi.mocked(vectorRetrieval.retrieveCandidateJobsTier1).mockResolvedValue([
      {
        id: "job-scam-1",
        title: "High Pay React Developer",
        company: "CryptoHustle",
        location: "Remote",
        isRemote: true,
        url: "https://cryptohustle.example.com/apply/1",
        salary: "$250k",
        salaryMin: 250000,
        salaryMax: 250000,
        tags: ["react"],
        description: "Must pay training fee and send bitcoin for equipment setup.",
        postedAt: new Date(),
        visaSponsorship: "unknown",
        cosineSimilarity: 0.90,
      },
    ])

    // Fit score is 89%, but description demands upfront fee
    vi.mocked(aiReranker.deepReRankCandidateJobs).mockResolvedValue([
      {
        id: "job-scam-1",
        title: "High Pay React Developer",
        company: "CryptoHustle",
        location: "Remote",
        isRemote: true,
        url: "https://cryptohustle.example.com/apply/1",
        salary: "$250k",
        salaryMin: 250000,
        salaryMax: 250000,
        tags: ["react"],
        description: "Must pay training fee and send bitcoin for equipment setup.",
        postedAt: new Date(),
        visaSponsorship: "unknown",
        cosineSimilarity: 0.90,
        fitScore: 89,
        matchRationale: "High keyword overlap.",
        missingSkills: [],
        scoreBreakdown: { skills: 40, role: 24, location: 20, seniority: 5 },
      },
    ])

    const graph = createCareerOrchestratorGraph()
    const result = await graph.invoke({
      userId: testUserId,
      candidateGoal: { targetRole: "React Developer" },
    })

    // Disqualified by scam gate
    expect(result.approvedOpportunities).toHaveLength(0)
    expect(coverLetterAgent.generateApplicationMaterialsAgent).not.toHaveBeenCalled()
    expect(prisma.application.create).not.toHaveBeenCalled()
  })

  it("handles partial asset generation failures gracefully with Promise.allSettled", async () => {
    vi.mocked(vectorRetrieval.retrieveCandidateJobsTier1).mockResolvedValue([
      {
        id: "job-1",
        title: "Frontend Engineer",
        company: "Stripe",
        location: "Remote",
        isRemote: true,
        url: "https://stripe.com/jobs/1",
        salary: null,
        salaryMin: null,
        salaryMax: null,
        tags: ["react"],
        description: "Frontend role.",
        postedAt: new Date(),
        visaSponsorship: "available",
        cosineSimilarity: 0.90,
      },
      {
        id: "job-2",
        title: "Frontend Engineer",
        company: "Vercel",
        location: "Remote",
        isRemote: true,
        url: "https://vercel.com/jobs/2",
        salary: null,
        salaryMin: null,
        salaryMax: null,
        tags: ["react"],
        description: "Frontend role.",
        postedAt: new Date(),
        visaSponsorship: "available",
        cosineSimilarity: 0.90,
      },
    ])

    vi.mocked(aiReranker.deepReRankCandidateJobs).mockResolvedValue([
      {
        id: "job-1",
        title: "Frontend Engineer",
        company: "Stripe",
        location: "Remote",
        isRemote: true,
        url: "https://stripe.com/jobs/1",
        salary: null,
        salaryMin: null,
        salaryMax: null,
        tags: ["react"],
        description: "Frontend role.",
        postedAt: new Date(),
        visaSponsorship: "available",
        cosineSimilarity: 0.90,
        fitScore: 90,
        matchRationale: "Solid match.",
        missingSkills: [],
        scoreBreakdown: { skills: 40, role: 20, location: 20, seniority: 10 },
      },
      {
        id: "job-2",
        title: "Frontend Engineer",
        company: "Vercel",
        location: "Remote",
        isRemote: true,
        url: "https://vercel.com/jobs/2",
        salary: null,
        salaryMin: null,
        salaryMax: null,
        tags: ["react"],
        description: "Frontend role.",
        postedAt: new Date(),
        visaSponsorship: "available",
        cosineSimilarity: 0.90,
        fitScore: 85,
        matchRationale: "Solid match.",
        missingSkills: [],
        scoreBreakdown: { skills: 35, role: 20, location: 20, seniority: 10 },
      },
    ])

    // Mock job-1 success, job-2 failure
    vi.mocked(coverLetterAgent.generateApplicationMaterialsAgent)
      .mockResolvedValueOnce({
        coverLetter: "Stripe cover letter",
        highlights: ["Stripe bullet"],
        outreachPitch: "Stripe pitch",
        atsKeywords: ["react"],
      })
      .mockRejectedValueOnce(new Error("LLM Rate Limit"))

    vi.mocked(prisma.application.findFirst).mockResolvedValue(null)
    ;(vi.mocked(prisma.application.create) as any).mockImplementation(
      async (args: any) => ({ id: `app-${args.data.companyName.toLowerCase()}`, ...args.data } as any)
    )
    vi.mocked(prisma.applicationAnalysis.upsert).mockResolvedValue({ id: "analysis-1" } as any)
    vi.mocked(prisma.userJobMatch.upsert).mockResolvedValue({ id: "match-1" } as any)
    vi.mocked(prisma.notification.create).mockResolvedValue({ id: "notif-1" } as any)

    const graph = createCareerOrchestratorGraph()
    const result = await graph.invoke({
      userId: testUserId,
      candidateGoal: { targetRole: "Frontend Engineer" },
    })

    // Both opportunities approved
    expect(result.approvedOpportunities).toHaveLength(2)
    // Only 1 successful package generated
    expect(Object.keys(result.applicationPackages)).toHaveLength(1)
    expect(result.applicationPackages["job-1"]?.coverLetter).toBe("Stripe cover letter")
    expect(result.applicationPackages["job-2"]).toBeUndefined()

    // Both applications still persisted
    expect(prisma.application.create).toHaveBeenCalledTimes(2)
  })
})
