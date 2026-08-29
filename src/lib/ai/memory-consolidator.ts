import { prisma } from "@/lib/prisma"

/**
 * Calculate importance score based on access frequency and recency.
 * Weights: confidence 40%, access frequency 30%, recency 30%.
 */
export function scoreMemory(memory: {
  confidence: number | null
  accessCount: number
  createdAt: Date
  lastAccessedAt: Date | null
}): number {
  const confidence = memory.confidence ?? 1.0
  const accessBoost = Math.min(memory.accessCount / 10, 1.0)
  const recency = memory.lastAccessedAt
    ? Math.max(0, 1 - (Date.now() - memory.lastAccessedAt.getTime()) / (30 * 24 * 60 * 60 * 1000))
    : 0.3

  return confidence * 0.4 + accessBoost * 0.3 + recency * 0.3
}

/**
 * Find memories with similar content that can be merged.
 * Pure function — takes an array, returns merge suggestions (no DB calls).
 */
export function findMergeableMemories(
  memories: Array<{ id: string; content: string; category: string }>
): Array<{ keep: string; merge: string; mergedContent: string }[]> {
  const groups: Array<{ keep: string; merge: string; mergedContent: string }[]> = []
  const used = new Set<string>()

  for (const m1 of memories) {
    if (used.has(m1.id)) continue
    const group: { keep: string; merge: string; mergedContent: string }[] = []

    for (const m2 of memories) {
      if (m1.id === m2.id || used.has(m2.id)) continue
      if (m1.category !== m2.category) continue

      const words1 = new Set(m1.content.toLowerCase().split(/\s+/))
      const words2 = m2.content.toLowerCase().split(/\s+/)
      const overlap = words2.filter((w: string) => words1.has(w)).length / words2.length

      if (overlap > 0.6) {
        group.push({ keep: m1.id, merge: m2.id, mergedContent: m1.content })
        used.add(m2.id)
      }
    }

    if (group.length > 0) {
      used.add(m1.id)
      groups.push(group)
    }
  }

  return groups
}

/**
 * Increment access count and update lastAccessedAt for a memory.
 */
export async function touchMemory(memoryId: string): Promise<void> {
  await prisma.userMemory.update({
    where: { id: memoryId },
    data: {
      accessCount: { increment: 1 },
      lastAccessedAt: new Date(),
    },
  })
}

/**
 * Remove low-scoring memories below threshold.
 * Only prunes memories older than minAgeDays to avoid deleting new ones.
 */
export async function pruneStaleMemories(
  userId: string,
  threshold = 0.2,
  minAgeDays = 90
): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - minAgeDays)

  const memories = await prisma.userMemory.findMany({
    where: { userId, createdAt: { lt: cutoff } },
  })

  const scored = memories.map((m: {
    id: string
    confidence: number | null
    accessCount: number
    createdAt: Date
    lastAccessedAt: Date | null
  }) => ({ ...m, score: scoreMemory(m) }))
  const stale = scored.filter((m: { score: number }) => m.score < threshold)

  if (stale.length === 0) return 0

  await prisma.userMemory.deleteMany({
    where: { id: { in: stale.map((m: { id: string }) => m.id) } },
  })

  return stale.length
}
