import { describe, it, expect, vi } from "vitest"
import { createPlannerNode } from "../graph/nodes/planner"
import { createReflectionNode } from "../graph/nodes/reflection"
import { createResponderNode } from "../graph/nodes/responder"
import { executeDraftOutreachEmail } from "../graph/tools/email-tools"
import { HumanMessage } from "@langchain/core/messages"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        name: "Alex Rivera",
      }),
    },
    userProfile: {
      findUnique: vi.fn().mockResolvedValue({
        targetRoles: ["Senior Full Stack Engineer"],
        experienceLevel: "Senior",
        strengths: "Distributed systems, frontend architecture",
      }),
    },
  },
  withDbRetry: vi.fn((fn: () => any) => fn()),
}))

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

  it("Planner node handles markdown code fences and conversational suffix gracefully", async () => {
    const rawOutput = `Here is the execution plan:
\`\`\`json
{
  "goal": "Prepare outreach email",
  "steps": [
    {
      "id": "step-1",
      "task": "Draft outreach message",
      "toolName": "sendOutreachEmailViaResend",
      "toolInput": { "toEmail": "recruiter@stripe.com", "subject": "Application", "bodyText": "Hello" }
    }
  ]
}
\`\`\`
I will proceed with this plan.`

    const mockModel: any = {
      invoke: vi.fn().mockResolvedValue({
        content: rawOutput,
      }),
    }

    const plannerNode = createPlannerNode(mockModel)
    const state: any = {
      messages: [new HumanMessage("Draft an outreach message to recruiter@stripe.com")],
      goal: "",
      plan: [],
      currentStepIndex: 0,
    }

    const result = await plannerNode(state)
    expect(result.goal).toBe("Prepare outreach email")
    expect(result.plan).toHaveLength(1)
    expect(result.plan?.[0].toolName).toBe("sendOutreachEmailViaResend")
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

  it("Planner node decomposes Banglish outreach request into proactive tool steps", async () => {
    const mockModel: any = {
      invoke: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          goal: "Defdone er apply korar jonne mail lekho",
          steps: [
            {
              id: "step-1",
              task: "Check if Defdone is already tracked",
              toolName: "searchApplications",
              toolInput: { query: "Defdone" },
            },
            {
              id: "step-2",
              task: "Retrieve candidate skills and proof points",
              toolName: "getUserMemories",
              toolInput: { category: "skill" },
            },
            {
              id: "step-3",
              task: "Draft personalized outreach email for Defdone",
              toolName: "draftOutreachEmail",
              toolInput: { companyName: "Defdone", role: "Software Engineer" },
            },
          ],
        }),
      }),
    }

    const plannerNode = createPlannerNode(mockModel)
    const state: any = {
      messages: [new HumanMessage("Defdone er apply korar jonne mail lekho")],
      goal: "",
      plan: [],
      currentStepIndex: 0,
    }

    const result = await plannerNode(state)
    expect(result.plan).toHaveLength(3)
    expect(result.plan?.[0].toolName).toBe("searchApplications")
    expect(result.plan?.[1].toolName).toBe("getUserMemories")
    expect(result.plan?.[2].toolName).toBe("draftOutreachEmail")
    expect(result.plan?.[2].toolInput?.companyName).toBe("Defdone")
  })

  it("Reflection node does NOT mark empty application search result as failure", async () => {
    const reflectionNode = createReflectionNode()
    const state: any = {
      plan: [
        {
          id: "step-1",
          status: "completed",
          toolName: "searchApplications",
          result: { success: true, count: 0, applications: [] },
        },
      ],
      currentStepIndex: 0,
      reflection: { passed: true, retryCount: 0 },
    }

    const result = await reflectionNode(state)
    expect(result.reflection?.passed).toBe(true)
    expect(result.currentStepIndex).toBe(1)
  })

  it("executeDraftOutreachEmail generates grounded outreach draft without placeholders", async () => {
    const outcome = await executeDraftOutreachEmail("user-123", {
      companyName: "Defdone",
    })

    expect(outcome.success).toBe(true)
    expect(outcome.companyName).toBe("Defdone")
    expect(outcome.role).toBe("Senior Full Stack Engineer")
    expect(outcome.candidateName).toBe("Alex Rivera")
    expect(outcome.subject).toContain("Defdone")
    expect(outcome.body).toContain("Alex Rivera")
    expect(outcome.body).not.toContain("[Your Name]")
    expect(outcome.body).not.toContain("[Job Title]")
    expect(outcome.format).toBe("Outreach Email Draft")
    expect(outcome.isEmailDraft).toBe(true)
  })
})

