"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Target, TrendingUp, Sparkles } from "lucide-react"
import Link from "next/link"

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
}

interface Props {
  goals: WeeklyGoal | null
  loading: boolean
}

const statusColor: Record<string, string> = {
  NotStarted: "bg-muted text-muted-foreground",
  InProgress: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  Achieved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  Missed: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400",
}

export default function WeeklyGoalsWidget({ goals, loading }: Props) {
  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-5">
          <div className="h-4 w-24 bg-muted rounded animate-pulse mb-3" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!goals) {
    return (
      <Card className="overflow-hidden group hover:shadow-lg transition-all">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Weekly Goals</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">No goals set for this week.</p>
          <Link
            href="/weekly-goals"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Sparkles className="h-3 w-3" /> Set your weekly goals
          </Link>
        </CardContent>
      </Card>
    )
  }

  const allGoals = [
    { label: goals.goal1, target: goals.goal1Target, progress: goals.goal1Progress, status: goals.goal1Status },
    goals.goal2 ? { label: goals.goal2, target: goals.goal2Target, progress: goals.goal2Progress, status: goals.goal2Status } : null,
    goals.goal3 ? { label: goals.goal3, target: goals.goal3Target, progress: goals.goal3Progress, status: goals.goal3Status } : null,
  ].filter(Boolean)

  const achievedCount = allGoals.filter((g) => g!.status === "Achieved").length

  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-all">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Weekly Goals</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{achievedCount}/{allGoals.length} done</span>
          </div>
        </div>
        <div className="space-y-2">
          {allGoals.map((g, i) => (
            <div key={i} className="rounded-lg border p-2.5">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-medium truncate flex-1">{g!.label}</span>
                <Badge variant="outline" className={`text-[10px] font-medium border-0 ${statusColor[g!.status] || ""}`}>
                  {g!.status === "NotStarted" ? "Not Started" : g!.status}
                </Badge>
              </div>
              {g!.target != null && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, ((g!.progress || 0) / g!.target) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {g!.progress || 0}/{g!.target}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
