/* eslint-disable @typescript-eslint/no-explicit-any */
import { inngest } from "../client"
import { prisma, withDbRetry } from "@/lib/prisma"
import { runHeadlessEvaluation } from "@/lib/ai/graph/headless"
import { sendEmail, formatOutreachEmailHtml } from "@/lib/email"

/**
 * Autonomous Daily Job Search & Briefing Agent with LangGraph & Inngest
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
    // Step 1: Query users with active profiles or applications
    const users = await step.run("fetch-active-users", async () => {
      const targetUserId = event?.data && "userId" in event.data ? (event.data as { userId?: string }).userId : undefined
      if (targetUserId) {
        return withDbRetry(() =>
          prisma.user.findMany({
            where: { id: targetUserId },
            select: { id: true, name: true, email: true },
          })
        )
      }
      return withDbRetry(() =>
        prisma.user.findMany({
          where: {
            OR: [
              { profile: { isNot: null } },
              { applications: { some: {} } },
            ],
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

    const summaries: Array<{
      userId: string
      appliedCount: number
      pendingFollowUps: number
      notificationCreated: boolean
    }> = []

    for (const user of users) {
      const summary = await step.run(`process-user-briefing-${user.id}`, async () => {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const [appliedCount, staleApps] = await Promise.all([
          prisma.application.count({
            where: { userId: user.id, status: "Applied" },
          }),
          prisma.application.findMany({
            where: {
              userId: user.id,
              status: { in: ["Applied", "Interview"] },
              updatedAt: { lte: sevenDaysAgo },
            },
            select: { id: true, companyName: true, jobTitle: true, status: true, updatedAt: true },
            take: 5,
          }),
        ])

        let aiBriefing = ""
        let notificationCreated = false

        if (staleApps.length > 0 || appliedCount > 0) {
          const staleSummary = staleApps
            .map((app) => `- ${app.jobTitle} at ${app.companyName} (${app.status}, last updated: ${app.updatedAt.toISOString().slice(0, 10)})`)
            .join("\n")

          const taskPrompt = `Generate a concise, proactive daily career briefing for ${user.name || "the candidate"}.
Current Pipeline: ${appliedCount} active applications.
Stale applications needing follow-up:
${staleSummary || "None currently stale."}

Provide 2-3 specific, actionable recommendations (e.g. personalized follow-up messages or target applications).`

          const evaluation = await runHeadlessEvaluation(user.id, taskPrompt)
          aiBriefing = evaluation.content

          // Save in-app Notification record
          await withDbRetry(() =>
            prisma.notification.create({
              data: {
                userId: user.id,
                title: staleApps.length > 0 ? "Action Required: Stale Applications Follow-up" : "Daily Career Pipeline Briefing",
                message: aiBriefing,
                type: staleApps.length > 0 ? "FOLLOW_UP" : "DAILY_HUNT",
                link: "/applications",
              },
            })
          )
          notificationCreated = true

          // Send Email if user email is present
          if (user.email) {
            try {
              const emailHtml = formatOutreachEmailHtml({
                candidateName: user.name || undefined,
                bodyText: aiBriefing,
                companyName: "CareerTrack Daily Briefing",
              })
              await sendEmail({
                to: user.email,
                subject: staleApps.length > 0 ? "CareerTrack: Follow-up Reminders on Active Applications" : "CareerTrack: Your Daily Job Hunt Briefing",
                html: emailHtml,
              })
            } catch (emailErr) {
              console.warn(`[Daily Briefing Email Error] User ${user.id}:`, emailErr)
            }
          }
        }

        return {
          userId: user.id,
          appliedCount,
          pendingFollowUps: staleApps.length,
          notificationCreated,
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
