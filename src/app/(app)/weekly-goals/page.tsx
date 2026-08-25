"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Target, Plus, CheckCircle2, Clock, AlertCircle, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DashboardCard } from "@/components/dashboard-card"
import { DecorIcon } from "@/components/decor-icon"
import { toast } from "sonner"

interface WeeklyGoal {
  id: string
  weekStart: string
  goal1: string
  goal1Target: number | null
  goal1Progress: number | null
  goal1Status: string
  goal2: string | null
  goal2Target?: number | null
  goal2Progress?: number | null
  goal2Status: string
  goal3: string | null
  goal3Target?: number | null
  goal3Progress?: number | null
  goal3Status: string
  blockers: string | null
  weekReview: unknown
}

const STATUS_CONFIG: Record<string, { label: string; badge: string; color: string; icon: React.ReactNode }> = {
  NotStarted: { label: "Not Started", badge: "bg-muted text-muted-foreground border-border", color: "text-muted-foreground", icon: <Clock className="h-3.5 w-3.5" /> },
  InProgress: { label: "In Progress", badge: "bg-blue-500/10 text-blue-400 border-blue-500/30", color: "text-blue-400", icon: <AlertCircle className="h-3.5 w-3.5" /> },
  Achieved: { label: "Achieved", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", color: "text-emerald-400", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  Missed: { label: "Missed", badge: "bg-rose-500/10 text-rose-400 border-rose-500/30", color: "text-rose-400", icon: <AlertCircle className="h-3.5 w-3.5" /> },
}

export default function WeeklyGoalsPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const [goals, setGoals] = useState<WeeklyGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state for creating / updating goals
  const [formGoal1, setFormGoal1] = useState("Apply to 15 targeted companies")
  const [formGoal1Target, setFormGoal1Target] = useState(15)
  const [formGoal2, setFormGoal2] = useState("Complete 2 full mock interview sessions")
  const [formGoal3, setFormGoal3] = useState("Tailor resume and optimize GitHub projects")
  const [formBlockers, setFormBlockers] = useState("")

  useEffect(() => {
    if (isLoaded && !isSignedIn) { router.push("/"); return }
    if (isLoaded) fetchGoals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded])

  async function fetchGoals() {
    try {
      const res = await fetch("/api/weekly-goals")
      if (res.ok) {
        const json = await res.json()
        const parsed = Array.isArray(json) ? json : json.data || []
        setGoals(parsed)
        if (parsed.length > 0) {
          const current = parsed[0]
          setFormGoal1(current.goal1 || "")
          setFormGoal1Target(current.goal1Target || 15)
          setFormGoal2(current.goal2 || "")
          setFormGoal3(current.goal3 || "")
          setFormBlockers(current.blockers || "")
        }
      }
    } catch {
      setGoals([])
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveGoals(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/weekly-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal1: formGoal1,
          goal1Target: Number(formGoal1Target) || 1,
          goal2: formGoal2 || null,
          goal3: formGoal3 || null,
          blockers: formBlockers || null,
        }),
      })
      if (res.ok) {
        toast.success("Weekly goals updated successfully!")
        setDialogOpen(false)
        fetchGoals()
      } else {
        toast.error("Failed to save goals")
      }
    } catch {
      toast.error("Failed to save goals")
    } finally {
      setSaving(false)
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12 w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <Skeleton className="h-8 w-56 rounded-md" />
            <Skeleton className="h-4 w-80 rounded-sm" />
          </div>
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>

        <div className="relative border border-border bg-border">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-5 sm:p-6 bg-background space-y-3">
                <Skeleton className="h-3.5 w-24 rounded-sm" />
                <Skeleton className="h-7 w-16 rounded-sm" />
                <Skeleton className="h-2.5 w-28 rounded-sm mt-3" />
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-xl border border-border bg-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <Skeleton className="h-5 w-44 rounded-md" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="space-y-2.5 pt-2">
            <Skeleton className="h-4 w-3/4 rounded-sm" />
            <Skeleton className="h-4 w-1/2 rounded-sm" />
          </div>
        </div>
      </div>
    )
  }

  const currentGoal = goals[0] || null
  const pastGoals = goals.slice(1)
  const goal1Completion = currentGoal && currentGoal.goal1Target
    ? Math.min(100, Math.round(((currentGoal.goal1Progress || 0) / currentGoal.goal1Target) * 100))
    : 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 w-full min-w-0 max-w-full overflow-x-hidden">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Weekly Goals & Targets</h1>
          <p className="text-sm font-medium text-muted-foreground mt-0.5">
            Track your weekly application velocity, mock interviews, and milestone pace
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-9 rounded-md font-semibold text-sm cursor-pointer shadow-xs px-4">
              <Plus className="h-4 w-4 mr-1.5" /> Set / Edit Goals
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-background border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">Configure Weekly Goals</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveGoals} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Primary Metric Goal</Label>
                <Input
                  value={formGoal1}
                  onChange={(e) => setFormGoal1(e.target.value)}
                  placeholder="e.g. Apply to 15 targeted companies"
                  className="bg-background border-border text-sm h-10 rounded-md"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Numeric Target (Applications / Tasks)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={formGoal1Target}
                  onChange={(e) => setFormGoal1Target(Number(e.target.value))}
                  className="bg-background border-border text-sm h-10 rounded-md"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Secondary Milestone Goal</Label>
                <Input
                  value={formGoal2}
                  onChange={(e) => setFormGoal2(e.target.value)}
                  placeholder="e.g. Complete 2 mock interview sessions"
                  className="bg-background border-border text-sm h-10 rounded-md"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Tertiary Focus Goal</Label>
                <Input
                  value={formGoal3}
                  onChange={(e) => setFormGoal3(e.target.value)}
                  placeholder="e.g. Tailor resume and portfolio"
                  className="bg-background border-border text-sm h-10 rounded-md"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Active Blockers / Challenges</Label>
                <Input
                  value={formBlockers}
                  onChange={(e) => setFormBlockers(e.target.value)}
                  placeholder="e.g. Waiting for recruiter response"
                  className="bg-background border-border text-sm h-10 rounded-md"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="h-9 px-4 rounded-md text-sm">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saving} className="h-9 px-5 rounded-md text-sm font-semibold">
                  {saving ? "Saving..." : "Save Targets"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 2. Top Efferd 4-Stat Metric Grid */}
      <div className="relative border border-border bg-border">
        <DecorIcon className="hidden md:block" position="top-left" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
          {/* Card 1: Active Week */}
          <DashboardCard className="flex flex-col justify-between">
            <div className="p-3.5 sm:px-5 sm:pt-4 sm:pb-4">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Current Sprint</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground mt-1 sm:mt-2 truncate">
                {currentGoal ? `Week of ${new Date(currentGoal.weekStart).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : "No Sprint"}
              </p>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs px-3.5 sm:px-5 py-2 sm:py-2.5 border-t border-border bg-background font-mono text-muted-foreground">
              <span className="truncate">Milestone Pace</span>
            </div>
          </DashboardCard>

          {/* Card 2: Applications Target Progress */}
          <DashboardCard className="flex flex-col justify-between">
            <div className="p-3.5 sm:px-5 sm:pt-4 sm:pb-4">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Target Velocity</p>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1 sm:mt-2">
                {currentGoal?.goal1Progress || 0} / {currentGoal?.goal1Target || 15}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs px-3.5 sm:px-5 py-2 sm:py-2.5 border-t border-border bg-background font-mono text-muted-foreground">
              <Progress value={goal1Completion} className="h-1.5 flex-1 bg-muted rounded-full" />
              <span className="font-bold text-foreground">{goal1Completion}%</span>
            </div>
          </DashboardCard>

          {/* Card 3: Milestone Status */}
          <DashboardCard className="flex flex-col justify-between">
            <div className="p-3.5 sm:px-5 sm:pt-4 sm:pb-4">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Goal Status</p>
              <div className="mt-1 sm:mt-2">
                <Badge variant="outline" className={`text-xs px-2 py-0.5 rounded-md font-medium border ${STATUS_CONFIG[currentGoal?.goal1Status || "InProgress"]?.badge}`}>
                  {STATUS_CONFIG[currentGoal?.goal1Status || "InProgress"]?.label}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs px-3.5 sm:px-5 py-2 sm:py-2.5 border-t border-border bg-background font-mono text-muted-foreground">
              <span className="truncate">Tracking</span>
            </div>
          </DashboardCard>

          {/* Card 4: Historical Weeks Recorded */}
          <DashboardCard className="flex flex-col justify-between">
            <div className="p-3.5 sm:px-5 sm:pt-4 sm:pb-4">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Sprints Logged</p>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1 sm:mt-2">
                {goals.length}
              </p>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs px-3.5 sm:px-5 py-2 sm:py-2.5 border-t border-border bg-background font-mono text-muted-foreground">
              <span className="truncate">History archive</span>
            </div>
          </DashboardCard>
        </div>
      </div>

      {/* 3. Main 1px Continuous Border Grid */}
      <div className="relative border border-border bg-border">
        <DecorIcon className="hidden md:block" position="top-left" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border">
          {/* Left Primary Pane: Active Goals (2 cols) */}
          <DashboardCard className="lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-border p-3.5 bg-background">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-foreground" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                    Active Week Targets
                  </h3>
                </div>
                {currentGoal && (
                  <Badge variant="outline" className="text-xs font-mono border-border bg-muted/30">
                    Week of {new Date(currentGoal.weekStart).toLocaleDateString()}
                  </Badge>
                )}
              </div>

              <div className="p-6 space-y-4">
                {!currentGoal ? (
                  <div className="text-center py-12 space-y-3">
                    <Target className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                      No active targets configured for this week yet. Click &ldquo;Set / Edit Goals&rdquo; to begin.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Goal 1 (Primary Goal with progress) */}
                    <div className="p-4 bg-muted/15 rounded-md border border-border space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className={`mt-0.5 ${STATUS_CONFIG[currentGoal.goal1Status]?.color || "text-foreground"}`}>
                            {STATUS_CONFIG[currentGoal.goal1Status]?.icon}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{currentGoal.goal1}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Primary Target Metric</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={`text-xs px-2.5 py-0.5 rounded-md border ${STATUS_CONFIG[currentGoal.goal1Status]?.badge}`}>
                          {STATUS_CONFIG[currentGoal.goal1Status]?.label}
                        </Badge>
                      </div>

                      {currentGoal.goal1Target && (
                        <div className="space-y-1.5 pt-1 border-t border-border/60">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground font-medium">Completion Progress</span>
                            <span className="font-mono font-bold text-foreground">
                              {currentGoal.goal1Progress || 0} / {currentGoal.goal1Target} ({goal1Completion}%)
                            </span>
                          </div>
                          <Progress value={goal1Completion} className="h-2 bg-muted rounded-full" />
                        </div>
                      )}
                    </div>

                    {/* Goal 2 */}
                    {currentGoal.goal2 && (
                      <div className="p-4 bg-muted/15 rounded-md border border-border flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className={STATUS_CONFIG[currentGoal.goal2Status]?.color || "text-foreground"}>
                            {STATUS_CONFIG[currentGoal.goal2Status]?.icon}
                          </span>
                          <p className="text-sm font-medium text-foreground">{currentGoal.goal2}</p>
                        </div>
                        <Badge variant="outline" className={`text-xs px-2.5 py-0.5 rounded-md border ${STATUS_CONFIG[currentGoal.goal2Status]?.badge}`}>
                          {STATUS_CONFIG[currentGoal.goal2Status]?.label}
                        </Badge>
                      </div>
                    )}

                    {/* Goal 3 */}
                    {currentGoal.goal3 && (
                      <div className="p-4 bg-muted/15 rounded-md border border-border flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className={STATUS_CONFIG[currentGoal.goal3Status]?.color || "text-foreground"}>
                            {STATUS_CONFIG[currentGoal.goal3Status]?.icon}
                          </span>
                          <p className="text-sm font-medium text-foreground">{currentGoal.goal3}</p>
                        </div>
                        <Badge variant="outline" className={`text-xs px-2.5 py-0.5 rounded-md border ${STATUS_CONFIG[currentGoal.goal3Status]?.badge}`}>
                          {STATUS_CONFIG[currentGoal.goal3Status]?.label}
                        </Badge>
                      </div>
                    )}

                    {/* Blockers */}
                    {currentGoal.blockers && (
                      <div className="p-4 rounded-md bg-amber-500/5 border border-amber-500/20 text-sm text-amber-500 space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wider block text-amber-400">
                          Active Blockers / Challenges
                        </span>
                        <p className="text-sm text-foreground/90 leading-relaxed">{currentGoal.blockers}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </DashboardCard>

          {/* Right Secondary Pane: Past History Archive (1 col) */}
          <DashboardCard className="lg:col-span-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between p-3.5 border-b border-border bg-background">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-foreground" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                    Sprint Archive
                  </h3>
                </div>
                <span className="text-xs font-mono text-muted-foreground">{pastGoals.length} past</span>
              </div>

              <div className="p-4 space-y-3">
                {pastGoals.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <p className="text-sm text-muted-foreground">No historical sprints archived yet.</p>
                    <p className="text-xs text-muted-foreground/60">Completed weeks will automatically appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {pastGoals.map((past) => (
                      <div key={past.id} className="p-3 bg-muted/15 rounded-md border border-border space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-muted-foreground">
                            {new Date(past.weekStart).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                          <Badge variant="outline" className={`text-xs px-2 py-0 rounded-md ${STATUS_CONFIG[past.goal1Status]?.badge}`}>
                            {STATUS_CONFIG[past.goal1Status]?.label}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">{past.goal1}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  )
}
