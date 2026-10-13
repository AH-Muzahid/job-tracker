import { beforeEach, describe, expect, it, vi } from "vitest"
import { createExecutorNode } from "@/lib/ai/graph/nodes/executor"
import type { AgentStateType } from "@/lib/ai/graph/state"

const approval = vi.hoisted(() => ({ interrupt: vi.fn(), execute: vi.fn() }))
vi.mock("@langchain/langgraph", async (original) => ({ ...(await original<Record<string, unknown>>()), interrupt: approval.interrupt }))
vi.mock("@/lib/ai/graph/tools/tool-manifest", () => ({ executeToolByName: approval.execute, isHITLRequired: () => true, isAllowedInHeadless: () => false }))
const state = (): AgentStateType => ({ userId: "owner", sessionId: "session", messages: [], goal: "Send requested email", reflection: { passed: true, retryCount: 0 }, interruptData: null, responseContent: "", routeContext: null, plan: [{ id: "email", task: "Send email", status: "pending", toolName: "sendOutreachEmailViaResend", toolInput: { toEmail: "original@example.test", subject: "Subject", bodyText: "Original body" } }], currentStepIndex: 0, isHeadlessMode: false })

describe("approval execution contract", () => {
  beforeEach(() => { vi.clearAllMocks(); approval.execute.mockResolvedValue({ success: true, result: { delivered: true } }) })
  it("executes user-edited approved inputs and records them in the plan", async () => {
    approval.interrupt.mockReturnValue({ action: "APPROVE", payload: { toEmail: "approved@example.test", bodyText: "Approved body" } })
    const result = await createExecutorNode()(state())
    expect(approval.execute).toHaveBeenCalledWith("sendOutreachEmailViaResend", { toEmail: "approved@example.test", subject: "Subject", bodyText: "Approved body" }, "owner", { isHeadless: false })
    expect(result.plan?.[0].toolInput?.toEmail).toBe("approved@example.test")
  })
  it("does not execute rejected or headless sensitive operations", async () => {
    approval.interrupt.mockReturnValue({ action: "REJECT" })
    await createExecutorNode()(state())
    await createExecutorNode()({ ...state(), isHeadlessMode: true })
    expect(approval.execute).not.toHaveBeenCalled()
  })
})
