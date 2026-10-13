import { inngest } from "../client"
import { prisma, withDbRetry } from "@/lib/prisma"
import { sendEmail, formatInterviewReminderHtml } from "@/lib/email"

export const interviewReminderPipeline = inngest.createFunction(
  {
    id: "interview-reminder-pipeline",
    name: "Interview 24h & 2h Reminder & Briefing Pipeline",
    retries: 2,
    triggers: [{ cron: "*/30 * * * *" }, { event: "app/interview-reminders.check" }],
  },
  async ({ step }) => {
    const now = new Date()
    const upcomingApplications = await step.run("fetch-upcoming-interviews", () =>
      withDbRetry(() => prisma.application.findMany({
        where: {
          status: "Interview",
          interviewDate: { gte: now, lte: new Date(now.getTime() + 26 * 60 * 60 * 1000) },
        },
        include: { user: { select: { id: true, name: true, email: true, profile: { select: { notifyEmail: true } } } } },
      })),
    )

    let remindersSent24h = 0
    let remindersSent2h = 0
    for (const app of upcomingApplications) {
      if (!app.interviewDate || !app.user) continue
      const interviewDate = new Date(app.interviewDate)
      const diffHours = (interviewDate.getTime() - now.getTime()) / 3_600_000
      const reminderType = diffHours >= 22 && diffHours <= 26 ? "24h"
        : diffHours > 0 && diffHours <= 2.5 ? "2h" : undefined
      if (!reminderType) continue

      const result = await step.run(`send-${reminderType}-reminder-${app.id}`, async () => {
        const type = reminderType === "24h" ? "INTERVIEW_REMINDER_24H" : "INTERVIEW_REMINDER_2H"
        const appLink = `/applications/${encodeURIComponent(app.id)}`
        const existing = await withDbRetry(() => prisma.notification.findFirst({
          where: {
            userId: app.userId, type, link: appLink,
            createdAt: { gte: new Date(now.getTime() - (reminderType === "24h" ? 28 : 4) * 3_600_000) },
          },
        }))
        if (existing) return { skipped: true }

        const roundTitle = app.interviewRound || "Interview"
        const companyName = app.companyName.replace(/\s*\(inferred from.*?\)\s*/gi, "").trim()
        if (app.user.email && app.user.profile?.notifyEmail !== false) {
          const sent = await sendEmail({
            to: app.user.email,
            subject: `${reminderType === "24h" ? "24-Hour Briefing" : "Upcoming Interview"}: ${roundTitle} with ${companyName}`,
            html: formatInterviewReminderHtml({
              candidateName: app.user.name || undefined, companyName, jobTitle: app.jobTitle,
              interviewRound: roundTitle, interviewDate,
              interviewMeetingUrl: app.interviewMeetingUrl, interviewNotes: app.interviewNotes,
              reminderType, applicationId: app.id,
            }),
            idempotencyKey: `interview/${app.id}/${interviewDate.getTime()}/${reminderType}`,
          })
          if (!sent.success) throw new Error("Interview reminder email delivery failed")
        }
        await withDbRetry(() => prisma.notification.create({ data: {
          userId: app.userId, type, link: appLink,
          title: `${reminderType === "24h" ? "Interview Preparation" : "Upcoming Interview"}: ${companyName} (${roundTitle})`,
          message: `Your interview for ${app.jobTitle} is scheduled at ${interviewDate.toISOString()}. Review your preparation notes and meeting link.`,
        } }))
        return { skipped: false }
      })
      if (!result.skipped) {
        if (reminderType === "24h") remindersSent24h++
        else remindersSent2h++
      }
    }
    return { processedCount: upcomingApplications.length, remindersSent24h, remindersSent2h }
  },
)
