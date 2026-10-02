import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET as getMetrics } from "@/app/api/admin/ops/metrics/route"
import { GET as getJobs } from "@/app/api/admin/ops/jobs/route"
import { POST as triggerJob } from "@/app/api/admin/ops/jobs/trigger/route"
import { GET as getLLM, POST as postLLM } from "@/app/api/admin/ops/llm/route"
import { GET as getAgents, POST as postAgents } from "@/app/api/admin/ops/agents/route"
import { NextRequest } from "next/server"

// Mock assertAdmin
const mockAdminStatus = { isAdmin: true, userId: "admin_user_1", clerkUserId: "clerk_admin" }
vi.mock("@/lib/auth/admin", () => ({
  assertAdmin: vi.fn(async () => {
    if (!mockAdminStatus.isAdmin) {
      throw new Error("Forbidden: Admin access required")
    }
    return { userId: mockAdminStatus.userId, clerkUserId: mockAdminStatus.clerkUserId }
  }),
}))

vi.mock("@/lib/ops/telemetry-ring", () => ({
  getOpsMetricsSummary: vi.fn(async () => ({
    totalLLMCalls: 42,
    totalTokens: 120000,
    promptTokens: 80000,
    completionTokens: 40000,
    totalCostUsd: 0.32,
    avgLatencyMs: 450,
    errorCount: 1,
    successRate: 97.6,
    activePipelinesCount: 14,
    recentJobsCount: 8,
    jobSuccessRate: 100,
  })),
  getRecentLLMCalls: vi.fn(async () => [
    {
      id: "llm_1",
      name: "tailor-resume",
      model: "gpt-4o",
      totalTokens: 1500,
      latencyMs: 780,
      status: "success",
    },
  ]),
  getRecentAgentSteps: vi.fn(async () => [
    {
      id: "agent_1",
      nodeName: "planner",
      sessionId: "sess_1",
      status: "success",
    },
  ]),
  getRecentJobRuns: vi.fn(async () => [
    {
      id: "job_1",
      functionId: "daily-job-hunt-scheduler",
      status: "completed",
    },
  ]),
  recordLLMCallToRing: vi.fn(async () => {}),
  recordAgentStepToRing: vi.fn(async () => {}),
}))

vi.mock("@/lib/ops/inngest-catalog", () => ({
  INNGEST_PIPELINE_CATALOG: [
    { id: "daily-job-hunt-scheduler", name: "Daily Job Hunt" },
  ],
  triggerInngestPipeline: vi.fn(async (id: string) => {
    if (id === "daily-job-hunt-scheduler") {
      return { success: true, eventId: "evt_123" }
    }
    return { success: false, error: "Unknown pipeline" }
  }),
}))

describe("Admin Ops REST Endpoints", () => {
  beforeEach(() => {
    mockAdminStatus.isAdmin = true
  })

  it("GET /api/admin/ops/metrics returns aggregated metrics when authenticated as admin", async () => {
    const res = await getMetrics()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.metrics.totalLLMCalls).toBe(42)
    expect(data.metrics.totalCostUsd).toBe(0.32)
  })

  it("GET /api/admin/ops/jobs returns pipeline catalog and recent runs", async () => {
    const res = await getJobs()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.catalog.length).toBeGreaterThan(0)
    expect(data.recentRuns.length).toBe(1)
  })

  it("POST /api/admin/ops/jobs/trigger triggers pipeline on-demand", async () => {
    const req = new NextRequest("http://localhost/api/admin/ops/jobs/trigger", {
      method: "POST",
      body: JSON.stringify({ functionId: "daily-job-hunt-scheduler" }),
    })
    const res = await triggerJob(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.eventId).toBe("evt_123")
  })

  it("POST /api/admin/ops/jobs/trigger rejects missing functionId", async () => {
    const req = new NextRequest("http://localhost/api/admin/ops/jobs/trigger", {
      method: "POST",
      body: JSON.stringify({}),
    })
    const res = await triggerJob(req)
    expect(res.status).toBe(400)
  })

  it("GET /api/admin/ops/llm returns recent LLM generations", async () => {
    const res = await getLLM()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.calls.length).toBe(1)
    expect(data.calls[0].model).toBe("gpt-4o")
  })

  it("GET /api/admin/ops/agents returns recent agent trace steps", async () => {
    const res = await getAgents()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.steps.length).toBe(1)
    expect(data.steps[0].nodeName).toBe("planner")
  })

  it("POST /api/admin/ops/llm records a probe and returns updated calls", async () => {
    const req = new NextRequest("http://localhost/api/admin/ops/llm", {
      method: "POST",
      body: JSON.stringify({ name: "test-probe", model: "gpt-4o-mini" }),
    })
    const res = await postLLM(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.calls).toBeDefined()
  })

  it("POST /api/admin/ops/agents records a step probe and returns updated steps", async () => {
    const req = new NextRequest("http://localhost/api/admin/ops/agents", {
      method: "POST",
      body: JSON.stringify({ nodeName: "planner" }),
    })
    const res = await postAgents(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.steps).toBeDefined()
  })

  it("blocks non-admin users with 403 Forbidden", async () => {
    mockAdminStatus.isAdmin = false
    const res = await getMetrics()
    expect(res.status).toBe(403)
  })
})
