/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma, withDbRetry } from "@/lib/prisma"

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

export async function executeCreateWeeklyGoal(userId: string, input: {
  goal1: string
  goal1Target?: number
  goal2?: string
  goal2Target?: number
  goal3?: string
  goal3Target?: number
}) {
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const weekStart = getMonday(new Date())
    const goal = await withDbRetry<any>(() =>
      prisma.weeklyGoal.upsert({
        where: {
          userId_weekStart: {
            userId,
            weekStart,
          },
        },
        create: {
          userId,
          weekStart,
          goal1: input.goal1,
          goal1Target: input.goal1Target || 5,
          goal2: input.goal2 || null,
          goal2Target: input.goal2Target || null,
          goal3: input.goal3 || null,
          goal3Target: input.goal3Target || null,
        },
        update: {
          goal1: input.goal1,
          goal1Target: input.goal1Target || undefined,
          ...(input.goal2 ? { goal2: input.goal2, goal2Target: input.goal2Target || 5 } : {}),
          ...(input.goal3 ? { goal3: input.goal3, goal3Target: input.goal3Target || 5 } : {}),
        },
      })
    )

    return {
      success: true,
      message: "Weekly goal saved successfully",
      goal,
    }
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save weekly goal" }
  }
}
