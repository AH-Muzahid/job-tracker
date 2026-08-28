import { generateText } from "ai"
import { countMessageTokens, trimToTokenBudget } from "./token-counter"
import { getUserAIConfig } from "./config"
import { getFallbackModelCascade } from "./resilience"

const SUMMARY_SYSTEM_PROMPT = `You are a conversation summarizer. Summarize the following conversation into a concise paragraph that preserves:
- Key decisions made
- Action items and their status
- Important facts or preferences expressed
- Current state of any ongoing task

Be concise but complete. Output only the summary, no preamble.`

/**
 * If conversation exceeds maxTokens, summarize older messages to fit.
 * Always preserves: first message, last 4 messages (untouched), summary of middle.
 */
export async function summarizeConversation(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  userId?: string
): Promise<Array<{ role: string; content: string }>> {
  const totalTokens = countMessageTokens(messages)

  // If within budget, just trim (no summarization needed)
  if (totalTokens <= maxTokens) {
    return trimToTokenBudget(messages, maxTokens)
  }

  // If no userId provided, skip summarization and fall back to trimming
  if (!userId) {
    return trimToTokenBudget(messages, maxTokens)
  }

  // Reserve tokens: summary (~300 tokens) + last 4 messages + first message
  const firstMessages = messages.slice(0, 1) // first message
  const recentMessages = messages.slice(-4) // last 4 messages
  const middleMessages = messages.slice(1, -4) // everything in between

  if (middleMessages.length === 0) {
    return trimToTokenBudget(messages, maxTokens)
  }

  // Calculate budget for summary
  const fixedTokens = countMessageTokens([...firstMessages, ...recentMessages])
  const summaryBudget = Math.min(300, maxTokens - fixedTokens)

  if (summaryBudget < 100) {
    // Not enough room for summary, just trim
    return trimToTokenBudget(messages, maxTokens)
  }

  // Summarize the middle portion
  const middleText = middleMessages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n\n")

  try {
    const config = await getUserAIConfig(userId)
    const cascade = await getFallbackModelCascade(userId)

    if (cascade.length === 0) {
      return trimToTokenBudget(messages, maxTokens)
    }

    const { text: summary } = await generateText({
      model: cascade[0].model,
      system: SUMMARY_SYSTEM_PROMPT,
      prompt: `Summarize this conversation in under ${summaryBudget} tokens:\n\n${middleText.slice(0, 8000)}`,
      maxTokens: summaryBudget,
      temperature: 0.1,
    })

    const summaryMessage = {
      role: "system" as const,
      content: `[Conversation Summary]\n${summary.trim()}`,
    }

    return [...firstMessages, summaryMessage, ...recentMessages]
  } catch {
    // On failure, fall back to simple trimming
    return trimToTokenBudget(messages, maxTokens)
  }
}