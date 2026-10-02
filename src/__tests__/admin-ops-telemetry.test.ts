import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  estimateTokenCost,
  recordLLMCallToRing,
  getRecentLLMCalls,
  recordAgentStepToRing,
  getRecentAgentSteps,
  recordJobRunToRing,
  getRecentJobRuns,
  getOpsMetricsSummary,
} from "@/lib/ops/telemetry-ring"

// Mock Redis client
const mockRedisStore: Record<string, any> = {}

vi.mock("@/lib/redis", () => ({
  getRedisClient: vi.fn(() => ({
    lpush: vi.fn(async (key: string, value: string) => {
      if (!mockRedisStore[key]) mockRedisStore[key] = []
      mockRedisStore[key].unshift(value)
      return mockRedisStore[key].length
    }),
    ltrim: vi.fn(async (key: string, start: number, stop: number) => {
      if (mockRedisStore[key]) {
        mockRedisStore[key] = mockRedisStore[key].slice(start, stop + 1)
      }
      return "OK"
    }),
    lrange: vi.fn(async (key: string, start: number, stop: number) => {
      if (!mockRedisStore[key]) return []
      return mockRedisStore[key].slice(start, stop === -1 ? undefined : stop + 1)
    }),
    expire: vi.fn(async () => 1),
    hincrby: vi.fn(async (key: string, field: string, increment: number) => {
      if (!mockRedisStore[key]) mockRedisStore[key] = {}
      mockRedisStore[key][field] = (mockRedisStore[key][field] || 0) + increment
      return mockRedisStore[key][field]
    }),
    hgetall: vi.fn(async (key: string) => {
      return mockRedisStore[key] || {}
    }),
  })),
  getCachedJson: vi.fn(async (key: string) => mockRedisStore[key] ?? null),
  setCachedJson: vi.fn(async (key: string, val: any) => {
    mockRedisStore[key] = val
    return true
  }),
}))

describe("Admin Ops Telemetry & Ring Buffer Engine", () => {
  beforeEach(() => {
    for (const key of Object.keys(mockRedisStore)) {
      delete mockRedisStore[key]
    }
  })

  it("calculates accurate token costs across providers and models", () => {
    // 1M prompt tokens on GPT-4o = $2.50, 1M completion = $10.00 -> 10k prompt + 2k completion = $0.025 + $0.02 = $0.045
    const gpt4oCost = estimateTokenCost("gpt-4o", 10000, 2000)
    expect(gpt4oCost).toBe(0.045)

    // Gemini Flash: $0.075 / 1M prompt, $0.30 / 1M completion
    const geminiCost = estimateTokenCost("gemini-1.5-flash", 100000, 10000)
    expect(geminiCost).toBeGreaterThan(0)
    expect(geminiCost).toBeLessThan(0.02)
  })

  it("records and retrieves recent LLM calls in sliding-window ring buffer", async () => {
    await recordLLMCallToRing({
      name: "tailor-resume",
      model: "gpt-4o",
      provider: "openai",
      promptTokens: 1200,
      completionTokens: 400,
      latencyMs: 850,
      status: "success",
      userId: "user_test_1",
    })

    const recent = await getRecentLLMCalls(10)
    expect(recent.length).toBe(1)
    expect(recent[0].name).toBe("tailor-resume")
    expect(recent[0].model).toBe("gpt-4o")
    expect(recent[0].totalTokens).toBe(1600)
    expect(recent[0].status).toBe("success")
  })

  it("records and retrieves agent step executions", async () => {
    await recordAgentStepToRing({
      nodeName: "planner",
      sessionId: "sess_123",
      userId: "user_456",
      tokens: 350,
      durationMs: 420,
      status: "success",
    })

    const agentSteps = await getRecentAgentSteps(10)
    expect(agentSteps.length).toBe(1)
    expect(agentSteps[0].nodeName).toBe("planner")
    expect(agentSteps[0].sessionId).toBe("sess_123")
  })

  it("records and retrieves inngest job runs", async () => {
    await recordJobRunToRing({
      functionId: "batch-job-pipeline",
      status: "completed",
      durationMs: 14500,
    })

    const recentJobs = await getRecentJobRuns(10)
    expect(recentJobs.length).toBe(1)
    expect(recentJobs[0].functionId).toBe("batch-job-pipeline")
    expect(recentJobs[0].status).toBe("completed")
  })

  it("computes comprehensive rolling ops metrics summary", async () => {
    await recordLLMCallToRing({
      name: "chat-summary",
      model: "gpt-4o-mini",
      promptTokens: 500,
      completionTokens: 100,
      latencyMs: 300,
      status: "success",
    })

    await recordLLMCallToRing({
      name: "job-discovery-evaluation",
      model: "gpt-4o",
      promptTokens: 2000,
      completionTokens: 500,
      latencyMs: 1100,
      status: "error",
      error: "Rate limit exceeded",
    })

    const summary = await getOpsMetricsSummary()
    expect(summary.totalLLMCalls).toBeGreaterThanOrEqual(2)
    expect(summary.totalTokens).toBeGreaterThanOrEqual(3100)
    expect(summary.avgLatencyMs).toBeGreaterThan(0)
    expect(summary.errorCount).toBeGreaterThanOrEqual(1)
  })
})
