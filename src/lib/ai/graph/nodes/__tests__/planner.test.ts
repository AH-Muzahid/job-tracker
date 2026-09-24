import { describe, it, expect, vi, beforeEach } from "vitest"
import { createPlannerNode } from "../planner"
import { HumanMessage } from "@langchain/core/messages"
import { PLANNING_ERROR_FALLBACK } from "../../constants"

describe("Planner Node Unit & Safety Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fast-paths greetings without invoking model or generating tool steps", async () => {
    const mockModel = {
      invoke: vi.fn(),
    } as any

    const plannerNode = createPlannerNode(mockModel)
    const state = {
      goal: "Hello there!",
      messages: [new HumanMessage("Hello there!")],
      plan: [],
      currentStepIndex: 0,
      reflection: { passed: true, retryCount: 0 },
      userId: "user-1",
      sessionId: "session-1",
      routeContext: null,
      isHeadlessMode: false,
      responseContent: "",
      interruptData: null,
    }

    const result = await plannerNode(state)

    expect(mockModel.invoke).not.toHaveBeenCalled()
    expect(result.plan).toEqual([])
    expect(result.currentStepIndex).toBe(0)
  })

  it("parses valid LLM JSON response and caps plan steps at 5", async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          goal: "Search and save job",
          steps: [
            { id: "s1", task: "Step 1", toolName: "searchApplications", toolInput: {} },
            { id: "s2", task: "Step 2", toolName: "searchApplications", toolInput: {} },
            { id: "s3", task: "Step 3", toolName: "searchApplications", toolInput: {} },
            { id: "s4", task: "Step 4", toolName: "searchApplications", toolInput: {} },
            { id: "s5", task: "Step 5", toolName: "searchApplications", toolInput: {} },
            { id: "s6", task: "Step 6", toolName: "searchApplications", toolInput: {} },
            { id: "s7", task: "Step 7", toolName: "searchApplications", toolInput: {} },
          ],
        }),
      }),
    } as any

    const plannerNode = createPlannerNode(mockModel)
    const state = {
      goal: "Search jobs and sync applications",
      messages: [new HumanMessage("Search jobs and sync applications")],
      plan: [],
      currentStepIndex: 0,
      reflection: { passed: true, retryCount: 0 },
      userId: "user-1",
      sessionId: "session-1",
      routeContext: null,
      isHeadlessMode: false,
      responseContent: "",
      interruptData: null,
    }

    const result = await plannerNode(state)

    expect(mockModel.invoke).toHaveBeenCalledTimes(1)
    expect(result.plan?.length).toBe(5) // Capped at MAX_PLAN_STEPS = 5
    expect(result.plan?.[0].toolName).toBe("searchApplications")
  })

  it("fails closed with user-friendly error response when LLM returns unparseable text", async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: "I am unable to output JSON right now because of an internal model hallucination.",
      }),
    } as any

    const plannerNode = createPlannerNode(mockModel)
    const state = {
      goal: "Delete my application for Acme Corp",
      messages: [new HumanMessage("Delete my application for Acme Corp")],
      plan: [],
      currentStepIndex: 0,
      reflection: { passed: true, retryCount: 0 },
      userId: "user-1",
      sessionId: "session-1",
      routeContext: null,
      isHeadlessMode: false,
      responseContent: "",
      interruptData: null,
    }

    const result = await plannerNode(state)

    expect(result.plan).toEqual([])
    expect(result.responseContent).toBe(PLANNING_ERROR_FALLBACK)
  })
})
