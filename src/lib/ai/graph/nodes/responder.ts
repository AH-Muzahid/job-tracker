/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages"
import type { AgentStateType } from "../state"
import type { BaseChatModel } from "@langchain/core/language_models/chat_models"
import { getCachedSessionSummary } from "@/lib/ai/conversation-summarizer"

const RESPONDER_SYSTEM_PROMPT = `You are CareerTrack AI, the elite career and job application assistant.
Review the user's initial goal, the executed plan, and the tool results.
Synthesize a clear, proactive, and concise response in markdown.
Highlight actions performed, current job tracker statuses, and clear next steps.

Never use sparkle icons or generic AI filler. Maintain a professional, clean tone.
`

export function createResponderNode(model: BaseChatModel) {
  return async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    const { goal, plan, sessionId } = state

    const planSummary = (plan || [])
      .map(
        (s) =>
          `- Step "${s.task}": ${s.status}${s.result ? ` -> Result: ${JSON.stringify(s.result)}` : ""}${s.error ? ` -> Error: ${s.error}` : ""}`
      )
      .join("\n")

    const sessionSummary = sessionId ? await getCachedSessionSummary(sessionId).catch(() => null) : null
    const summaryHeader = sessionSummary ? `Prior Conversation Summary:\n${sessionSummary}\n\n` : ""

    try {
      const response = await model.invoke([
        new SystemMessage(RESPONDER_SYSTEM_PROMPT),
        new HumanMessage(
          `${summaryHeader}User Goal: ${goal}\n\nExecution Plan & Outcomes:\n${planSummary}\n\nPlease provide the final response to the user.`
        ),
      ])

      const responseText = String(response.content)

      return {
        responseContent: responseText,
        messages: [new AIMessage(responseText)],
      }
    } catch (_err: any) {
      const fallbackText = `Here is the summary of your request:\n\n${planSummary}`
      return {
        responseContent: fallbackText,
        messages: [new AIMessage(fallbackText)],
      }
    }
  }
}
