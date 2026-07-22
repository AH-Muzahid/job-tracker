"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Target, Plus, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  InProgress: { color: "text-blue-600", icon: <AlertCircle className="h-3.5 w-3.5" /> },
  Achieved: { color: "text-emerald-600", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  Missed: { color: "text-rose-600", icon: <AlertCircle className="h-3.5 w-3.5" /> },
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

  if (!isLoaded || loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Weekly Goals</h1>
          <p className="text-sm text-muted-foreground">Track your weekly job search goals</p>
        </div>
        <Button size="sm" onClick={createGoals}><Plus className="h-4 w-4 mr-1" /> Set Goals</Button>
      </div>

      {goals.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
             <p className="text-sm text-muted-foreground">No weekly goals set. Click &ldquo;Set Goals&rdquo; to start.</p>
          </CardContent>
        </Card>
      )}

      {goals.map((goal) => (
        <Card key={goal.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Week of {new Date(goal.weekStart).toLocaleDateString()}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <span className={STATUS_CONFIG[goal.goal1Status]?.color}>{STATUS_CONFIG[goal.goal1Status]?.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium">{goal.goal1}</p>
                {goal.goal1Target && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, ((goal.goal1Progress || 0) / goal.goal1Target) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{goal.goal1Progress || 0}/{goal.goal1Target}</span>
                  </div>
                )}
              </div>
            </div>
            {goal.goal2 && (
              <div className="flex items-center gap-3 pl-6">
                <span className={STATUS_CONFIG[goal.goal2Status]?.color}>{STATUS_CONFIG[goal.goal2Status]?.icon}</span>
                <p className="text-sm text-muted-foreground">{goal.goal2}</p>
              </div>
            )}
            {goal.goal3 && (
              <div className="flex items-center gap-3 pl-6">
                <span className={STATUS_CONFIG[goal.goal3Status]?.color}>{STATUS_CONFIG[goal.goal3Status]?.icon}</span>
                <p className="text-sm text-muted-foreground">{goal.goal3}</p>
              </div>
            )}
            {goal.blockers && <p className="text-xs text-muted-foreground">Blockers: {goal.blockers}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
