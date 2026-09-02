import { encodingForModel } from "js-tiktoken"

const cl100k = encodingForModel("gpt-4o")

/**
 * Count tokens in a plain text string using cl100k_base encoding.
 * Works for OpenAI, Anthropic (approximate), and Google models.
 */
export function countTokens(text: string): number {
  if (!text) return 0
  return cl100k.encode(text).length
}

/**
 * Count tokens across an array of chat messages.
 * Adds ~4 tokens overhead per message for role/formatting.
 */
export function countMessageTokens(
  messages: Array<{ role: string; content: string }>
): number {
  let total = 0
  for (const msg of messages) {
    total += 4 // message framing overhead
    total += countTokens(msg.content)
  }
  return total
}

/**
 * Trim messages to fit within a token budget.
 * Always keeps the first user message and the most recent messages.
 * Returns messages in original order.
 */
export function trimToTokenBudget(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number
): Array<{ role: string; content: string }> {
  if (messages.length === 0) return []

  const total = countMessageTokens(messages)
  if (total <= maxTokens) return [...messages]

  const firstMessage = messages[0]
  const rest = messages.slice(1)

  // Always keep the first message
  let budget = maxTokens - countMessageTokens([firstMessage])
  if (budget <= 0) return [firstMessage]

  // Take from the end (most recent) until budget is exhausted
  const kept: Array<{ role: string; content: string }> = []
  for (let i = rest.length - 1; i >= 0; i--) {
    const msgTokens = countMessageTokens([rest[i]])
    if (budget - msgTokens < 0 && kept.length >= 2) break
    budget -= msgTokens
    kept.unshift(rest[i])
  }

  // If middle messages were trimmed, ensure the trimmed sequence doesn't start with an orphan assistant turn
  if (kept.length < rest.length) {
    while (kept.length > 1 && kept[0].role !== "user" && kept[0].role !== "system") {
      kept.shift()
    }
  }

  return [firstMessage, ...kept]
}
