import { inngest } from "../client"
import { prisma, withDbRetry } from "@/lib/prisma"
import { runHeadlessEvaluation } from "@/lib/ai/graph/headless"
import {
  sendEmail,
  formatDailyOpportunityDigestHtml,
  type DailyDigestJobItem,
} from "@/lib/email"
import { detectEmploymentType } from "@/lib/discovery/matching"

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
 * Processes stale application audits and dispatches AI briefings with top opportunities for users in a batch (REC-11).
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

        const [user, appliedCount, staleApps, topMatches] = await Promise.all([
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
          withDbRetry(async () => {
            if (!prisma.userJobMatch?.findMany) return []
            return await prisma.userJobMatch.findMany({
              where: {
                userId,
                status: "PUBLISHED",
                fitScore: { gte: 75 },
                job: { isExpired: false },
              },
              include: {
                job: {
                  select: {
                    id: true,
                    title: true,
                    company: true,
                    location: true,
                    salary: true,
                    url: true,
                    tags: true,
                  },
                },
              },
              orderBy: { fitScore: "desc" },
              take: 5,
            })
          }).catch(() => []),
        ])

        if (!user) return { skipped: true, reason: "User not found" }
        const hasTopMatches = topMatches && topMatches.length > 0
        if (staleApps.length === 0 && appliedCount === 0 && !hasTopMatches) {
          return { skipped: true, reason: "No active or stale applications and no new opportunities" }
        }

        const staleSummary = staleApps
          .map((app) => `- ${app.jobTitle} at ${app.company?.name || app.companyName} (${app.status})`)
          .join("\n")

        const opportunitiesSummary = (topMatches || [])
          .map(
            (m: any) =>
              `- ${m.job.title} at ${m.job.company} (${Math.round(m.fitScore)}% match, ${m.job.location || "Remote"}${m.job.salary ? `, ${m.job.salary}` : ""})`
          )
          .join("\n")

        const taskPrompt = `Generate a concise, proactive daily career briefing for ${user.name || "the candidate"}.
Current Pipeline: ${appliedCount} active applications.
${staleApps.length > 0 ? `Stale applications needing follow-up:\n${staleSummary}` : "No stale applications needing immediate follow-up."}
${hasTopMatches ? `Top high-fit job opportunities discovered today (>=75% match):\n${opportunitiesSummary}` : "No new job opportunities discovered in this cycle."}

Provide 2-3 specific, actionable recommendations prioritizing highest-impact moves (e.g. applying to top matched jobs or following up on stale applications).`

        const evaluation = await runHeadlessEvaluation(userId, taskPrompt)
        const aiBriefing = evaluation.content

        const notifTitle =
          hasTopMatches && staleApps.length > 0
            ? `Daily Briefing: ${topMatches.length} Top Matches & Stale Follow-ups`
            : hasTopMatches
            ? `Daily Briefing: ${topMatches.length} High-Fit Jobs Discovered`
            : staleApps.length > 0
            ? "Action Required: Stale Applications Follow-up"
            : "Daily Career Pipeline Briefing"

        const notifType = staleApps.length > 0 ? "FOLLOW_UP" : "DAILY_HUNT"

        // Create in-app notification
        await withDbRetry(() =>
          prisma.notification.create({
            data: {
              userId,
              title: notifTitle,
              message: aiBriefing,
              type: notifType,
              link: hasTopMatches ? "/discovery" : "/applications",
            },
          })
        )

        // Send Email if user has an email address
        if (user.email) {
          try {
            const formatEmploymentType = (type?: string) => {
              if (!type) return undefined
              if (type === "intern") return "Intern"
              if (type === "contract") return "Contract"
              if (type === "part-time") return "Part-time"
              return "Full-time"
            }

            const opportunities: DailyDigestJobItem[] = (topMatches || []).map((m: any) => ({
              id: m.job.id,
              title: m.job.title,
              company: m.job.company,
              location: m.job.location || undefined,
              salary: m.job.salary || undefined,
              matchScore: Math.round(m.fitScore),
              url: m.job.url || undefined,
              employmentType: formatEmploymentType(
                detectEmploymentType({
                  title: m.job.title,
                  tags: m.job.tags,
                })
              ),
            }))

            const emailHtml = formatDailyOpportunityDigestHtml({
              candidateName: user.name || undefined,
              briefingText: aiBriefing,
              opportunities,
              staleApplicationsCount: staleApps.length,
              activeApplicationsCount: appliedCount,
            })

            let emailSubject = "CareerTrack: Your Daily Job Hunt Briefing"
            if (opportunities.length > 0 && staleApps.length > 0) {
              emailSubject = `CareerTrack: ${opportunities.length} New Matches & Follow-up Reminders`
            } else if (opportunities.length > 0) {
              emailSubject = `CareerTrack: ${opportunities.length} New High-Fit Opportunities for You`
            } else if (staleApps.length > 0) {
              emailSubject = "CareerTrack: Follow-up Reminders on Active Applications"
            }

            await sendEmail({
              to: user.email,
              subject: emailSubject,
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
          topOpportunitiesCount: (topMatches || []).length,
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
