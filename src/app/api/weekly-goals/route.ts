import { NextRequest } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { WeeklyGoalsService } from "@/features/weekly-goals"
import { ResponseUtil } from "@/lib/api-response"

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) return ResponseUtil.unauthorized()

  const goals = await WeeklyGoalsService.listGoals(userId)
  return ResponseUtil.success(goals)
}

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return ResponseUtil.unauthorized()

  const body = await request.json()
  const result = await WeeklyGoalsService.saveCurrentWeekGoal(userId, body)

  if ("error" in result) {
    return ResponseUtil.error(result.error || "Failed to save goal", result.status)
  }

  return ResponseUtil.success(result.data)
}
