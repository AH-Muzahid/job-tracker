"use client"

import Link from "next/link"
import {
  Clock, ArrowRight, Target, TrendingUp,
  Zap,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface RecentApp {
  id: string
  companyName: string
  jobTitle: string
  status: string
  applicationDate?: string
}

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
}

interface ActivityFeedProps {
  recentApps: RecentApp[]
  followUpApps: RecentApp[]
  weeklyGoals: WeeklyGoal | null
  goalsLoading: boolean
  stats: {
    total: number
    interview: number
    assessment: number
    bySource: { source: string; count: number }[]
  }
}

const STATUS_DOT: Record<string, string> = {
  Saved: "bg-status-saved",
  Applied: "bg-status-applied",
  Assessment: "bg-status-assessment",
  Interview: "bg-status-interview",
  Rejected: "bg-status-rejected",
  Offer: "bg-status-offer",
}

export default function ActivityFeed({
  recentApps,
  followUpApps,
  weeklyGoals,
  goalsLoading,
  stats,
}: ActivityFeedProps) {
  const topSource = stats.bySource[0]
  const interviewRate = stats.total > 0
    ? Math.round(((stats.interview + stats.assessment) / stats.total) * 100)
    : 0

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {/* Activity Feed — left 3/5 */}
      <Card className="md:col-span-3 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
            </div>
            <Link
              href="/applications"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-1">
            {/* Follow-up reminders (inline) */}
            {followUpApps.length > 0 && (
              <div className="mb-3 p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-3.5 w-3.5 text-warning" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Follow-up Recommended
                  </span>
                </div>
                <div className="space-y-1.5">
                  {followUpApps.map((app) => (
                    <Link
                      key={app.id}
                      href={`/applications/${app.id}`}
                      className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
                    >
                      <div className="text-xs min-w-0">
                        <span className="font-medium text-foreground">{app.jobTitle}</span>
                        <span className="text-muted-foreground"> at {app.companyName}</span>
                      </div>
                      <span className="text-[10px] font-medium text-primary shrink-0">Follow up →</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Recent applications */}
            {recentApps.length > 0 ? (
              recentApps.map((app) => (
                <Link
                  key={app.id}
                  href={`/applications/${app.id}`}
                  className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                    {app.companyName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{app.jobTitle}</p>
                    <p className="text-xs text-muted-foreground">{app.companyName}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className={`h-2 w-2 rounded-full ${STATUS_DOT[app.status] || "bg-muted-foreground"}`} />
                    <span className="text-[10px] font-medium text-muted-foreground">{app.status}</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="py-8 text-center">
                <p className="text-xs text-muted-foreground">No applications yet</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Paste a JD above to get started</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Insights — right 2/5 */}
      <Card className="md:col-span-2 overflow-hidden">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Insights</h3>
          </div>

          {/* Weekly Goals (compact) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Target className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Weekly Goals</span>
              </div>
              <Link href="/weekly-goals" className="text-[10px] text-primary hover:underline">
                Edit
              </Link>
            </div>
            {goalsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : weeklyGoals ? (
              <div className="space-y-2">
                {[
                  { label: weeklyGoals.goal1, target: weeklyGoals.goal1Target, progress: weeklyGoals.goal1Progress, status: weeklyGoals.goal1Status },
                  weeklyGoals.goal2 ? { label: weeklyGoals.goal2, target: weeklyGoals.goal2Target, progress: weeklyGoals.goal2Progress, status: weeklyGoals.goal2Status } : null,
                  weeklyGoals.goal3 ? { label: weeklyGoals.goal3, target: weeklyGoals.goal3Target, progress: weeklyGoals.goal3Progress, status: weeklyGoals.goal3Status } : null,
                ]
                  .filter(Boolean)
                  .map((g, i) => (
                    <div key={i} className="rounded-md border border-border p-2">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-medium text-foreground truncate">{g!.label}</span>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                          g!.status === "Achieved"
                            ? "bg-success/10 text-success"
                            : g!.status === "InProgress"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                        }`}>
                          {g!.status === "NotStarted" ? "Pending" : g!.status}
                        </span>
                      </div>
                      {g!.target != null && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${Math.min(100, ((g!.progress || 0) / g!.target) * 100)}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-muted-foreground shrink-0">
                            {g!.progress || 0}/{g!.target}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border p-3 text-center">
                <p className="text-[10px] text-muted-foreground">No goals this week</p>
                <Button variant="link" size="sm" className="text-[10px] text-primary h-auto p-0 mt-1" asChild>
                  <Link href="/weekly-goals">Set goals →</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Quick stats insights */}
          <div className="space-y-2 pt-2 border-t border-border">
            {interviewRate > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 shrink-0" />
                <span>Interview rate: <span className="font-semibold text-foreground">{interviewRate}%</span></span>
              </div>
            )}
            {topSource && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="h-3 w-3 shrink-0" />
                <span>Top source: <span className="font-semibold text-foreground">{topSource.source}</span> ({topSource.count})</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
