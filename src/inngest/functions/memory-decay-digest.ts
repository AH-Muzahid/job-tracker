import { inngest } from "../client"
import { prisma, withDbRetry } from "@/lib/prisma"
import { pruneStaleMemories, consolidateUserMemories } from "@/lib/ai/memory-consolidator"

/**
 * Autonomous Weekly Memory Hygiene & Consolidation Agent
 * Runs every Sunday at 03:00 UTC to decay stale memories and merge duplicates.
 */
export const weeklyMemoryHygiene = inngest.createFunction(
  {
    id: "weekly-memory-hygiene",
    name: "Weekly Memory Decay & Consolidation",
    triggers: [
      { cron: "0 3 * * 0" }, // Every Sunday at 03:00 UTC
      { event: "app/memory-hygiene.trigger" },
    ],
  },
  async ({ step }) => {
    const activeUsers = await step.run("fetch-users-for-hygiene", async () => {
      return withDbRetry(() =>
        prisma.user.findMany({
          where: { memories: { some: {} } },
          select: { id: true },
        })
      )
    })

    let totalPruned = 0
    let totalMerged = 0

    for (const user of activeUsers) {
      const result = await step.run(`prune-decay-${user.id}`, async () => {
        const pruned = await pruneStaleMemories(user.id)
        const merged = await consolidateUserMemories(user.id)
        return { pruned, merged }
      })

      totalPruned += result.pruned
      totalMerged += result.merged
    }

    return {
      status: "completed",
      usersProcessed: activeUsers.length,
      totalPruned,
      totalMerged,
    }
  }
)
