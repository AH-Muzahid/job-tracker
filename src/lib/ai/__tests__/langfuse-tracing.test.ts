/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  getLangfuseInstance,
  createLangfuseCallbackHandler,
  trackGraphExecution,
  scoreTrace,
  flushLangfuse,
} from "../graph/telemetry"
import { logAITransaction } from "../telemetry"

describe("Langfuse AI Observability & Tracing Suite", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("returns null when Langfuse credentials are not set", () => {
    delete process.env.LANGFUSE_PUBLIC_KEY
    delete process.env.LANGFUSE_SECRET_KEY

    const handler = createLangfuseCallbackHandler({
      userId: "user-123",
      sessionId: "session-456",
    })
    expect(handler).toBeNull()

    const instance = getLangfuseInstance()
    expect(instance).toBeNull()
  })

  it("initializes CallbackHandler when Langfuse credentials are present", () => {
    process.env.LANGFUSE_PUBLIC_KEY = "pk-lf-test-12345"
    process.env.LANGFUSE_SECRET_KEY = "sk-lf-test-67890"

    const handler = createLangfuseCallbackHandler({
      userId: "user-test",
      sessionId: "session-test",
      tags: ["test-tag"],
      metadata: { env: "vitest" },
    })

    expect(handler).not.toBeNull()
    expect(handler?.name).toBeDefined()
  })

  it("safely handles trackGraphExecution, scoreTrace, and flushLangfuse when Langfuse is disabled or enabled", async () => {
    // When disabled
    delete process.env.LANGFUSE_PUBLIC_KEY
    delete process.env.LANGFUSE_SECRET_KEY

    await expect(
      trackGraphExecution({
        userId: "user-1",
        sessionId: "sess-1",
        nodeName: "planner",
        input: { goal: "Find Go jobs" },
        output: { plan: [] },
        startTime: Date.now(),
      })
    ).resolves.not.toThrow()

    await expect(
      scoreTrace({
        traceId: "trace-123",
        name: "ats-score",
        value: 95,
        comment: "Excellent keyword match",
      })
    ).resolves.not.toThrow()

    await expect(flushLangfuse()).resolves.not.toThrow()
  })

  it("logs structured AI transactions safely", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})

    logAITransaction({
      traceId: "test-trace-id",
      userId: "user-test",
      endpoint: "career-briefing",
      provider: "openai",
      model: "gpt-4o",
      promptTokens: 150,
      completionTokens: 80,
      latencyMs: 320,
      status: "success",
    })

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
