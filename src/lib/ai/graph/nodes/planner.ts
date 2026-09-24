/* eslint-disable @typescript-eslint/no-explicit-any */
import { SystemMessage, HumanMessage } from "@langchain/core/messages"
import type { AgentStateType, AgentPlanStep } from "../state"
import type { BaseChatModel } from "@langchain/core/language_models/chat_models"
import { getCachedSessionSummary } from "@/lib/ai/conversation-summarizer"
import { extractJsonObject } from "@/lib/ai/json-extractor"
import { getToolCatalogForPlanner } from "../tools/tool-manifest"
import { getChatPolicyPack } from "@/lib/ai/prompts/system-base"
import { sanitizeUntrustedContext } from "@/lib/ai/context-builder"
import { GREETING_REGEX, MAX_PLAN_STEPS, PLANNING_ERROR_FALLBACK } from "../constants"

export function getPlannerSystemPrompt(): string {
  return `${getChatPolicyPack()}

You are the CareerTrack AI Master Planner.
Your job is to analyze the user's career/job tracking request and determine if external tool actions are needed.

CRITICAL INSTRUCTIONS:
1. If the user's request is a greeting (e.g. "hi", "hello", "hey"), casual chat, general advice question, or conversational guidance, DO NOT generate any tool steps. Return "steps": [].
2. Only generate execution steps when the user asks to perform specific tool-assisted actions (e.g., search jobs, create/update/delete applications, tailor resume, fetch profile or memories, send outreach).
3. Plan efficiency: Formulate a focused plan with at most ${MAX_PLAN_STEPS} steps.
4. Extract explicit parameters from user request and active screen context. Never invent IDs.

Available Tools:
${getToolCatalogForPlanner()}

Output strictly valid JSON with the format:
{
  "goal": "Summary of user goal",
  "steps": [
    {
      "id": "step-1",
      "task": "Description of step",
      "toolName": "toolName or null",
      "toolInput": {}
    }
  ]
}
`
}

export function createPlannerNode(model: BaseChatModel) {
  return async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    const lastUserMessage = state.messages
      .slice()
      .reverse()
      .find((m) => m._getType() === "human" || (m as any).role === "user")

    const rawUserText = lastUserMessage ? String(lastUserMessage.content) : state.goal || ""
    const userText = sanitizeUntrustedContext(rawUserText)

    // Fast-path: Greetings or brief conversational queries don't need tool execution
    const cleanUserText = userText.trim().toLowerCase()
    const isGreeting = GREETING_REGEX.test(cleanUserText)
    if (isGreeting) {
      return {
        goal: userText,
        plan: [],
        currentStepIndex: 0,
      }
    }

    const sessionSummary = state.sessionId ? await getCachedSessionSummary(state.sessionId).catch(() => null) : null

    let routeContextText = ""
    if (state.routeContext) {
      const { currentRoute, entityType, entityId, entitySummary } = state.routeContext
      const sanitizedSummary = entitySummary ? sanitizeUntrustedContext(JSON.stringify(entitySummary)) : ""

      routeContextText = `Active Screen Context:\n- Route: ${currentRoute || "Unknown"}`
      if (entityType) routeContextText += `\n- Entity Type: ${entityType}`
      if (entityId) routeContextText += `\n- Entity ID: ${entityId}`
      if (sanitizedSummary) {
        routeContextText += `\n- Entity Details:\n<untrusted_content>\n${sanitizedSummary}\n</untrusted_content>`
      }
      routeContextText += "\n\n"
    }

    const summarySection = sessionSummary ? `Previous Session Context Summary:\n${sessionSummary}\n\n` : ""
    const promptText = `${summarySection}${routeContextText}User Request: "${userText}"`

    try {
      const systemPrompt = getPlannerSystemPrompt()
      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(promptText),
      ])

      const content = String(response.content)
      const parsed = extractJsonObject<{ goal?: string; steps?: any[] }>(content)

      if (parsed) {
        const rawSteps = Array.isArray(parsed.steps) ? parsed.steps : []
        const validSteps: AgentPlanStep[] = rawSteps
          .filter((s: any) => s && (s.toolName || s.task))
          .slice(0, MAX_PLAN_STEPS)
          .map((s: any, idx: number) => ({
            id: s.id || `step-${idx + 1}`,
            task: s.task || "Execute task",
            status: "pending",
            toolName: s.toolName || undefined,
            toolInput: typeof s.toolInput === "object" && s.toolInput !== null ? s.toolInput : {},
          }))

        return {
          goal: parsed.goal || userText,
          plan: validSteps,
          currentStepIndex: 0,
        }
      }

      // If model returned text that did not contain valid JSON on an actionable request, fail closed
      console.warn("[Planner Parse Failure]: LLM did not return parseable JSON for:", userText)
      return {
        goal: userText,
        plan: [],
        currentStepIndex: 0,
        responseContent: PLANNING_ERROR_FALLBACK,
      }
    } catch (err) {
      console.warn("[Planner Node Error]:", err)
      return {
        goal: userText,
        plan: [],
        currentStepIndex: 0,
        responseContent: PLANNING_ERROR_FALLBACK,
      }
    }
  }
}
