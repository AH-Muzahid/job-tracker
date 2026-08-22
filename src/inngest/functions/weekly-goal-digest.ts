import { inngest } from "../client"
import { prisma, withDbRetry } from "@/lib/prisma"

/**
 * Weekly Goal Digest & Accountability Agent
 * Runs every Sunday at 20:00 UTC to review progress and prepare next week
 */
export const weeklyGoalDigestFunction = inngest.createFunction(
  {
    id: "weekly-goal-digest-agent",
    name: "Weekly Goal Digest & Progress Review",
    triggers: [
      { cron: "0 20 * * 0" }, // Every Sunday 8 PM UTC
      { event: "app/weekly-goals.review" },
    ],
  },
  async ({ step, event }) => {
    const goalsToReview = await step.run("fetch-active-weekly-goals", async () => {
      const now = new Date()
      const currentWeekStart = new Date(now)
      currentWeekStart.setDate(now.getDate() - now.getDay() + 1)
      currentWeekStart.setHours(0, 0, 0, 0)

      const whereClause: { weekStart: Date; userId?: string } = { weekStart: currentWeekStart }
      const targetUserId = event?.data && "userId" in event.data ? (event.data as { userId?: string }).userId : undefined
      if (targetUserId) {
        whereClause.userId = targetUserId
      }

      return withDbRetry(() =>
        prisma.weeklyGoal.findMany({
          where: whereClause,
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        })
      )
    })

    const results = []

    for (const goal of goalsToReview) {
      const reviewResult = await step.run(`review-goal-${goal.id}`, async () => {
        const applicationsCreatedThisWeek = await prisma.application.count({
          where: {
            userId: goal.userId,
            createdAt: { gte: goal.weekStart },
          },
        })

        const interviewsMovedThisWeek = await prisma.statusChange.count({
          where: {
            application: { userId: goal.userId },
            toStatus: "Interview",
            changedAt: { gte: goal.weekStart },
          },
        })

        return {
          userId: goal.userId,
          goalId: goal.id,
          goal1: goal.goal1,
          applicationsCreated: applicationsCreatedThisWeek,
          interviewsSecured: interviewsMovedThisWeek,
        }
      })

      results.push(reviewResult)
    }

    return {
      reviewedCount: goalsToReview.length,
      results,
    }
  }
)
