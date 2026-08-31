/* eslint-disable @typescript-eslint/no-explicit-any */
import { SystemMessage, HumanMessage } from "@langchain/core/messages"
import type { AgentStateType, AgentPlanStep } from "../state"
import type { BaseChatModel } from "@langchain/core/language_models/chat_models"

const PLANNER_SYSTEM_PROMPT = `You are the CareerTrack AI Master Planner.
Your job is to analyze the user's career/job tracking request and generate a structured step-by-step execution plan.

Available Tools:
- searchExternalJobs: { query?: string, tags?: string[], location?: string, limit?: number }
- saveJobOpportunityToTracker: { companyName: string, jobTitle: string, jobUrl?: string, location?: string, salary?: string, notes?: string, status?: string }
- createApplication: { companyName: string, jobTitle: string, jobUrl?: string, status?: string, notes?: string }
- updateApplicationStatus: { companyOrTitle: string, newStatus: string, notes?: string }
- searchApplications: { query?: string, status?: string }
- deleteApplication: { companyOrTitle?: string, applicationId?: string }
- getResumeDetails: {}
- tailorResumeForJob: { jobDescription: string, companyName?: string, jobTitle?: string, resumeId?: string }
- syncCareerKnowledgeGraph: {}
- queryCareerKnowledgeGraph: { jobDescription: string }
- getUserProfile: {}
- updateUserProfile: { headline?: string, bio?: string, skills?: string[], targetRoles?: string[], location?: string }
- saveUserMemory: { category: string, content: string }
- getUserMemories: {}
- createWeeklyGoal: { goal1: string, goal2?: string, goal3?: string }
- sendOutreachEmailViaResend: { toEmail: string, subject: string, bodyText: string, recipientName?: string }

Output strictly valid JSON with the format:
{
  "goal": "Summary of user goal",
  "steps": [
    {
      "id": "step-1",
      "task": "Description of step",
      "toolName": "toolName or null if no tool needed",
      "toolInput": {}
    }
  ]
}
`

export function createPlannerNode(model: BaseChatModel) {
  return async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    const lastUserMessage = state.messages
      .slice()
      .reverse()
      .find((m) => m._getType() === "human" || (m as any).role === "user")

    const userText = lastUserMessage ? String(lastUserMessage.content) : state.goal || ""

    try {
      const response = await model.invoke([
        new SystemMessage(PLANNER_SYSTEM_PROMPT),
        new HumanMessage(`User Request: "${userText}"`),
      ])

      const content = String(response.content)
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        const steps: AgentPlanStep[] = (parsed.steps || []).map((s: any, idx: number) => ({
          id: s.id || `step-${idx + 1}`,
          task: s.task,
          status: "pending",
          toolName: s.toolName || undefined,
          toolInput: s.toolInput || undefined,
        }))

        return {
          goal: parsed.goal || userText,
          plan: steps,
          currentStepIndex: 0,
        }
      }
    } catch (err) {
      console.warn("[Planner Node Warning]:", err)
    }

    // Fallback simple plan
    return {
      goal: userText,
      plan: [
        {
          id: "step-1",
          task: "Respond to user inquiry",
          status: "pending",
        },
      ],
      currentStepIndex: 0,
    }
  }
}
