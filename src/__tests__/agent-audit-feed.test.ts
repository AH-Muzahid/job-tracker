/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { GET, POST } from "@/app/api/jobs/discover/orchestrator/route"
import { prisma } from "@/lib/prisma"
import * as auth from "@/lib/auth"
import * as rateLimit from "@/lib/rate-limit"
import * as orchestratorWorkflow from "@/lib/ai/graph/workflows/career-orchestrator"

vi.mock("@/lib/auth", () => ({
  getInternalUserId: vi.fn(),
}))

vi.mock("@/lib/rate-limit", () => ({
  checkDistributedRateLimit: vi.fn(),
  rateLimitResponse: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    discoveryEvent: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    userProfile: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock("@/lib/ai/graph/workflows/career-orchestrator", () => ({
  createCareerOrchestratorGraph: vi.fn(),
}))

describe("Career Orchestrator Activity & Audit Feed API Suite", () => {
  const testUserId = "user-audit-123"

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth.getInternalUserId).mockResolvedValue(testUserId)
    vi.mocked(rateLimit.checkDistributedRateLimit).mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      reset: 60,
    } as any)
  })

  it("returns 401 Unauthorized when userId is absent", async () => {
    vi.mocked(auth.getInternalUserId).mockResolvedValueOnce(null)
    const req = new NextRequest("http://localhost:3000/api/jobs/discover/orchestrator")
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it("returns idle status and empty logs when no orchestrator runs have occurred", async () => {
    vi.mocked(prisma.discoveryEvent.findFirst).mockResolvedValueOnce(null)

    const req = new NextRequest("http://localhost:3000/api/jobs/discover/orchestrator")
    const res = await GET(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.status).toBe("idle")
    expect(json.data.lastRunAt).toBeNull()
    expect(json.data.jobsEvaluated).toBe(0)
    expect(json.data.logs).toEqual([])
  })

  it("returns formatted OrchestratorExecutionSummary when an event exists", async () => {
    const mockRunEvent = {
      id: "event-orch-1",
      userId: testUserId,
      eventType: "CAREER_ORCHESTRATOR_RUN",
      createdAt: new Date("2026-09-07T01:00:00Z"),
      metadata: {
        source: "career_orchestrator",
        status: "completed",
        jobsEvaluated: 25,
        jobsStaged: 3,
        assetsCreated: 3,
        durationMs: 840,
        logs: [
          {
            id: "log-1",
            agent: "discovery",
            action: "TIER_1_AND_2_DISCOVERY",
            timestamp: "2026-09-07T01:00:00Z",
            rationale: "Retrieved 50 dense candidates and re-ranked 25.",
            metadata: { totalEvaluated: 25 },
          },
          {
            id: "log-2",
            agent: "evaluation",
            action: "EVALUATE_AND_GATE",
            timestamp: "2026-09-07T01:00:01Z",
            rationale: "Evaluated 25 opportunities: 3 approved.",
            metadata: { totalEvaluated: 25, approvedCount: 3, averageFitScore: 88 },
          },
          {
            id: "log-3",
            agent: "asset_generator",
            action: "GENERATE_APPLICATION_PACKAGES",
            timestamp: "2026-09-07T01:00:02Z",
            rationale: "Generated 3 application packages.",
            metadata: { assetsGenerated: 3 },
          },
        ],
      },
    }

    vi.mocked(prisma.discoveryEvent.findFirst).mockResolvedValueOnce(mockRunEvent as any)

    const req = new NextRequest("http://localhost:3000/api/jobs/discover/orchestrator")
    const res = await GET(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.status).toBe("completed")
    expect(json.data.jobsEvaluated).toBe(25)
    expect(json.data.jobsStaged).toBe(3)
    expect(json.data.assetsCreated).toBe(3)
    expect(json.data.durationMs).toBe(840)
    expect(json.data.logs).toHaveLength(3)
    expect(json.data.logs[0].agent).toBe("discovery")
    expect(json.data.logs[1].agent).toBe("evaluation")
    expect(json.data.logs[2].agent).toBe("asset_generator")
    expect(json.data.logs[1].metadata.averageFitScore).toBe(88)
  })

  it("POST triggers orchestrator execution and returns the summary", async () => {
    vi.mocked(prisma.userProfile.findUnique).mockResolvedValueOnce({
      targetRoles: ["Staff Frontend Engineer"],
    } as any)

    const mockInvoke = vi.fn().mockResolvedValue({
      userId: testUserId,
      discoveredJobs: [{ id: "job-1" }, { id: "job-2" }],
      approvedOpportunities: [{ id: "job-1", fitScore: 92 }],
      applicationPackages: {
        "job-1": { coverLetter: "Dear Team...", resumeBullets: [], outreachPitch: "" },
      },
      executionAuditLog: [
        {
          id: "log-1",
          agent: "discovery",
          action: "TIER_1_AND_2_DISCOVERY",
          timestamp: new Date(),
          rationale: "Discovered 2 candidates",
        },
        {
          id: "log-2",
          agent: "evaluation",
          action: "EVALUATE_AND_GATE",
          timestamp: new Date(),
          rationale: "Approved 1 candidate",
        },
      ],
    })

    vi.mocked(orchestratorWorkflow.createCareerOrchestratorGraph).mockReturnValue({
      invoke: mockInvoke,
    } as any)

    const req = new NextRequest("http://localhost:3000/api/jobs/discover/orchestrator", {
      method: "POST",
      body: JSON.stringify({ targetRole: "Staff Frontend Engineer" }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.status).toBe("completed")
    expect(json.data.jobsEvaluated).toBe(2)
    expect(json.data.jobsStaged).toBe(1)
    expect(json.data.assetsCreated).toBe(1)
    expect(json.data.logs).toHaveLength(2)
  })
})
