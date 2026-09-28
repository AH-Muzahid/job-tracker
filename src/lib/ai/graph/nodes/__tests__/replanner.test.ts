import { describe, it, expect, vi, beforeEach } from "vitest"
import { createReplannerNode } from "../replanner"
import { HumanMessage } from "@langchain/core/messages"

describe("Dynamic Re-Planner Node Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("adapts tool parameters dynamically based on reflection feedback", async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          action: "adapt_parameters",
          adaptedToolInput: { query: "Rust", limit: 10 },
          reasoning: "Relaxed specific title constraint to general keyword to broaden search results.",
        }),
      }),
    } as any

    const replannerNode = createReplannerNode(mockModel)
    const state: any = {
      goal: "Find my Rust application",
      messages: [new HumanMessage("Find my Rust application")],
      plan: [
        {
          id: "step-1",
          task: "Search for Rust job",
          status: "failed",
          toolName: "searchApplications",
          toolInput: { query: "Senior Distributed Rust Systems Architect" },
          error: "0 matching applications found",
          retryable: true,
        },
      ],
      currentStepIndex: 0,
      reflection: {
        passed: false,
        feedback: "Step step-1 completed with semantic warning: 0 matching applications found. Retrying with broader parameters...",
        retryCount: 1,
      },
      userId: "user-1",
      sessionId: "session-1",
    }

    const result = await replannerNode(state)

    expect(mockModel.invoke).toHaveBeenCalledTimes(1)
    expect(result.plan?.[0].status).toBe("pending")
    expect(result.plan?.[0].toolInput).toEqual({ query: "Rust", limit: 10 })
    expect(result.plan?.[0].error).toBeUndefined()
    expect(result.plan?.[0].result).toBeUndefined()
    expect(result.reflection?.passed).toBe(false)
  })

  it("substitutes an alternative tool if suggested by model", async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          action: "substitute_tool",
          newToolName: "searchExternalJobs",
          adaptedToolInput: { query: "Rust Engineer", limit: 10 },
          reasoning: "User might be looking for live external postings rather than existing applications.",
        }),
      }),
    } as any

    const replannerNode = createReplannerNode(mockModel)
    const state: any = {
      goal: "Show me rust jobs",
      messages: [new HumanMessage("Show me rust jobs")],
      plan: [
        {
          id: "step-1",
          task: "Search applications",
          status: "failed",
          toolName: "searchApplications",
          toolInput: { query: "Rust Engineer" },
          error: "0 matching applications found",
          retryable: true,
        },
      ],
      currentStepIndex: 0,
      reflection: {
        passed: false,
        feedback: "0 matching applications found.",
        retryCount: 1,
      },
      userId: "user-1",
      sessionId: "session-1",
    }

    const result = await replannerNode(state)

    expect(result.plan?.[0].toolName).toBe("searchExternalJobs")
    expect(result.plan?.[0].toolInput).toEqual({ query: "Rust Engineer", limit: 10 })
    expect(result.plan?.[0].status).toBe("pending")
  })

  it("safely advances or preserves plan if model returns unparseable output", async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: "I could not formulate an adapted plan.",
      }),
    } as any

    const replannerNode = createReplannerNode(mockModel)
    const state: any = {
      goal: "Search jobs",
      messages: [new HumanMessage("Search jobs")],
      plan: [
        {
          id: "step-1",
          task: "Search applications",
          status: "failed",
          toolName: "searchApplications",
          toolInput: { query: "Rust Engineer" },
          error: "Timeout",
          retryable: true,
        },
      ],
      currentStepIndex: 0,
      reflection: {
        passed: false,
        feedback: "Timeout occurred",
        retryCount: 1,
      },
      userId: "user-1",
      sessionId: "session-1",
    }

    const result = await replannerNode(state)

    // Does not crash, retains plan
    expect(result.plan?.[0].id).toBe("step-1")
    expect(result.plan?.[0].status).toBe("pending")
  })
})
