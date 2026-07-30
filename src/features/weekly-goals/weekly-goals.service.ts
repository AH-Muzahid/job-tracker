import { WeeklyGoalsRepository } from "./weekly-goals.repository"
import { validateWeeklyGoal } from "./weekly-goals.validation"
import type { WeeklyGoalDto, UpdateWeeklyGoalDto } from "./weekly-goals.types"

export class WeeklyGoalsService {
  static async listGoals(userId: string) {
    return WeeklyGoalsRepository.findManyByUser(userId)
  }

  static async saveCurrentWeekGoal(userId: string, data: WeeklyGoalDto) {
    const validation = validateWeeklyGoal(data)
    if (!validation.isValid) {
      return { error: validation.error, status: 400 }
    }

    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay() + 1)
    weekStart.setHours(0, 0, 0, 0)

    const goal = await WeeklyGoalsRepository.upsertGoal(userId, weekStart, data)
    return { data: goal, status: 200 }
  }

  static async updateGoal(id: string, data: UpdateWeeklyGoalDto) {
    const goal = await WeeklyGoalsRepository.updateGoal(id, data)
    return { data: goal, status: 200 }
  }

  static async deleteGoal(id: string) {
    await WeeklyGoalsRepository.deleteGoal(id)
    return { success: true, status: 200 }
  }
}
