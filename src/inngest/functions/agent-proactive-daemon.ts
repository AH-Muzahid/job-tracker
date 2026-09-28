/* eslint-disable @typescript-eslint/no-explicit-any */
import { inngest } from "../client"
import { prisma, withDbRetry } from "@/lib/prisma"

export interface ProactiveProcessResult {
  staleProcessed: number
  skippedAlreadyDrafted: number
}

/**
 * Autonomously inspects a user's applied applications, identifies stale positions (> 7 days without response),
 * drafts high-converting follow-up pitches, and creates actionable in-app notifications.
 */
export async function processProactiveFollowUpsForUser(userId: string): Promise<ProactiveProcessResult> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const staleApplications = await withDbRetry<any[]>(() =>
    prisma.application.findMany({
      where: {
        userId,
        status: "Applied",
        OR: [
          { applicationDate: { lte: sevenDaysAgo } },
          { updatedAt: { lte: sevenDaysAgo } },
        ],
      },
      include: {
        analysis: true,
      },
      take: 10,
    })
  )

  let staleProcessed = 0
  let skippedAlreadyDrafted = 0

  for (const app of staleApplications) {
    const analysis = app.analysis
    const existingResumeJson = (analysis?.tailoredResumeJson as Record<string, any>) || {}

    // Skip if proactive follow-up already prepared
    if (existingResumeJson.proactiveFollowUp?.body) {
      skippedAlreadyDrafted++
      continue
    }

    const company = app.companyName || "the team"
    const role = app.jobTitle || "the position"
    const followUpSubject = `Following up on ${role} application - ${company}`
    const followUpBody = `Hi ${company} Team,\n\nI hope you're having a great week. I wanted to follow up on my application for the ${role} position submitted last week.\n\nI remain very interested in the team's engineering challenges and would love to connect whenever your schedule permits. Thank you for your time!\n\nBest regards.`

    const updatedResumeJson = {
      ...existingResumeJson,
      proactiveFollowUp: {
        subject: followUpSubject,
        body: followUpBody,
        generatedAt: new Date().toISOString(),
        daysWaiting: Math.floor((Date.now() - new Date(app.applicationDate || app.updatedAt).getTime()) / (24 * 60 * 60 * 1000)),
      },
    }

    if (analysis?.id) {
      await withDbRetry(() =>
        prisma.applicationAnalysis.update({
          where: { id: analysis.id },
          data: {
            tailoredResumeJson: updatedResumeJson,
          },
        })
      )
    }

    // Deliver notification to user
    await withDbRetry(() =>
      prisma.notification.create({
        data: {
          userId,
          title: `Proactive Follow-up Ready: ${company}`,
          message: `It has been over 7 days since you applied to ${company} for ${role}. A tailored follow-up message is ready in your application workbench.`,
          type: "FOLLOW_UP",
          link: `/applications`,
          isRead: false,
        },
      })
    )

    staleProcessed++
  }

  return {
    staleProcessed,
    skippedAlreadyDrafted,
  }
}

/**
 * Inngest Level 5 Proactive Career Daemon
 * Runs daily at 8:00 AM UTC and on manual event triggers.
 */
export const agentProactiveDaemon = inngest.createFunction(
  {
    id: "agent-proactive-daemon",
    name: "Level 5 Autonomous Proactive Career Daemon",
    retries: 2,
    triggers: [
      { cron: "0 8 * * *" }, // Daily morning trigger
      { event: "agent/proactive.scan" },
    ],
  },
  async ({ step, event }) => {
    const specificUserId = (event.data as any)?.userId

    if (specificUserId) {
      const result = await step.run(`proactive-scan-user-${specificUserId}`, async () => {
        return processProactiveFollowUpsForUser(specificUserId)
      })
      return { processedUsers: 1, ...result }
    }

    // Scan all active users with recent applications
    const activeUsers = await step.run("fetch-active-candidate-ids", async () => {
      const users = await withDbRetry<any[]>(() =>
        prisma.user.findMany({
          where: {
            applications: {
              some: {
                status: "Applied",
              },
            },
          },
          select: { id: true },
          take: 50,
        })
      )
      return users.map((u) => u.id)
    })

    let totalStale = 0
    for (const uid of activeUsers) {
      const res = await step.run(`proactive-scan-${uid}`, async () => {
        return processProactiveFollowUpsForUser(uid)
      })
      totalStale += res.staleProcessed
    }

    return {
      scannedUsers: activeUsers.length,
      totalStaleProcessed: totalStale,
    }
  }
)
