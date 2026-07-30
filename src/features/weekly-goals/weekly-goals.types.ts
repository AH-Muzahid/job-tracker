export interface WeeklyGoalDto {
  goal1: string
  goal1Target?: number | null
  goal1Progress?: number | null
  goal1Status?: string
  goal2?: string | null
  goal2Target?: number | null
  goal2Progress?: number | null
  goal2Status?: string
  goal3?: string | null
  goal3Target?: number | null
  goal3Progress?: number | null
  goal3Status?: string
  blockers?: string | null
  notes?: string | null
}

export interface UpdateWeeklyGoalDto extends Partial<WeeklyGoalDto> {
  weekReview?: Record<string, unknown> | null
}
