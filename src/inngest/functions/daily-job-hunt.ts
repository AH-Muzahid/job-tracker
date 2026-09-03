import { inngest } from "../client"
import { prisma, withDbRetry } from "@/lib/prisma"
import { runHeadlessEvaluation } from "@/lib/ai/graph/headless"
import { sendEmail, formatOutreachEmailHtml } from "@/lib/email"

/**
 * 1. Master Fan-out Dispatcher (Cron Triggered / Event Triggered)
 * Chunks active users into batches of 50 and fans out parallel batch processing events.
 */
export const dailyJobHuntScheduler = inngest.createFunction(
  {
    id: "daily-job-hunt-scheduler",
    name: "Daily Job Hunt Scheduler",
    triggers: [
      { cron: "0 9 * * 1-5" }, // Every Mon-Fri at 9 AM UTC
      { event: "app/job-hunt.trigger" },
    ],
  },
  async ({ step, event }) => {
    const userBatches = await step.run("fetch-active-user-ids", async () => {
      const targetUserId = event?.data && "userId" in event.data ? (event.data as { userId?: string }).userId : undefined

      if (targetUserId) {
        return [{ userIds: [targetUserId] }]
      }

      const users = await withDbRetry(() =>
        prisma.user.findMany({
          where: {
            OR: [
              { applications: { some: {} } },
              { profile: { isNot: null } },
            ],
          },
          select: { id: true },
        })
      )

      const batchSize = 50
      const batches: Array<{ userIds: string[] }> = []
      for (let i = 0; i < users.length; i += batchSize) {
        batches.push({ userIds: users.slice(i, i + batchSize).map((u) => u.id) })
      }
      return batches
    })

    for (let i = 0; i < userBatches.length; i++) {
      await step.sendEvent(`fanout-batch-${i}`, {
        name: "career/batch.audit.process",
        data: { userIds: userBatches[i].userIds },
      })
    }

    return { totalBatches: userBatches.length, totalUsers: userBatches.reduce((acc, b) => acc + b.userIds.length, 0) }
  }
)

/**
 * 2. Parallel Worker for Single Batch
 * Processes stale application audits and dispatches AI briefings for users in a batch.
 */
export const processUserAuditBatch = inngest.createFunction(
  {
    id: "process-user-audit-batch",
    name: "Process User Audit Batch",
    triggers: [{ event: "career/batch.audit.process" }],
  },
  async ({ event, step }) => {
    const { userIds } = event.data as { userIds: string[] }
    if (!userIds || !Array.isArray(userIds)) {
      return { processed: 0, skipped: true }
    }

    for (const userId of userIds) {
      await step.run(`audit-user-${userId}`, async () => {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const [user, appliedCount, staleApps] = await Promise.all([
          withDbRetry(() =>
            prisma.user.findUnique({
              where: { id: userId },
              select: { id: true, name: true, email: true },
            })
          ),
          withDbRetry(() =>
            prisma.application.count({
              where: { userId, status: "Applied" },
            })
          ),
          withDbRetry(() =>
            prisma.application.findMany({
              where: {
                userId,
                status: { in: ["Applied", "Interview"] },
                updatedAt: { lte: sevenDaysAgo },
              },
              include: { company: true },
              take: 5,
            })
          ),
        ])

        if (!user) return { skipped: true, reason: "User not found" }
        if (staleApps.length === 0 && appliedCount === 0) return { skipped: true, reason: "No active or stale applications" }

        const staleSummary = staleApps
          .map((app) => `- ${app.jobTitle} at ${app.company?.name || app.companyName} (${app.status})`)
          .join("\n")

        const taskPrompt = `Generate a concise, proactive daily career briefing for ${user.name || "the candidate"}.
Current Pipeline: ${appliedCount} active applications.
Stale applications needing follow-up:
${staleSummary || "None currently stale."}

Provide 2-3 specific, actionable recommendations (e.g. personalized follow-up messages or target applications).`

        const evaluation = await runHeadlessEvaluation(userId, taskPrompt)
        const aiBriefing = evaluation.content

        // Create in-app notification
        await withDbRetry(() =>
          prisma.notification.create({
            data: {
              userId,
              title: staleApps.length > 0 ? "Action Required: Stale Applications Follow-up" : "Daily Career Pipeline Briefing",
              message: aiBriefing,
              type: staleApps.length > 0 ? "FOLLOW_UP" : "DAILY_HUNT",
              link: "/applications",
            },
          })
        )

        // Send Email if user has an email address
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
            console.warn(`[Daily Briefing Email Error] User ${userId}:`, emailErr)
          }
        }

        return {
          userId,
          appliedCount,
          pendingFollowUps: staleApps.length,
          notificationCreated: true,
        }
      })
    }

    return { processed: userIds.length }
  }
)

/**
 * Backward-compatible alias
 */
export const dailyJobHuntFunction = dailyJobHuntScheduler
