/* eslint-disable @typescript-eslint/no-explicit-any */
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages"
import type { AgentStateType } from "../state"
import type { BaseChatModel } from "@langchain/core/language_models/chat_models"
import { getCachedSessionSummary } from "@/lib/ai/conversation-summarizer"
import { getChatPolicyPack } from "@/lib/ai/prompts/system-base"
import { sanitizeUntrustedContext } from "@/lib/ai/context-builder"
import {
  GREETING_REGEX,
  MAX_TOOL_RESULT_BYTES,
  FALLBACK_GREETING_MESSAGE,
} from "../constants"

export function getResponderSystemPrompt(): string {
  return `${getChatPolicyPack()}

You are CareerTrack AI, the elite career and job application assistant.
Your mission is to help job seekers land their dream roles through intelligent tracking, resume optimization, interview preparation, and strategic outreach.

Guidelines:
1. When the user's message is a greeting, introduction, or general inquiry, respond warmly, conversationally, and proactively offer assistance with their applications, resume, or job search.
2. If tool actions were executed, seamlessly weave their outcomes into your response. Highlight key metrics, saved applications, or job opportunities clearly with markdown formatting.
3. NEVER output robotic status logs, internal step descriptions, or phrases like "Task acknowledged without external tool execution".
4. STRICT PROHIBITION: NEVER use the Sparkles icon or generic AI filler. Maintain a professional, clean, and empowering tone.
5. Respect user's language choice (English, Bangla, or mixed Banglish).
`
}

export function createResponderNode(model: BaseChatModel) {
  return async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    const { goal, plan, sessionId } = state

    // If planner already returned a high-priority user error message (e.g. parse failure)
    if (state.responseContent && (!plan || plan.length === 0)) {
      return {
        responseContent: state.responseContent,
        messages: [new AIMessage(state.responseContent)],
      }
    }

    const meaningfulSteps = (plan || []).filter((s) => s.toolName || s.result)
    const hasToolOutcomes = meaningfulSteps.length > 0

    const planSummary = meaningfulSteps
      .map((s) => {
        let serializedResult = ""
        if (s.result) {
          const rawStr = JSON.stringify(s.result)
          if (rawStr.length > MAX_TOOL_RESULT_BYTES) {
            serializedResult = ` -> Outcome: ${rawStr.slice(0, MAX_TOOL_RESULT_BYTES)}... [truncated]`
          } else {
            serializedResult = ` -> Outcome: ${rawStr}`
          }
        }
        return `- Action "${s.task}": ${s.status}${serializedResult}${s.error ? ` -> Issue: ${s.error}` : ""}`
      })
      .join("\n")

    const sessionSummary = sessionId ? await getCachedSessionSummary(sessionId).catch(() => null) : null
    const summaryHeader = sessionSummary ? `Prior Conversation Summary:\n${sessionSummary}\n\n` : ""

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

    const promptText = hasToolOutcomes
      ? `${summaryHeader}${routeContextText}User Request: "${goal}"\n\nExecution Outcomes:\n${planSummary}\n\nPlease synthesize a clear, comprehensive, and proactive response for the user.`
      : `${summaryHeader}${routeContextText}User Message: "${goal}"\n\nPlease provide a direct, natural, and helpful response to the user as their CareerTrack AI assistant.`

    try {
      const systemPrompt = getResponderSystemPrompt()
      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(promptText),
      ])

      const responseText = String(response.content)

      return {
        responseContent: responseText,
        messages: [new AIMessage(responseText)],
      }
    } catch (err: any) {
      console.warn("[Responder Node Warning]:", err)

      // Intelligent, friendly conversational fallback
      const cleanGoal = (goal || "").trim().toLowerCase()
      const isGreeting = GREETING_REGEX.test(cleanGoal)

      if (isGreeting || !hasToolOutcomes) {
        return {
          responseContent: FALLBACK_GREETING_MESSAGE,
          messages: [new AIMessage(FALLBACK_GREETING_MESSAGE)],
        }
      }

      const readableSummary = meaningfulSteps
        .map((s) => `• **${s.task}**: ${s.status === "completed" ? "Completed successfully" : s.error || "Processed"}`)
        .join("\n")

      const fallbackText = `I have processed your request:\n\n${readableSummary}\n\nHow would you like to proceed next?`
      return {
        responseContent: fallbackText,
        messages: [new AIMessage(fallbackText)],
      }
    }
  }
}
