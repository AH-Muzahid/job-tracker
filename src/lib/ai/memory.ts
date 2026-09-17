/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma, withDbRetry } from "@/lib/prisma"
import { invalidateCache } from "@/lib/redis"

export interface KnowledgeGapInput {
  id?: string
  topic?: string
  type?: string
  severity?: string
  questionAsked?: string
  candidateAnswerSummary?: string
  weaknessReason?: string
  idealAnswer?: string
  keyTakeaways?: string[]
  followUpPracticePrompt?: string
}

export interface InterviewMetadata {
  targetRole?: string
  targetCompany?: string
  roundType?: string
}

export interface WeaknessMemory {
  id: string
  userId: string
  category: string
  content: string
  source?: string | null
  confidence?: number | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Persists knowledge gaps from an interview debrief report into UserMemory
 * with category 'weakness' and source 'interview'.
 */
export async function persistInterviewWeaknesses(
  userId: string,
  gaps: KnowledgeGapInput[],
  metadata?: InterviewMetadata
): Promise<number> {
  if (!userId || !Array.isArray(gaps) || gaps.length === 0) return 0

  let insertedCount = 0

  // Fetch existing weaknesses for this user to avoid duplicate insertion
  const existingMemories = await withDbRetry<Array<{ id: string; content: string }>>(() =>
    prisma.userMemory.findMany({
      where: {
        userId,
        category: "weakness",
      },
      select: {
        id: true,
        content: true,
      },
      take: 50,
      orderBy: { createdAt: "desc" },
    })
  ).catch(() => [])

  const existingContentLower = new Set(
    (existingMemories || []).map((m: { content: string }) => m.content.toLowerCase())
  )

  for (const gap of gaps) {
    const topic = (gap.topic || "General").trim()
    const reason = (gap.weaknessReason || gap.candidateAnswerSummary || "").trim()
    if (!topic && !reason) continue

    const severity = gap.severity?.toLowerCase()
    const confidence = severity === "high" ? 0.95 : severity === "medium" ? 0.8 : 0.65

    // Build structured content description
    const companyContext = metadata?.targetCompany ? ` at ${metadata.targetCompany}` : ""
    const roleContext = metadata?.targetRole ? ` for ${metadata.targetRole}` : ""
    const roundContext = metadata?.roundType ? ` [${metadata.roundType}]` : ""

    let content = `[Weakness: ${topic}]${roundContext}${companyContext}${roleContext}: ${reason}`
    if (gap.questionAsked) {
      content += ` (Triggered by question: "${gap.questionAsked.slice(0, 120)}")`
    }
    if (gap.followUpPracticePrompt) {
      content += ` [Follow-up Practice: "${gap.followUpPracticePrompt.slice(0, 120)}"]`
    }

    // Check if duplicate
    if (existingContentLower.has(content.toLowerCase())) {
      continue
    }

    try {
      await withDbRetry(() =>
        prisma.userMemory.create({
          data: {
            userId,
            category: "weakness",
            content,
            source: "interview",
            confidence,
          },
        })
      )
      existingContentLower.add(content.toLowerCase())
      insertedCount++
    } catch (createErr) {
      console.warn("[persistInterviewWeaknesses] Failed to save memory:", createErr)
    }
  }

  if (insertedCount > 0) {
    try {
      await invalidateCache(`user:memories:${userId}`)
    } catch {
      // Non-fatal if redis fails
    }
  }

  return insertedCount
}

/**
 * Retrieves past interview weaknesses for a user.
 */
export async function getUserWeaknesses(
  userId: string,
  limit: number = 5
): Promise<WeaknessMemory[]> {
  if (!userId) return []

  try {
    const weaknesses = await withDbRetry<WeaknessMemory[]>(() =>
      prisma.userMemory.findMany({
        where: {
          userId,
          category: "weakness",
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      })
    )
    return weaknesses || []
  } catch (err) {
    console.warn("[getUserWeaknesses] Error fetching weaknesses:", err)
    return []
  }
}

/**
 * Formats a list of weakness memories into a concise prompt string for probing in follow-up interviews.
 */
export function formatWeaknessProbingContext(weaknesses: WeaknessMemory[]): string {
  if (!weaknesses || weaknesses.length === 0) return ""

  const items = weaknesses
    .map((w, i) => `${i + 1}. ${w.content}`)
    .join("\n")

  return `PREVIOUS INTERVIEW WEAKNESSES IDENTIFIED FOR THIS CANDIDATE:
${items}

INSTRUCTION: Probe the candidate on one of these areas to verify if they have improved their skills or learned from past mistakes.`
}

/**
 * Builds a specific system prompt directive for Turn 3 active weakness probing.
 */
export function buildWeaknessProbingInstruction(weaknessContent: string): string {
  if (!weaknessContent || !weaknessContent.trim()) return ""

  return `## TARGETED WEAKNESS PROBING (STAGE 3 PERSONALIZATION):
The candidate previously had an identified weakness or growth area in a prior interview session:
"${weaknessContent.trim()}"

PROBING DIRECTIVE FOR THIS QUESTION:
- Acknowledge their previous answer in 2-3 words.
- Actively probe or challenge the candidate around this known weakness area to test whether they have improved.
- Seamlessly weave this challenge into the current conversation (e.g., "In your last session, you touched on this topic, but let's test how you'd handle...").`
}

