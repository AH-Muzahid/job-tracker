"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, TrendingUp } from "lucide-react"

interface WeeklyGoal {
  id: string
  goal1: string
  goal1Target: number | null
  goal1Progress: number | null
  goal1Status: string
  goal2: string | null
  goal2Target: number | null
  goal2Progress: number | null
  goal2Status: string
  goal3: string | null
  goal3Target: number | null
  goal3Progress: number | null
  goal3Status: string
  weekStart: string
  weekReview: Record<string, unknown> | null
}

interface Props {
  goal: WeeklyGoal
}

const statusColor: Record<string, string> = {
  NotStarted: "bg-muted",
  InProgress: "bg-blue-500",
  Achieved: "bg-emerald-500",
  Missed: "bg-rose-500",
}

export default function WeeklyReviewCard({ goal }: Props) {
  const allGoals = [
    { label: goal.goal1, progress: goal.goal1Progress, target: goal.goal1Target, status: goal.goal1Status },
    { label: goal.goal2, progress: goal.goal2Progress, target: goal.goal2Target, status: goal.goal2Status },
    { label: goal.goal3, progress: goal.goal3Progress, target: goal.goal3Target, status: goal.goal3Status },
  ].filter((g) => g.label)

  const achievedCount = allGoals.filter((g) => g.status === "Achieved").length
  const weekLabel = new Date(goal.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Week of {weekLabel}</span>
          </div>
          <span className="text-xs text-muted-foreground">{achievedCount}/{allGoals.length} achieved</span>
        </div>
        <div className="space-y-2">
          {allGoals.map((g, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium truncate flex-1">{g.label}</span>
                {g.status && (
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{g.status}</span>
                )}
              </div>
              {g.target != null && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${statusColor[g.status] || "bg-muted"}`}
                      style={{ width: `${Math.min(100, ((g.progress || 0) / g.target) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{g.progress || 0}/{g.target}</span>
                </div>
              )}
            </div>
          ))}
        </div>
        {goal.weekReview && (
          <div className="rounded-lg bg-muted p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium">AI Review</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {typeof goal.weekReview === "string" ? goal.weekReview : JSON.stringify(goal.weekReview)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
