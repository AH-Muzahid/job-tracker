import { inngest } from "../client"
import { prisma, withDbRetry } from "@/lib/prisma"

/**
 * Autonomous Daily Job Search & Briefing Agent
 * Runs every weekday morning at 09:00 UTC (or triggered on demand via event)
 */
export const dailyJobHuntFunction = inngest.createFunction(
  {
    id: "daily-job-hunt-agent",
    name: "Daily Autonomous Job Hunt Briefing",
    triggers: [
      { cron: "0 9 * * 1-5" }, // Every Mon-Fri at 9 AM UTC
      { event: "app/job-hunt.trigger" },
    ],
  },
  async ({ step, event }) => {
    // Step 1: Query users with active profiles
    const users = await step.run("fetch-active-users", async () => {
      const targetUserId = event?.data && "userId" in event.data ? (event.data as { userId?: string }).userId : undefined
      if (targetUserId) {
        return [{ id: targetUserId }]
      }
      return withDbRetry(() =>
        prisma.user.findMany({
          where: {
            profile: { isNot: null },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
          take: 50,
        })
      )
    })

    const summaries: Array<{ userId: string; appliedCount: number; pendingFollowUps: number }> = []

    for (const user of users) {
      const summary = await step.run(`process-user-${user.id}`, async () => {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const [appliedApps, staleApps] = await Promise.all([
          prisma.application.count({
            where: { userId: user.id, status: "Applied" },
          }),
          prisma.application.findMany({
            where: {
              userId: user.id,
              status: "Applied",
              updatedAt: { lte: sevenDaysAgo },
            },
            select: { id: true, companyName: true, jobTitle: true, updatedAt: true },
            take: 5,
          }),
        ])

        return {
          userId: user.id,
          appliedCount: appliedApps,
          pendingFollowUps: staleApps.length,
          staleApplications: staleApps,
        }
      })

      summaries.push(summary)
    }

    return {
      success: true,
      processedUsers: users.length,
      summaries,
    }
  }
)
