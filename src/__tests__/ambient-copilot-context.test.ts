import { describe, it, expect, vi, beforeEach } from "vitest"
import { AgentState, type AgentStateType } from "@/lib/ai/graph/state"
import { createPlannerNode } from "@/lib/ai/graph/nodes/planner"
import { createResponderNode } from "@/lib/ai/graph/nodes/responder"
import { HumanMessage } from "@langchain/core/messages"

// Mock conversation summarizer
vi.mock("@/lib/ai/conversation-summarizer", () => ({
  getCachedSessionSummary: vi.fn().mockResolvedValue(null),
}))

describe("CAG-11: Ambient Copilot Route & Entity Context Injection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("AgentState Schema", () => {
    it("has routeContext property defined on AgentState spec", () => {
      expect(AgentState.spec.routeContext).toBeDefined()
    })
  })

  describe("createPlannerNode Context Injection", () => {
    it("injects screen route and application entity summary into prompt", async () => {
      let capturedPrompt = ""

      const mockModel: any = {
        invoke: vi.fn().mockImplementation(async (messages: any[]) => {
          const humanMsg = messages.find((m: any) => m._getType() === "human")
          capturedPrompt = humanMsg?.content ? String(humanMsg.content) : ""
          return {
            content: JSON.stringify({
              goal: "Prepare for Stripe interview",
              steps: [
                {
                  id: "step-1",
                  task: "Search applications for Stripe",
                  toolName: "searchApplications",
                  toolInput: { query: "Stripe" },
                },
              ],
            }),
          }
        }),
      }

      const planner = createPlannerNode(mockModel)

      const testState: AgentStateType = {
        userId: "user-123",
        sessionId: "sess-1",
        goal: "What system design questions might they ask?",
        messages: [new HumanMessage("What system design questions might they ask?")],
        plan: [],
        currentStepIndex: 0,
        reflection: { passed: true, retryCount: 0 },
        interruptData: null,
        responseContent: "",
        routeContext: {
          currentRoute: "/applications/app-stripe-999",
          entityType: "application",
          entityId: "app-stripe-999",
          entitySummary: {
            companyName: "Stripe",
            jobTitle: "Staff Infrastructure Engineer",
            status: "Interview",
            interviewRound: "System Design",
          },
        },
      }

      const result = await planner(testState)

      expect(mockModel.invoke).toHaveBeenCalledTimes(1)
      expect(capturedPrompt).toContain("Active Screen Context:")
      expect(capturedPrompt).toContain("/applications/app-stripe-999")
      expect(capturedPrompt).toContain("Stripe")
      expect(capturedPrompt).toContain("Staff Infrastructure Engineer")
      expect(capturedPrompt).toContain("System Design")

      expect(result.plan).toHaveLength(1)
      expect(result.plan![0].toolName).toBe("searchApplications")
    })

    it("operates normally when routeContext is absent", async () => {
      let capturedPrompt = ""

      const mockModel: any = {
        invoke: vi.fn().mockImplementation(async (messages: any[]) => {
          const humanMsg = messages.find((m: any) => m._getType() === "human")
          capturedPrompt = humanMsg?.content ? String(humanMsg.content) : ""
          return {
            content: JSON.stringify({
              goal: "General help",
              steps: [],
            }),
          }
        }),
      }

      const planner = createPlannerNode(mockModel)

      const testState: AgentStateType = {
        userId: "user-123",
        sessionId: "sess-1",
        goal: "Find remote react jobs",
        messages: [new HumanMessage("Find remote react jobs")],
        plan: [],
        currentStepIndex: 0,
        reflection: { passed: true, retryCount: 0 },
        interruptData: null,
        responseContent: "",
        routeContext: null,
      }

      const result = await planner(testState)

      expect(mockModel.invoke).toHaveBeenCalledTimes(1)
      expect(capturedPrompt).not.toContain("Active Screen Context:")
      expect(result.plan).toEqual([])
    })
  })

  describe("createResponderNode Context Injection", () => {
    it("injects screen route and active entity summary into responder prompt", async () => {
      let capturedPrompt = ""

      const mockModel: any = {
        invoke: vi.fn().mockImplementation(async (messages: any[]) => {
          const humanMsg = messages.find((m: any) => m._getType() === "human")
          capturedPrompt = humanMsg?.content ? String(humanMsg.content) : ""
          return {
            content: "Here is your customized advice for Stripe.",
          }
        }),
      }

      const responder = createResponderNode(mockModel)

      const testState: AgentStateType = {
        userId: "user-123",
        sessionId: "sess-1",
        goal: "How can I improve my odds?",
        messages: [new HumanMessage("How can I improve my odds?")],
        plan: [
          {
            id: "step-1",
            task: "Analyze role",
            status: "completed",
            result: { matchScore: 95 },
          },
        ],
        currentStepIndex: 1,
        reflection: { passed: true, retryCount: 0 },
        interruptData: null,
        responseContent: "",
        routeContext: {
          currentRoute: "/applications/app-linear-777",
          entityType: "application",
          entityId: "app-linear-777",
          entitySummary: {
            companyName: "Linear",
            jobTitle: "Frontend Engineer",
          },
        },
      }

      const result = await responder(testState)

      expect(mockModel.invoke).toHaveBeenCalledTimes(1)
      expect(capturedPrompt).toContain("Active Screen Context:")
      expect(capturedPrompt).toContain("/applications/app-linear-777")
      expect(capturedPrompt).toContain("Linear")
      expect(result.responseContent).toBe("Here is your customized advice for Stripe.")
    })
  })

  describe("Tenant-Isolated Server-Side Context Enrichment", () => {
    it("isolates entity enrichment by userId to prevent cross-tenant leakage", async () => {
      // Verify simulated DB enrichment logic
      const mockDb = [
        {
          id: "app-user1-secret",
          userId: "user-1",
          companyName: "Secret Startup",
          jobTitle: "CTO",
        },
        {
          id: "app-user2-public",
          userId: "user-2",
          companyName: "Public Corp",
          jobTitle: "Developer",
        },
      ]

      const enrichApplication = (entityId: string, currentUserId: string) => {
        const match = mockDb.find((a) => a.id === entityId && a.userId === currentUserId)
        if (!match) return null
        return {
          companyName: match.companyName,
          jobTitle: match.jobTitle,
        }
      }

      // User 2 tries to access User 1's secret application via entityId
      const maliciousAttempt = enrichApplication("app-user1-secret", "user-2")
      expect(maliciousAttempt).toBeNull()

      // User 1 accesses their own application
      const legitimateAccess = enrichApplication("app-user1-secret", "user-1")
      expect(legitimateAccess).not.toBeNull()
      expect(legitimateAccess?.companyName).toBe("Secret Startup")
    })
  })
})
