import { inngest } from "../client"
import { prisma, withDbRetry } from "@/lib/prisma"
import { generateCareerBriefing } from "@/lib/ai/briefing"
import { sendEmail, formatOutreachEmailHtml, resolveBriefingContent } from "@/lib/email"

/**
 * Weekly Goal Digest & Accountability Agent with LangGraph & Inngest
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
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      currentWeekStart.setDate(diff)
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
              select: { id: true, name: true, email: true, profile: { select: { notifyEmail: true } } },
            },
          },
        })
      )
    })

    const results = []

    for (const goal of goalsToReview) {
      const reviewResult = await step.run(`review-goal-${goal.id}`, async () => {
        const [applicationsCreatedThisWeek, interviewsMovedThisWeek, offersReceived] = await Promise.all([
          prisma.application.count({
            where: {
              userId: goal.userId,
              createdAt: { gte: goal.weekStart },
            },
          }),
          prisma.statusChange.count({
            where: {
              application: { userId: goal.userId },
              toStatus: "Interview",
              changedAt: { gte: goal.weekStart },
            },
          }),
          prisma.statusChange.count({
            where: {
              application: { userId: goal.userId },
              toStatus: "Offer",
              changedAt: { gte: goal.weekStart },
            },
          }),
        ])

        const goalSummary = `
Primary Goal: "${goal.goal1}" (Target: ${goal.goal1Target || "N/A"}, Progress: ${goal.goal1Progress || 0}, Status: ${goal.goal1Status})
${goal.goal2 ? `Secondary Goal: "${goal.goal2}" (Target: ${goal.goal2Target || "N/A"}, Progress: ${goal.goal2Progress || 0}, Status: ${goal.goal2Status})` : ""}
${goal.goal3 ? `Tertiary Goal: "${goal.goal3}" (Target: ${goal.goal3Target || "N/A"}, Progress: ${goal.goal3Progress || 0}, Status: ${goal.goal3Status})` : ""}
New Applications Logged: ${applicationsCreatedThisWeek}
Interviews Secured: ${interviewsMovedThisWeek}
Offers Received: ${offersReceived}
User Blockers: ${goal.blockers || "None reported"}
        `.trim()

        const taskPrompt = `You are CareerTrack Executive Career Coach.
Review the weekly retrospective metrics for ${goal.user.name || "the candidate"}:

${goalSummary}

Synthesize a motivating, high-impact weekly retrospective:
1. Wins & Momentum (celebrate metrics)
2. Gap & Velocity Analysis (how target matched output)
3. 3 Strategic Focus Priorities for next week.`

        const evaluation = await generateCareerBriefing(goal.userId, taskPrompt)
        const digestContent = resolveBriefingContent(evaluation,
          `**Your weekly progress**\n- Applications logged: ${applicationsCreatedThisWeek}\n- Interviews: ${interviewsMovedThisWeek}\n- Offers: ${offersReceived}\n\nReview your weekly goals, update progress, and choose your next priority.`,
        )

        // Save in-app Notification
        await withDbRetry(() =>
          prisma.notification.create({
            data: {
              userId: goal.userId,
              title: `Weekly Retrospective: ${goal.goal1Status === "Achieved" ? "Goals Achieved! 🎉" : "Progress & Strategy Review"}`,
              message: digestContent,
              type: "WEEKLY_DIGEST",
              link: "/weekly-goals",
            },
          })
        )

        // Email Dispatch via Resend

        return {
          userId: goal.userId,
          goalId: goal.id,
          goal1: goal.goal1,
          applicationsCreated: applicationsCreatedThisWeek,
          interviewsSecured: interviewsMovedThisWeek,
          offersReceived,
          digestGenerated: true,
          digestContent,
        }
      })

      if (goal.user.email && goal.user.profile?.notifyEmail !== false) {
        await step.run(`email-goal-${goal.id}`, async () => {
          const sent = await sendEmail({
            to: goal.user.email!,
            subject: "CareerTrack: Your Weekly Goal Retrospective & Strategy Digest",
            html: formatOutreachEmailHtml({ candidateName: goal.user.name || undefined, bodyText: reviewResult.digestContent }),
            idempotencyKey: `weekly-digest/${event.id}/${goal.id}`,
          })
          if (!sent.success) throw new Error("Weekly digest email delivery failed")
          return sent
        })
      }

      results.push(reviewResult)
    }

    return {
      reviewedCount: goalsToReview.length,
      results,
    }
  }
)
