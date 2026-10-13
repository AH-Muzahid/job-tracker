import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ config: vi.fn(), generate: vi.fn(), provider: vi.fn(), trace: vi.fn(), flush: vi.fn() }))
vi.mock("ai", () => ({ generateText: mocks.generate }))
vi.mock("@/lib/ai/config", () => ({ getUserAIConfig: mocks.config }))
vi.mock("@/lib/ai/client", () => ({ getProvider: mocks.provider }))
vi.mock("@/lib/ai/graph/telemetry", () => ({ trackGraphExecution: mocks.trace, flushLangfuse: mocks.flush }))
import { generateCareerBriefing } from "@/lib/ai/briefing"
beforeEach(() => {
  vi.resetAllMocks(); mocks.config.mockResolvedValue({ model: "test-model" })
  mocks.provider.mockReturnValue({ model: () => "model", defaultModel: "default" })
  mocks.generate.mockResolvedValue({ text: "- Review your two staged applications." })
})
describe("read-only career briefing", () => {
  it("summarizes facts in one model call without a tool planner", async () => {
    expect(await generateCareerBriefing("user-1", "Two staged applications")).toMatchObject({ success: true, content: "- Review your two staged applications." })
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ prompt: "Two staged applications", maxRetries: 0, maxOutputTokens: 800, abortSignal: expect.any(AbortSignal) }))
    expect(mocks.generate.mock.calls[0][0]).not.toHaveProperty("tools")
    expect(mocks.generate.mock.calls[0][0].system).toContain("untrusted data")
    expect(mocks.flush).toHaveBeenCalledOnce()
  })
  it("falls back when no provider is configured", async () => {
    mocks.config.mockResolvedValue(null); expect(await generateCareerBriefing("user-1", "snapshot")).toEqual({ success: false, content: "" }); expect(mocks.generate).not.toHaveBeenCalled()
  })
  it("does not leak provider errors and tolerates telemetry failure", async () => {
    mocks.generate.mockRejectedValue(new Error("secret-key diagnostics")); mocks.trace.mockRejectedValue(new Error("offline"))
    expect(await generateCareerBriefing("user-1", "snapshot")).toEqual({ success: false, content: "" })
  })
  it("rejects empty summaries", async () => {
    mocks.generate.mockResolvedValue({ text: "  " }); expect((await generateCareerBriefing("user-1", "snapshot")).success).toBe(false)
  })
})
