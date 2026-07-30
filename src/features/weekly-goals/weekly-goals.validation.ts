import type { WeeklyGoalDto } from "./weekly-goals.types"

export function validateWeeklyGoal(data: Partial<WeeklyGoalDto>): { isValid: boolean; error?: string } {
  if (!data.goal1 || typeof data.goal1 !== "string" || !data.goal1.trim()) {
    return { isValid: false, error: "Primary goal (goal1) is required" }
  }

  const validStatuses = ["NotStarted", "InProgress", "Completed", "Deferred"]

  if (data.goal1Status && !validStatuses.includes(data.goal1Status)) {
    return { isValid: false, error: `Invalid status for goal1. Must be one of: ${validStatuses.join(", ")}` }
  }

  if (data.goal2Status && !validStatuses.includes(data.goal2Status)) {
    return { isValid: false, error: `Invalid status for goal2. Must be one of: ${validStatuses.join(", ")}` }
  }

  if (data.goal3Status && !validStatuses.includes(data.goal3Status)) {
    return { isValid: false, error: `Invalid status for goal3. Must be one of: ${validStatuses.join(", ")}` }
  }

  return { isValid: true }
}
