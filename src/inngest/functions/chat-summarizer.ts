import { inngest } from "../client"
import { prisma, withDbRetry } from "@/lib/prisma"
import { setCachedJson } from "@/lib/redis"
import { generateText } from "ai"
import { getFallbackModelCascade } from "@/lib/ai/resilience"

export const SUMMARY_SYSTEM_PROMPT = `You are a conversation summarizer for CareerTrack AI.
Summarize the key context of the user's career development and job search discussion into a dense, structured summary.

Preserve:
1. Target job roles, industries, salary expectations, and preferences
2. Specific companies, jobs, applications, and their statuses discussed
3. Resume tailoring points, key skills, and experience highlights mentioned
4. Decisions made, commitments, action items, and next steps
5. Any active tasks or pending user requests

Be concise, factual, and complete. Do not include pleasantries or conversational filler. Output only the summary.`

/**
 * Autonomous Conversation Summarizer & Background Caching
 * Triggered asynchronously when chat messages exceed threshold to avoid slowing down interactive streaming.
 */
export const summarizeChatSessionFunction = inngest.createFunction(
  {
    id: "summarize-chat-session",
    name: "Summarize Chat Session & Background Cache",
    triggers: [
      { event: "career/chat.summarize" },
      { event: "app/chat.summarize" },
    ],
  },
  async ({ event, step }) => {
    const { sessionId, userId, force = false } = event.data as {
      sessionId: string
      userId: string
      force?: boolean
    }

    if (!sessionId || !userId) {
      return { status: "error", message: "Missing sessionId or userId" }
    }

    // Step 1: Fetch session messages from database
    const messages = await step.run("fetch-session-messages", async () => {
      return withDbRetry(() =>
        prisma.chatMessage.findMany({
          where: { sessionId },
          orderBy: { createdAt: "asc" },
          select: { role: true, content: true },
        })
      )
    })

    // Skip if conversation is too short (< 8 turns) unless force is true
    if (messages.length < 8 && !force) {
      return {
        status: "skipped",
        reason: `Message count (${messages.length}) is below threshold of 8`,
      }
    }

    // Preserve the last 4 messages for direct context, summarize everything before them
    const messagesToSummarize = messages.slice(0, -4)
    if (messagesToSummarize.length === 0) {
      return { status: "skipped", reason: "No past messages to summarize" }
    }

    // Step 2: Generate compressed summary using fallback model cascade
    const summaryText = await step.run("generate-summary", async () => {
      const cascade = await getFallbackModelCascade(userId)
      if (!cascade || cascade.length === 0) {
        throw new Error("No AI model available in fallback cascade")
      }

      const formattedTranscript = messagesToSummarize
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n\n")

      const { text } = await generateText({
        model: cascade[0].model,
        system: SUMMARY_SYSTEM_PROMPT,
        prompt: `Please summarize the following conversation history:\n\n${formattedTranscript.slice(0, 10000)}`,
        maxOutputTokens: 500,
        temperature: 0.1,
      })

      return text.trim()
    })

    // Step 3: Cache summary in Redis (TTL: 7 days) and touch session
    await step.run("cache-summary", async () => {
      const cacheKey = `session:summary:${sessionId}`
      await setCachedJson(cacheKey, summaryText, 7 * 24 * 3600)

      // Optionally touch session
      try {
        await withDbRetry(() =>
          prisma.chatSession.update({
            where: { id: sessionId },
            data: {
              updatedAt: new Date(),
            },
          })
        )
      } catch {
        // Safe fallback if session touch fails
      }
    })

    return {
      status: "completed",
      sessionId,
      userId,
      messagesSummarized: messagesToSummarize.length,
      summaryLength: summaryText.length,
    }
  }
)
