import { NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { ResponseUtil } from "@/lib/api-response"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

export interface ReminderAlert {
  id: string
  type: "interview" | "followup" | "weekly_goal"
  title: string
  description: string
  actionUrl: string
  dueDate?: string
  priority: "high" | "medium" | "low"
}

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json(ResponseUtil.error("Unauthorized", 401), { status: 401 })
  }

  const rateCheck = checkRateLimit(`reminders:${userId}`, 30, 60 * 1000)
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck)
  }

  try {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const startOfWeek = new Date(now)
    const dayOfWeek = now.getDay()
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek
    startOfWeek.setDate(now.getDate() + diffToMonday)
    startOfWeek.setHours(0, 0, 0, 0)

    const [applications, weeklyGoal] = await withDbRetry(() =>
      Promise.all([
        prisma.application.findMany({
          where: { userId },
          select: {
            id: true,
            companyName: true,
            jobTitle: true,
            status: true,
            applicationDate: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.weeklyGoal.findFirst({
          where: { userId, weekStart: startOfWeek },
        }),
      ])
    )

    const reminders: ReminderAlert[] = []

    // 1. Follow-up Reminders: Applications applied >7 days ago with no status change
    const pendingFollowups = applications.filter(
      (app) =>
        (app.status === "Applied" || app.status === "Applying") &&
        new Date(app.applicationDate) <= sevenDaysAgo
    )

    for (const app of pendingFollowups.slice(0, 5)) {
      const daysAgo = Math.floor(
        (now.getTime() - new Date(app.applicationDate).getTime()) / (1000 * 60 * 60 * 24)
      )
      reminders.push({
        id: `followup-${app.id}`,
        type: "followup",
        title: `Follow up on ${app.jobTitle}`,
        description: `Applied ${daysAgo} days ago to ${app.companyName}. Consider sending a polite follow-up email.`,
        actionUrl: `/applications/${app.id}`,
        dueDate: app.applicationDate.toISOString(),
        priority: daysAgo > 14 ? "high" : "medium",
      })
    }

    // 2. Active Interview Reminders
    const interviewingApps = applications.filter((app) => app.status === "Interviewing")

    for (const app of interviewingApps.slice(0, 3)) {
      reminders.push({
        id: `interview-${app.id}`,
        type: "interview",
        title: `Interview Prep: ${app.companyName}`,
        description: `Active interview stage for ${app.jobTitle}. Review company background and practice behavioral questions.`,
        actionUrl: `/prep?appId=${app.id}`,
        priority: "high",
      })
    }

    // 3. Weekly Goal Reminders
    if (weeklyGoal) {
      if (weeklyGoal.goal1Status !== "Achieved") {
        reminders.push({
          id: `goal-1-${weeklyGoal.id}`,
          type: "weekly_goal",
          title: `Weekly Goal Target: ${weeklyGoal.goal1}`,
          description: `Progress: ${weeklyGoal.goal1Progress || 0} / ${weeklyGoal.goal1Target || 1} completed.`,
          actionUrl: `/dashboard`,
          priority: "medium",
        })
      }
    } else {
      reminders.push({
        id: "goal-set-needed",
        type: "weekly_goal",
        title: "Set Your Weekly Placement Goal",
        description: "No target set for this week. Define your application target to stay on track.",
        actionUrl: `/dashboard`,
        priority: "low",
      })
    }

    return NextResponse.json(
      ResponseUtil.success({
        reminders,
        count: reminders.length,
      })
    )
  } catch (err) {
    console.error("Notifications reminders API error:", err)
    return NextResponse.json(
      ResponseUtil.error("Failed to fetch notification reminders", 500),
      { status: 500 }
    )
  }
}
