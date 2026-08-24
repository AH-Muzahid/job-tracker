"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Target, Plus, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface WeeklyGoal {
  id: string
  weekStart: string
  goal1: string
  goal1Target: number | null
  goal1Progress: number | null
  goal1Status: string
  goal2: string | null
  goal2Status: string
  goal3: string | null
  goal3Status: string
  blockers: string | null
  weekReview: unknown
}

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  NotStarted: { color: "text-muted-foreground", icon: <Clock className="h-3.5 w-3.5" /> },
  InProgress: { color: "text-blue-500", icon: <AlertCircle className="h-3.5 w-3.5" /> },
  Achieved: { color: "text-emerald-500", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  Missed: { color: "text-rose-500", icon: <AlertCircle className="h-3.5 w-3.5" /> },
}

export default function WeeklyGoalsPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const [goals, setGoals] = useState<WeeklyGoal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoaded && !isSignedIn) { router.push("/sign-in"); return }
    if (isLoaded) fetchGoals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded])

  async function fetchGoals() {
    try {
      const res = await fetch("/api/weekly-goals")
      if (res.ok) setGoals(await res.json())
    } catch {} finally { setLoading(false) }
  }

  async function createGoals() {
    try {
      const res = await fetch("/api/weekly-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal1: "Get placed into a job",
          goal1Target: 1,
          goal2: "Apply to 15 targeted jobs",
          goal2Target: 15,
          goal3: "Complete 2 mock interviews",
          goal3Target: 2,
        }),
      })
      if (res.ok) {
        toast.success("Weekly goals created!")
        fetchGoals()
      }
    } catch { toast.error("Failed to create goals") }
  }

  if (!isLoaded || loading) return <div className="space-y-4 max-w-3xl"><Skeleton className="h-8 w-48 rounded-lg" /><Skeleton className="h-44 w-full rounded-xl" /></div>

  return (
    <div className="space-y-5 max-w-3xl pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">Weekly Goals</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Track and manage your weekly job search milestones</p>
        </div>
        <Button size="sm" onClick={createGoals} className="h-8 rounded-lg text-xs font-semibold">
          <Plus className="h-3.5 w-3.5 mr-1" /> Set Goals
        </Button>
      </div>

      {goals.length === 0 && (
        <Card className="rounded-xl border border-border/80 bg-card/60 backdrop-blur-xl">
          <CardContent className="p-12 text-center">
            <Target className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">No weekly targets configured. Click &ldquo;Set Goals&rdquo; to start tracking.</p>
          </CardContent>
        </Card>
      )}

      {goals.map((goal) => (
        <Card key={goal.id} className="rounded-xl border border-border/80 bg-card/70 backdrop-blur-2xl shadow-xs hover:shadow-md transition-all">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-xs font-bold flex items-center justify-between">
              <span>Week of {new Date(goal.weekStart).toLocaleDateString()}</span>
              <Badge variant="outline" className="text-[10px] font-mono border-border/60 bg-muted/30">
                Weekly Target
              </Badge>
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              Key performance indicators for this week
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3.5">
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 ${STATUS_CONFIG[goal.goal1Status]?.color}`}>{STATUS_CONFIG[goal.goal1Status]?.icon}</span>
              <div className="flex-1 space-y-1">
                <p className="text-xs font-bold text-foreground">{goal.goal1}</p>
                {goal.goal1Target && (
                  <div className="flex items-center gap-3 mt-1.5">
                    <Progress
                      value={Math.min(100, ((goal.goal1Progress || 0) / goal.goal1Target) * 100)}
                      className="h-2 flex-1 bg-muted rounded-full"
                    />
                    <span className="text-[10px] font-mono font-bold text-muted-foreground shrink-0">
                      {goal.goal1Progress || 0}/{goal.goal1Target}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {goal.goal2 && (
              <div className="flex items-center gap-3 pt-2 border-t border-border/40">
                <span className={STATUS_CONFIG[goal.goal2Status]?.color}>{STATUS_CONFIG[goal.goal2Status]?.icon}</span>
                <p className="text-xs font-medium text-muted-foreground">{goal.goal2}</p>
              </div>
            )}

            {goal.goal3 && (
              <div className="flex items-center gap-3 pt-2 border-t border-border/40">
                <span className={STATUS_CONFIG[goal.goal3Status]?.color}>{STATUS_CONFIG[goal.goal3Status]?.icon}</span>
                <p className="text-xs font-medium text-muted-foreground">{goal.goal3}</p>
              </div>
            )}

            {goal.blockers && (
              <div className="mt-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400">
                <strong>Blockers:</strong> {goal.blockers}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
