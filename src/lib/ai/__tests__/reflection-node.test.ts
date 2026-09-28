import { describe, it, expect } from "vitest"
import { createReflectionNode } from "../graph/nodes/reflection"
import type { AgentStateType } from "../graph/state"

describe("LangGraph Semantic Reflection Node", () => {
  const reflectionNode = createReflectionNode()

  it("passes immediately when step completes with rich data", async () => {
    const mockState: Partial<AgentStateType> = {
      plan: [
        {
          id: "step-1",
          task: "Search external jobs",
          toolName: "searchExternalJobs",
          status: "completed",
          result: { success: true, count: 5, jobs: [{ title: "Software Engineer" }] },
        },
      ],
      currentStepIndex: 0,
      reflection: { passed: true, retryCount: 0 },
    }

    const output = await reflectionNode(mockState as AgentStateType)
    expect(output.reflection?.passed).toBe(true)
    expect(output.currentStepIndex).toBe(1)
    expect(output.reflection?.feedback).toContain("verified outcome")
  })

  it("detects semantic empty/failure in tool result and triggers retry with advice", async () => {
    const mockState: Partial<AgentStateType> = {
      plan: [
        {
          id: "step-1",
          task: "Search external jobs",
          toolName: "searchExternalJobs",
          status: "completed",
          result: { success: false, error: "No matching opportunities found" },
          retryable: true,
        },
      ],
      currentStepIndex: 0,
      reflection: { passed: true, retryCount: 0 },
    }

    const output = await reflectionNode(mockState as AgentStateType)
    expect(output.reflection?.passed).toBe(false)
    expect(output.reflection?.retryCount).toBe(1)
    expect(output.reflection?.feedback).toContain("semantic warning")
    // Should NOT advance step index so executor can retry
    expect(output.currentStepIndex).toBeUndefined()
  })

  it("advances past step when retry limit is reached on semantic failure", async () => {
    const mockState: Partial<AgentStateType> = {
      plan: [
        {
          id: "step-1",
          task: "Search external jobs",
          toolName: "searchExternalJobs",
          status: "completed",
          result: { success: false, error: "Rate limit reached" },
          retryable: true,
        },
      ],
      currentStepIndex: 0,
      reflection: { passed: false, retryCount: 2 },
    }

    const output = await reflectionNode(mockState as AgentStateType)
    expect(output.reflection?.passed).toBe(true)
    expect(output.currentStepIndex).toBe(1)
    expect(output.reflection?.feedback).toContain("Max retries exceeded")
  })
})
