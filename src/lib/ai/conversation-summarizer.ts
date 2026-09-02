import { generateText } from "ai"
import { countMessageTokens, trimToTokenBudget } from "./token-counter"
import { getFallbackModelCascade } from "./resilience"
import { getCachedJson, setCachedJson } from "@/lib/redis"
import { inngest } from "@/inngest/client"

export const SUMMARY_SYSTEM_PROMPT = `You are a conversation summarizer for CareerTrack AI. Summarize the following conversation into a concise, high-density overview that preserves:
- Key career goals, target roles, location, and salary expectations
- Specific job applications, companies, and interview statuses discussed
- Key decisions made, resume tailoring insights, and action items
- Current state of any active or ongoing tasks

Be concise, structured, and factual. Output only the summary, no preamble.`

/**
 * Fetch cached conversation summary from Redis (sub-15ms lookup)
 */
export async function getCachedSessionSummary(sessionId: string): Promise<string | null> {
  if (!sessionId) return null
  return getCachedJson<string>(`session:summary:${sessionId}`)
}

/**
 * Cache conversation summary in Redis (TTL default: 7 days)
 */
export async function setCachedSessionSummary(
  sessionId: string,
  summary: string,
  ttlSeconds: number = 7 * 24 * 3600
): Promise<boolean> {
  if (!sessionId || !summary) return false
  return setCachedJson(`session:summary:${sessionId}`, summary, ttlSeconds)
}

/**
 * Non-blocking dispatch to Inngest for asynchronous background conversation summarization.
 */
export async function triggerBackgroundSummarize(
  sessionId: string,
  userId: string,
  force: boolean = false
): Promise<boolean> {
  if (!sessionId || !userId) return false
  try {
    await inngest.send({
      name: "career/chat.summarize",
      data: {
        sessionId,
        userId,
        force,
      },
    })
    return true
  } catch (err) {
    console.warn(`[Inngest Dispatch Warning] Could not trigger summarization for session ${sessionId}:`, err)
    return false
  }
}

export interface OptimizedHistoryOptions {
  sessionId?: string
  userId?: string
  maxTokens?: number
  threshold?: number
  recentCount?: number
}

/**
 * Adaptive Sliding Window & Summary Injection:
 * - If message count <= threshold (default 8): returns recent messages within token budget.
 * - If message count > threshold:
 *     - If cached summary is found: returns [first message, summary message, ...recent 4 messages].
 *     - If cached summary is missing: triggers background summarization event (Inngest) and returns trimmed messages.
 */
export async function buildOptimizedConversationHistory(
  messages: Array<{ role: string; content: string }>,
  options: OptimizedHistoryOptions = {}
): Promise<Array<{ role: string; content: string }>> {
  const {
    sessionId,
    userId,
    maxTokens = 4000,
    threshold = 8,
    recentCount = 4,
  } = options

  if (!messages || messages.length === 0) {
    return []
  }

  // 1. If messages <= threshold, no compression needed
  if (messages.length <= threshold) {
    return trimToTokenBudget(messages, maxTokens)
  }

  // 2. If messages > threshold and we have a sessionId, check cached summary
  if (sessionId) {
    const cachedSummary = await getCachedSessionSummary(sessionId)

    if (cachedSummary && cachedSummary.trim().length > 0) {
      const firstMessage = messages[0]
      const recentMessages = messages.slice(-recentCount)

      const summaryMessage = {
        role: "system" as const,
        content: `[Previous Conversation Context & Summary]\n${cachedSummary.trim()}`,
      }

      // Compose: first message (if not in recent) + summary + recent
      const combined =
        messages.length > recentCount + 1
          ? [firstMessage, summaryMessage, ...recentMessages]
          : [summaryMessage, ...recentMessages]

      return trimToTokenBudget(combined, maxTokens)
    }

    // Cache miss on a long conversation: trigger background summarization asynchronously
    if (userId) {
      void triggerBackgroundSummarize(sessionId, userId)
    }
  }

  // 3. Fallback: summarize or trim synchronously
  return summarizeConversation(messages, maxTokens, userId)
}

/**
 * Synchronous summarizer fallback:
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
    const cascade = await getFallbackModelCascade(userId)

    if (cascade.length === 0) {
      return trimToTokenBudget(messages, maxTokens)
    }

    const { text: summary } = await generateText({
      model: cascade[0].model,
      system: SUMMARY_SYSTEM_PROMPT,
      prompt: `Summarize this conversation in under ${summaryBudget} tokens:\n\n${middleText.slice(0, 8000)}`,
      maxOutputTokens: summaryBudget,
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
