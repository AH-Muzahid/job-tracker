/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { runHeadlessEvaluation } from "@/lib/ai/graph/headless"
import { getUserAIConfig } from "@/lib/ai/config"
import { buildCareerAgentGraph } from "@/lib/ai/graph/workflow"

vi.mock("@/lib/ai/config", () => ({
  getUserAIConfig: vi.fn(),
}))

vi.mock("@/lib/ai/graph/workflow", () => ({
  buildCareerAgentGraph: vi.fn(),
}))

describe("Headless LangGraph Agent Evaluator", () => {
  const testUserId = "user-headless-123"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns error message when user AI config is missing", async () => {
    vi.mocked(getUserAIConfig).mockResolvedValueOnce(null)

    const result = await runHeadlessEvaluation(testUserId, "Review stale applications")
    expect(result.success).toBe(false)
    expect(result.content).toContain("AI provider not configured")
  })

  it("executes headless state graph and returns synthesized content", async () => {
    vi.mocked(getUserAIConfig).mockResolvedValueOnce({
      providerType: "openai",
      apiKey: "sk-test",
    })

    const mockGraph = {
      invoke: vi.fn().mockResolvedValueOnce({
        responseContent: "1. Follow up with Acme Corp.\n2. Apply to Stripe role.",
        plan: [{ id: "step-1", task: "Analyze applications", status: "completed" }],
      }),
    }
    vi.mocked(buildCareerAgentGraph).mockResolvedValueOnce(mockGraph as any)

    const result = await runHeadlessEvaluation(testUserId, "Generate daily briefing")
    expect(result.success).toBe(true)
    expect(result.content).toContain("Follow up with Acme Corp")
    expect(result.plan).toHaveLength(1)
  })
})
