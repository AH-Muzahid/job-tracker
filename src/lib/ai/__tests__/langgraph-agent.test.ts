/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest"
import { createPlannerNode } from "../graph/nodes/planner"
import { createReflectionNode } from "../graph/nodes/reflection"
import { createResponderNode } from "../graph/nodes/responder"
import { HumanMessage } from "@langchain/core/messages"

describe("LangGraph Agent Core Nodes", () => {
  it("Planner node generates a structured step-by-step plan", async () => {
    const mockModel: any = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          goal: "Apply to Stripe as Frontend Engineer",
          steps: [
            {
              id: "step-1",
              task: "Create application entry",
              toolName: "createApplication",
              toolInput: { companyName: "Stripe", jobTitle: "Frontend Engineer" },
            },
          ],
        }),
      }),
    }

    const plannerNode = createPlannerNode(mockModel)
    const state: any = {
      messages: [new HumanMessage("Apply to Stripe as Frontend Engineer")],
      goal: "",
      plan: [],
      currentStepIndex: 0,
    }

    const result = await plannerNode(state)
    expect(result.goal).toBe("Apply to Stripe as Frontend Engineer")
    expect(result.plan).toHaveLength(1)
    expect(result.plan?.[0].toolName).toBe("createApplication")
  })

  it("Reflection node passes successful steps and increments index", async () => {
    const reflectionNode = createReflectionNode()
    const state: any = {
      plan: [{ id: "step-1", status: "completed" }],
      currentStepIndex: 0,
      reflection: { passed: true, retryCount: 0 },
    }

    const result = await reflectionNode(state)
    expect(result.reflection?.passed).toBe(true)
    expect(result.currentStepIndex).toBe(1)
  })

  it("Reflection node triggers retry when step failed and under retry limit", async () => {
    const reflectionNode = createReflectionNode()
    const state: any = {
      plan: [{ id: "step-1", status: "failed", error: "Database timeout" }],
      currentStepIndex: 0,
      reflection: { passed: true, retryCount: 0 },
    }

    const result = await reflectionNode(state)
    expect(result.reflection?.passed).toBe(false)
    expect(result.reflection?.retryCount).toBe(1)
  })

  it("Responder node generates synthesis response", async () => {
    const mockModel: any = {
      invoke: vi.fn().mockResolvedValue({
        content: "Application for Stripe has been recorded successfully.",
      }),
    }

    const responderNode = createResponderNode(mockModel)
    const state: any = {
      goal: "Track Stripe application",
      plan: [{ id: "step-1", task: "Track Stripe", status: "completed" }],
      messages: [],
    }

    const result = await responderNode(state)
    expect(result.responseContent).toContain("Stripe")
    expect(result.messages).toBeDefined()
  })
})
