/* eslint-disable @typescript-eslint/no-explicit-any */
import { SystemMessage, HumanMessage } from "@langchain/core/messages"
import type { AgentStateType, AgentPlanStep } from "../state"
import type { BaseChatModel } from "@langchain/core/language_models/chat_models"
import { extractJsonObject } from "@/lib/ai/json-extractor"
import { getToolCatalogForPlanner } from "../tools/tool-manifest"
import { getChatPolicyPack } from "@/lib/ai/prompts/system-base"
import { sanitizeUntrustedContext } from "@/lib/ai/context-builder"

export function getReplannerSystemPrompt(): string {
  return `${getChatPolicyPack()}

You are the CareerTrack AI Cognitive Re-Planner.
A previous execution step failed or produced an unviable/empty semantic outcome.
Your mission is to dynamically adapt the failing step's parameters or substitute an alternative tool to achieve the user's career/job tracking goal.

Available Tools:
${getToolCatalogForPlanner()}

GUIDELINES:
1. If the tool returned 0 results or failed due to overly specific query parameters, RELAX the parameters (e.g. broaden search keywords, remove strict location/title constraints).
2. If the user was trying to perform an external search but the planner picked internal applications (or vice-versa), substitute with the correct tool (e.g. "searchExternalJobs").
3. NEVER invent IDs.
4. Output strictly valid JSON with the format:
{
  "action": "adapt_parameters" | "substitute_tool" | "skip_step",
  "adaptedToolInput": { ... },
  "newToolName": "toolName or null",
  "reasoning": "Brief explanation of the adaptation"
}
`
}

export function createReplannerNode(model: BaseChatModel) {
  return async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    const { plan, currentStepIndex, reflection, goal } = state
    if (!plan || plan.length === 0 || currentStepIndex >= plan.length) {
      return {}
    }

    const currentStep = plan[currentStepIndex]
    const updatedPlan: AgentPlanStep[] = [...plan]

    const promptText = `User Goal: "${sanitizeUntrustedContext(goal || "")}"
Current Failing Step:
- ID: ${currentStep.id}
- Task: ${currentStep.task}
- Tool: ${currentStep.toolName || "None"}
- Input: ${JSON.stringify(currentStep.toolInput || {})}
- Error/Outcome: ${currentStep.error || "Unsuccessful outcome"}
- Reflection Feedback: ${reflection?.feedback || "Step outcome did not pass verification"}
- Retry Count: ${reflection?.retryCount || 1}

Adapt the step parameters or choose a better tool to accomplish the user's goal.`

    try {
      const systemPrompt = getReplannerSystemPrompt()
      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(promptText),
      ])

      const content = String(response.content)
      const parsed = extractJsonObject<{
        action?: string
        adaptedToolInput?: Record<string, any>
        newToolName?: string
        reasoning?: string
      }>(content)

      if (parsed) {
        const nextToolInput =
          typeof parsed.adaptedToolInput === "object" && parsed.adaptedToolInput !== null
            ? parsed.adaptedToolInput
            : currentStep.toolInput || {}

        const nextToolName = parsed.newToolName || currentStep.toolName

        updatedPlan[currentStepIndex] = {
          ...currentStep,
          status: "pending",
          toolName: nextToolName,
          toolInput: nextToolInput,
          result: undefined,
          error: undefined,
        }

        return {
          plan: updatedPlan,
          reflection: {
            passed: false,
            feedback: parsed.reasoning || reflection?.feedback,
            retryCount: (reflection?.retryCount || 1) + 1,
          },
        }
      }

      // If parse fails, reset step to pending with existing inputs to avoid crash
      updatedPlan[currentStepIndex] = {
        ...currentStep,
        status: "pending",
        result: undefined,
        error: undefined,
      }

      return {
        plan: updatedPlan,
        reflection: {
          passed: false,
          feedback: reflection?.feedback,
          retryCount: (reflection?.retryCount || 1) + 1,
        },
      }
    } catch (err) {
      console.warn("[Replanner Node Error]:", err)
      updatedPlan[currentStepIndex] = {
        ...currentStep,
        status: "pending",
        result: undefined,
        error: undefined,
      }

      return {
        plan: updatedPlan,
        reflection: {
          passed: false,
          feedback: reflection?.feedback,
          retryCount: (reflection?.retryCount || 1) + 1,
        },
      }
    }
  }
}
