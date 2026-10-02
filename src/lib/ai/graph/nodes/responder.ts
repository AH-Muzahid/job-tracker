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
  PLANNING_ERROR_FALLBACK,
} from "../constants"

export function getResponderSystemPrompt(): string {
  return `${getChatPolicyPack()}

You are CareerTrack AI, the elite career operating system copilot.
Your mission is to help job seekers land their dream roles through intelligent tracking, resume optimization, interview preparation, and strategic outreach.

CRITICAL CONVERSATIONAL & EXECUTION RULES:
1. Conversational Greetings & Casual Chat:
   - When the user's message is a greeting (e.g., "hi", "hello", "hey", "assalamu alaikum"), reply warmly and naturally.
   - Offer 2-3 specific ways you can assist them right now.
   - STRICT AMBIENT CONTEXT GUARDRAIL: Even if Active Screen Context contains a job, opportunity, or application, NEVER unilaterally launch into an unprompted mock interview, quiz, or unsolicited evaluation on a casual greeting! You may gently acknowledge what they are currently viewing (e.g., "I see you're viewing the [Job Title] role at [Company]. Would you like me to analyze the requirements, check your resume alignment, or practice interview questions?"), but DO NOT start asking interview questions or grading without user request.
2. Tool Execution Outcomes:
   - If tools were executed, synthesize their outcomes following Rule 6 (Action -> Outcome -> Insight -> Next Steps).
   - Highlight key metrics and application records clearly with markdown formatting.
3. Strict Log Prohibition (Rule 6):
   - NEVER output internal step logs, execution status codes, plan IDs, or robotic phrases like "Step: completed" or "Task acknowledged without external tool execution".
4. Iconography & Design Rules:
   - STRICT PROHIBITION: NEVER use the Sparkles icon anywhere.
   - Maintain a clean, professional, Stripe/Linear standard tone.
5. Multilingual Fluency:
   - Seamlessly match the user's language (English, Bangla, or mixed Banglish).
`
}

export function getConversationalPrompt(sessionSummary?: string | null): string {
  let prompt = `You are CareerTrack AI, a professional career copilot.
CRITICAL CONVERSATIONAL RULES:
1. Respond concisely, naturally, and warmly in 1-3 brief sentences.
2. NEVER re-generate full application templates, cover letters, mock interview transcripts, or large summaries unless explicitly requested by the user.
3. If the user asks why something was missing or not identified (e.g. Recipient Email, Contact Person, Salary range, or Link), answer directly: explain that the original posting/context did not publish or include that detail, and provide a 1-sentence tip on how they can find or add it (e.g. from the company LinkedIn or careers page).
4. If the user asks to refine or adjust a previous output (e.g. "make it shorter", "more formal"), provide ONLY the updated text concisely.
5. On greetings or casual chat, simply greet the user warmly and ask how you can help. Do not output unsolicited lists of sample prompts.
6. Match the user's language seamlessly (English, Bangla, or mixed Banglish).`

  if (sessionSummary?.trim()) {
    prompt += `\n\n[Active Session Background Context]\n${sessionSummary.trim().slice(0, 1500)}`
  }

  return prompt
}

export function createResponderNode(
  model: BaseChatModel,
  onToken?: (delta: string) => void
) {
  return async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    const { goal, plan, sessionId } = state

    // Only short-circuit if planner explicitly emitted an error fallback
    const isExplicitError =
      state.responseContent === PLANNING_ERROR_FALLBACK ||
      /could not understand|error|unable to process/i.test(state.responseContent || "")
    if (isExplicitError && (!plan || plan.length === 0)) {
      if (onToken && state.responseContent) {
        onToken(state.responseContent)
      }
      return {
        responseContent: state.responseContent,
        messages: [new AIMessage(state.responseContent || "")],
      }
    }

    // Filter strictly to valid tool execution steps with real outputs
    const meaningfulSteps = (plan || []).filter(
      (s) => Boolean(s.toolName && s.toolName !== "null" && s.status === "completed" && s.result)
    )
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
      const { currentRoute, entityType, entityId, entitySummary, metadata } = state.routeContext as any
      const sanitizedSummary = entitySummary ? sanitizeUntrustedContext(JSON.stringify(entitySummary)) : ""

      routeContextText = `Active Screen Context:\n- Route: ${currentRoute || "Unknown"}`
      if (entityType) routeContextText += `\n- Entity Type: ${entityType}`
      if (entityId) routeContextText += `\n- Entity ID: ${entityId}`
      if (metadata?.candidate) {
        routeContextText += `\n- Candidate Background: ${sanitizeUntrustedContext(metadata.candidate)}`
      }
      if (sanitizedSummary) {
        routeContextText += `\n- Entity Details:\n<untrusted_content>\n${sanitizedSummary}\n</untrusted_content>`
      }
      routeContextText += "\n\n"
    }

    // Guardrail: For simple greetings, do NOT inject active screen context so the bot doesn't stalk the current page or push unsolicited suggestions
    const isCasualGreeting =
      !hasToolOutcomes &&
      Boolean(goal) &&
      goal.trim().length <= 30 &&
      /^(hi|hello|hey|yo|sup|good\s*(morning|afternoon|evening)|assalamu|salaam|kemon|hola)[\s!.?]*$/i.test(goal.trim())

    const contextualScreenText = isCasualGreeting ? "" : routeContextText

    const systemPrompt = hasToolOutcomes
      ? getResponderSystemPrompt()
      : getConversationalPrompt(isCasualGreeting ? null : sessionSummary)

    let messagesToSend: any[] = []

    if (hasToolOutcomes) {
      const promptText = `${summaryHeader}${routeContextText}User Request: "${goal}"\n\nExecution Outcomes:\n${planSummary}\n\nPlease synthesize a clear, comprehensive, and proactive response for the user.`
      messagesToSend = [
        new SystemMessage(systemPrompt),
        new HumanMessage(promptText),
      ]
    } else {
      // Conversational turn: Pass system prompt and real conversation turns (up to last 6)
      const validHistory = (state.messages || []).filter(
        (m) => m._getType() === "human" || m._getType() === "ai" || (m as any).role === "user" || (m as any).role === "assistant"
      )
      const recentTurns = validHistory.slice(-6)

      if (recentTurns.length > 0) {
        messagesToSend = [
          new SystemMessage(systemPrompt),
          ...recentTurns,
        ]
      } else {
        const promptText = `${contextualScreenText}User Message: "${goal}"`
        messagesToSend = [
          new SystemMessage(systemPrompt),
          new HumanMessage(promptText),
        ]
      }
    }

    try {
      let responseText = ""

      if (onToken) {
        const stream = await model.stream(messagesToSend)

        for await (const chunk of stream) {
          let delta = ""
          if (typeof chunk.content === "string") {
            delta = chunk.content
          } else if (Array.isArray(chunk.content)) {
            delta = chunk.content
              .map((c) => (typeof c === "string" ? c : (c as any)?.text || ""))
              .join("")
          }
          if (delta) {
            responseText += delta
            onToken(delta)
          }
        }
      }

      if (!responseText.trim() && typeof model.invoke === "function") {
        const response = await model.invoke(messagesToSend)
        responseText = String(response?.content || "")
        if (onToken && responseText) {
          onToken(responseText)
        }
      }

      if (!responseText.trim()) {
        const cleanGoal = (goal || "").trim().toLowerCase()
        const isGreeting = GREETING_REGEX.test(cleanGoal)
        if (isGreeting || !hasToolOutcomes) {
          responseText = FALLBACK_GREETING_MESSAGE
        } else {
          const readableSummary = meaningfulSteps
            .map((s) => `• **${s.task}**: ${s.status === "completed" ? "Completed successfully" : s.error || "Processed"}`)
            .join("\n")
          responseText = `I have processed your request:\n\n${readableSummary}\n\nHow would you like to proceed next?`
        }
        if (onToken && responseText) {
          onToken(responseText)
        }
      }

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
        if (onToken) onToken(FALLBACK_GREETING_MESSAGE)
        return {
          responseContent: FALLBACK_GREETING_MESSAGE,
          messages: [new AIMessage(FALLBACK_GREETING_MESSAGE)],
        }
      }

      const readableSummary = meaningfulSteps
        .map((s) => `• **${s.task}**: ${s.status === "completed" ? "Completed successfully" : s.error || "Processed"}`)
        .join("\n")

      const fallbackText = `I have processed your request:\n\n${readableSummary}\n\nHow would you like to proceed next?`
      if (onToken) onToken(fallbackText)
      return {
        responseContent: fallbackText,
        messages: [new AIMessage(fallbackText)],
      }
    }
  }
}
