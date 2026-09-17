import { inngest } from "../client"
import { prisma, withDbRetry } from "@/lib/prisma"
import { sendEmail, formatInterviewReminderHtml } from "@/lib/email"

/**
 * Inngest Scheduled Job for 24h and 2h Pre-Interview Briefings & Reminders
 * Runs every 30 minutes to check for upcoming candidate interviews.
 */
export const interviewReminderPipeline = inngest.createFunction(
  {
    id: "interview-reminder-pipeline",
    name: "Interview 24h & 2h Reminder & Briefing Pipeline",
    triggers: [
      { cron: "*/30 * * * *" }, // Every 30 minutes
      { event: "app/interview-reminders.check" },
    ],
  },
  async ({ step }) => {
    const now = new Date()

    // Fetch applications with upcoming interview dates within the next 26 hours
    const upcomingApplications = await step.run("fetch-upcoming-interviews", async () => {
      const windowEnd = new Date(now.getTime() + 26 * 60 * 60 * 1000)

      return withDbRetry(() =>
        prisma.application.findMany({
          where: {
            interviewDate: {
              gte: now,
              lte: windowEnd,
            },
          },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        })
      )
    })

    let remindersSent24h = 0
    let remindersSent2h = 0

    for (const app of upcomingApplications) {
      if (!app.interviewDate || !app.user) continue

      const interviewTime = new Date(app.interviewDate).getTime()
      const diffHours = (interviewTime - now.getTime()) / (1000 * 60 * 60)

      // 1. Check 24h reminder window (between 22 and 26 hours out)
      if (diffHours >= 22 && diffHours <= 26) {
        await step.run(`send-24h-reminder-${app.id}`, async () => {
          // Check for existing 24h notification within last 28 hours to ensure idempotency
          const past28h = new Date(now.getTime() - 28 * 60 * 60 * 1000)
          const existing = await withDbRetry(() =>
            prisma.notification.findFirst({
              where: {
                userId: app.userId,
                type: "INTERVIEW_REMINDER_24H",
                link: { contains: app.id },
                createdAt: { gte: past28h },
              },
            })
          )

          if (existing) return { skipped: true, reason: "Already notified 24h" }

          const roundTitle = app.interviewRound || "Interview"
          const cleanCompany = app.companyName.replace(/\s*\(inferred from.*?\)\s*/gi, "").trim()
          const prepLink = `/interview-prep?appId=${app.id}&company=${encodeURIComponent(
            cleanCompany
          )}&role=${encodeURIComponent(app.jobTitle)}`

          // 1. Create in-app notification
          await withDbRetry(() =>
            prisma.notification.create({
              data: {
                userId: app.userId,
                title: `24h Interview Briefing: ${cleanCompany} (${roundTitle})`,
                message: `Your interview for ${app.jobTitle} is scheduled in 24 hours. Launch the AI Mock Prep Room to practice key questions.`,
                type: "INTERVIEW_REMINDER_24H",
                link: prepLink,
              },
            })
          )

          // 2. Dispatch email if candidate has an email address
          if (app.user.email) {
            const html = formatInterviewReminderHtml({
              candidateName: app.user.name || undefined,
              companyName: cleanCompany,
              jobTitle: app.jobTitle,
              interviewRound: roundTitle,
              interviewDate: app.interviewDate!,
              interviewMeetingUrl: app.interviewMeetingUrl,
              interviewNotes: app.interviewNotes,
              reminderType: "24h",
              applicationId: app.id,
            })

            await sendEmail({
              to: app.user.email,
              subject: `24-Hour Briefing: ${roundTitle} with ${cleanCompany}`,
              html,
            })
          }

          remindersSent24h++
          return { success: true }
        })
      }

      // 2. Check 2h reminder window (between 0.5 and 2.5 hours out)
      if (diffHours >= 0.5 && diffHours <= 2.5) {
        await step.run(`send-2h-reminder-${app.id}`, async () => {
          // Check for existing 2h notification within last 4 hours
          const past4h = new Date(now.getTime() - 4 * 60 * 60 * 1000)
          const existing = await withDbRetry(() =>
            prisma.notification.findFirst({
              where: {
                userId: app.userId,
                type: "INTERVIEW_REMINDER_2H",
                link: { contains: app.id },
                createdAt: { gte: past4h },
              },
            })
          )

          if (existing) return { skipped: true, reason: "Already notified 2h" }

          const roundTitle = app.interviewRound || "Interview"
          const cleanCompany = app.companyName.replace(/\s*\(inferred from.*?\)\s*/gi, "").trim()
          const appLink = `/applications/${app.id}`

          // 1. Create in-app notification
          await withDbRetry(() =>
            prisma.notification.create({
              data: {
                userId: app.userId,
                title: `Upcoming in 2 Hours: ${cleanCompany} (${roundTitle})`,
                message: `Your interview for ${app.jobTitle} starts soon. Check your video link and cheatsheet.`,
                type: "INTERVIEW_REMINDER_2H",
                link: appLink,
              },
            })
          )

          // 2. Dispatch urgent email
          if (app.user.email) {
            const html = formatInterviewReminderHtml({
              candidateName: app.user.name || undefined,
              companyName: cleanCompany,
              jobTitle: app.jobTitle,
              interviewRound: roundTitle,
              interviewDate: app.interviewDate!,
              interviewMeetingUrl: app.interviewMeetingUrl,
              interviewNotes: app.interviewNotes,
              reminderType: "2h",
              applicationId: app.id,
            })

            await sendEmail({
              to: app.user.email,
              subject: `Upcoming in 2 Hours: ${roundTitle} with ${cleanCompany}`,
              html,
            })
          }

          remindersSent2h++
          return { success: true }
        })
      }
    }

    return {
      processedCount: upcomingApplications.length,
      remindersSent24h,
      remindersSent2h,
    }
  }
)
