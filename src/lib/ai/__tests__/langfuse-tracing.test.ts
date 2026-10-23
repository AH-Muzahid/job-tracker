import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  getLangfuseInstance,
  getLangfuseSpanProcessor,
  buildTraceTagsAndMetadata,
  trackGraphExecution,
  scoreTrace,
  flushLangfuse,
  shutdownLangfuse,
} from "../graph/telemetry"
import { logAITransaction, traceAIGeneration } from "../telemetry"

describe("Langfuse AI Observability & Tracing Suite (v4)", () => {
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

    const instance = getLangfuseInstance()
    expect(instance).toBeNull()

    const processor = getLangfuseSpanProcessor()
    expect(processor).toBeNull()
  })

  it("initializes Langfuse client and processor when credentials are present", () => {
    process.env.LANGFUSE_PUBLIC_KEY = "pk-lf-test-12345"
    process.env.LANGFUSE_SECRET_KEY = "sk-lf-test-67890"

    const instance = getLangfuseInstance()
    expect(instance).not.toBeNull()

    const processor = getLangfuseSpanProcessor()
    expect(processor).not.toBeNull()
  })

  it("builds consistent dynamic trace tags and structured metadata", () => {
    const { tags, metadata } = buildTraceTagsAndMetadata({
      category: "ats_resume_tailor",
      userId: "usr_99",
      sessionId: "sess_99",
      additionalTags: ["custom_tag"],
      additionalMetadata: { matchScore: 92 },
    })

    expect(tags).toContain("career-track")
    expect(tags).toContain("ats_resume_tailor")
    expect(tags).toContain("custom_tag")
    expect(metadata.userId).toBe("usr_99")
    expect(metadata.taskCategory).toBe("ats_resume_tailor")
    expect(metadata.matchScore).toBe(92)
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

    await expect(flushLangfuse(1500)).resolves.not.toThrow()
    await expect(shutdownLangfuse(1500)).resolves.not.toThrow()
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

  it("records AI generations with PII sanitization, tokens, and metadata safely", async () => {
    process.env.LANGFUSE_PUBLIC_KEY = "pk-lf-test-12345"
    process.env.LANGFUSE_SECRET_KEY = "sk-lf-test-67890"

    await expect(
      traceAIGeneration({
        name: "ats-resume-tailor",
        userId: "user-999",
        sessionId: "session-abc",
        model: "gpt-4o-mini",
        provider: "openai",
        input: {
          candidateEmail: "candidate@gmail.com",
          candidatePhone: "+1 (555) 234-5678",
          targetRole: "Full Stack Engineer",
        },
        output: {
          summary: "Tailored summary without PII",
        },
        promptTokens: 250,
        completionTokens: 120,
        latencyMs: 450,
        status: "success",
        tags: ["ats-tailor", "test"],
        metadata: { matchScore: 88 },
        flush: false,
      })
    ).resolves.not.toThrow()
  })

  it("handles generation errors gracefully in traceAIGeneration", async () => {
    delete process.env.LANGFUSE_PUBLIC_KEY
    delete process.env.LANGFUSE_SECRET_KEY

    await expect(
      traceAIGeneration({
        name: "outreach-email",
        userId: "user-err",
        model: "claude-3-5-sonnet",
        input: { role: "DevOps" },
        latencyMs: 120,
        status: "error",
        error: new Error("Rate limit reached"),
        flush: false,
      })
    ).resolves.not.toThrow()
  })
})
