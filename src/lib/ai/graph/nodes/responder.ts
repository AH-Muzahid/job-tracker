/* eslint-disable @typescript-eslint/no-explicit-any */
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages"
import type { AgentStateType } from "../state"
import type { BaseChatModel } from "@langchain/core/language_models/chat_models"
import { getCachedSessionSummary } from "@/lib/ai/conversation-summarizer"

const RESPONDER_SYSTEM_PROMPT = `You are CareerTrack AI, the elite career and job application assistant.
Your mission is to help job seekers land their dream roles through intelligent tracking, resume optimization, interview preparation, and strategic outreach.

Guidelines:
1. When the user's message is a greeting, introduction, or general inquiry, respond warmly, conversationally, and proactively offer assistance with their applications, resume, or job search.
2. If tool actions were executed, seamlessly weave their outcomes into your response. Highlight key metrics, saved applications, or job opportunities clearly with markdown formatting.
3. NEVER output robotic status logs, internal step descriptions, or phrases like "Task acknowledged without external tool execution".
4. STRICT PROHIBITION: NEVER use the Sparkles icon or generic AI filler. Maintain a professional, clean, and empowering tone.
`

export function createResponderNode(model: BaseChatModel) {
  return async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    const { goal, plan, sessionId } = state

    const meaningfulSteps = (plan || []).filter((s) => s.toolName || s.result)
    const hasToolOutcomes = meaningfulSteps.length > 0

    const planSummary = meaningfulSteps
      .map(
        (s) =>
          `- Action "${s.task}": ${s.status}${s.result ? ` -> Outcome: ${JSON.stringify(s.result)}` : ""}${s.error ? ` -> Issue: ${s.error}` : ""}`
      )
      .join("\n")

    const sessionSummary = sessionId ? await getCachedSessionSummary(sessionId).catch(() => null) : null
    const summaryHeader = sessionSummary ? `Prior Conversation Summary:\n${sessionSummary}\n\n` : ""

    let routeContextText = ""
    if (state.routeContext) {
      const { currentRoute, entityType, entityId, entitySummary } = state.routeContext
      routeContextText = `Active Screen Context:\n- Route: ${currentRoute || "Unknown"}`
      if (entityType) routeContextText += `\n- Entity Type: ${entityType}`
      if (entityId) routeContextText += `\n- Entity ID: ${entityId}`
      if (entitySummary) routeContextText += `\n- Entity Details: ${JSON.stringify(entitySummary)}`
      routeContextText += "\n\n"
    }

    const promptText = hasToolOutcomes
      ? `${summaryHeader}${routeContextText}User Request: "${goal}"\n\nExecution Outcomes:\n${planSummary}\n\nPlease synthesize a clear, comprehensive, and proactive response for the user.`
      : `${summaryHeader}${routeContextText}User Message: "${goal}"\n\nPlease provide a direct, natural, and helpful response to the user as their CareerTrack AI assistant.`

    try {
      const response = await model.invoke([
        new SystemMessage(RESPONDER_SYSTEM_PROMPT),
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
      const isGreeting = /^(hi|hello|hey|hey there|hi there|halo|good morning|good afternoon|good evening|sup|yo|assalamu|salaam|kemon acho)[\s!.?]*$/i.test(cleanGoal)

      if (isGreeting || !hasToolOutcomes) {
        const welcomeText =
          "Hello! I am your CareerTrack AI assistant. I'm here to help you track job applications, optimize your resumes, practice interview questions, and discover new opportunities. How can I help you today?"
        return {
          responseContent: welcomeText,
          messages: [new AIMessage(welcomeText)],
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
