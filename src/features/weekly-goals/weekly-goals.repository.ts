import { prisma, withDbRetry } from "@/lib/prisma"
import type { WeeklyGoalDto, UpdateWeeklyGoalDto } from "./weekly-goals.types"

export class WeeklyGoalsRepository {
  static async findManyByUser(userId: string, limit = 12) {
    return withDbRetry(() =>
      prisma.weeklyGoal.findMany({
        where: { userId },
        orderBy: { weekStart: "desc" },
        take: limit,
      })
    )
  }

  static async findByWeek(userId: string, weekStart: Date) {
    return withDbRetry(() =>
      prisma.weeklyGoal.findFirst({
        where: { userId, weekStart },
      })
    )
  }

  static async upsertGoal(userId: string, weekStart: Date, data: WeeklyGoalDto) {
    const goalData = {
      goal1: data.goal1,
      goal1Target: data.goal1Target ?? null,
      goal2: data.goal2 ?? null,
      goal2Target: data.goal2Target ?? null,
      goal3: data.goal3 ?? null,
      goal3Target: data.goal3Target ?? null,
      blockers: data.blockers ?? null,
      notes: data.notes ?? null,
    }

    return withDbRetry(() =>
      prisma.weeklyGoal.upsert({
        where: { userId_weekStart: { userId, weekStart } },
        update: goalData,
        create: { userId, weekStart, ...goalData },
      })
    )
  }

  static async updateGoal(id: string, data: UpdateWeeklyGoalDto) {
    return withDbRetry(() =>
      prisma.weeklyGoal.update({
        where: { id },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: data as any,
      })
    )
  }

  static async deleteGoal(id: string) {
    return withDbRetry(() =>
      prisma.weeklyGoal.delete({ where: { id } })
    )
  }
}
