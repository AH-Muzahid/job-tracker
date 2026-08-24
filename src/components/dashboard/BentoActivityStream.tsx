"use client"

import Link from "next/link"
import { Clock, ArrowUpRight, Target, AlertCircle } from "lucide-react"

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

interface BentoActivityStreamProps {
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

const STATUS_PILL: Record<string, string> = {
  Saved: "bg-status-saved/20 text-status-saved border-status-saved/30",
  Applied: "bg-status-applied/20 text-status-applied border-status-applied/30",
  Assessment: "bg-status-assessment/20 text-status-assessment border-status-assessment/30",
  Interview: "bg-status-interview/20 text-status-interview border-status-interview/30",
  Rejected: "bg-status-rejected/20 text-status-rejected border-status-rejected/30",
  Offer: "bg-status-offer/20 text-status-offer border-status-offer/30",
}

export default function BentoActivityStream({
  recentApps,
  followUpApps,
  weeklyGoals,
  goalsLoading,
  stats,
}: BentoActivityStreamProps) {
  const topSource = stats.bySource[0]
  const interviewRate = stats.total > 0
    ? Math.round(((stats.interview + stats.assessment) / stats.total) * 100)
    : 0

  return (
    <div className="grid gap-3 lg:grid-cols-5">
      {/* Activity Feed — left 3/5 */}
      <section
        role="region"
        aria-label="Recent Applications Activity Stream"
        className="lg:col-span-3 rounded-xl border border-border/80 bg-card/60 backdrop-blur-2xl p-4 sm:p-5 shadow-sm hover:border-zinc-700 transition-all duration-200 flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-muted/60 text-foreground border border-border/60">
                <Clock className="h-3.5 w-3.5" />
              </div>
              <div>
                <h2 className="text-xs font-mono font-medium text-foreground tracking-tight">Recent Activity Stream</h2>
                <p className="text-[11px] text-muted-foreground">Live application events & stage transitions</p>
              </div>
            </div>
            <Link
              href="/applications"
              className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-foreground transition-colors"
            >
              All Roles <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Follow Up Banner */}
          {followUpApps.length > 0 && (
            <div className="mb-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-amber-400">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span className="font-mono text-[11px]">Follow-Up Reminders ({followUpApps.length} Stale Roles)</span>
                </div>
              </div>
              <div className="space-y-1">
                {followUpApps.map((app) => (
                  <Link
                    key={app.id}
                    href={`/applications/${app.id}`}
                    className="flex items-center justify-between p-2 rounded-md bg-background/50 hover:bg-background transition-colors text-xs border border-amber-500/20"
                  >
                    <span className="font-medium text-zinc-200 truncate">
                      {app.jobTitle} <span className="text-zinc-500">at {app.companyName}</span>
                    </span>
                    <span className="text-[10px] font-mono text-amber-400 shrink-0">
                      Follow Up →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent Applications Cards */}
          <div className="space-y-1.5">
            {recentApps.length > 0 ? (
              recentApps.map((app) => (
                <Link
                  key={app.id}
                  href={`/applications/${app.id}`}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-background/30 hover:bg-card hover:border-zinc-700 transition-all group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/60 text-foreground font-mono font-medium text-xs border border-border/60">
                      {app.companyName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {app.jobTitle}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate font-mono">
                        {app.companyName}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono border px-2 py-0.5 rounded ${
                      STATUS_PILL[app.status] || "bg-muted/40 text-muted-foreground border-border/60"
                    }`}
                  >
                    {app.status}
                  </span>
                </Link>
              ))
            ) : (
              <div className="py-8 text-center border border-dashed border-border/60 rounded-lg">
                <p className="text-xs font-mono text-muted-foreground">No recent application activity</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Insights Bento — right 2/5 (Vercel Checklist Style) */}
      <section
        role="region"
        aria-label="Target Goals & AI Insights"
        className="lg:col-span-2 rounded-xl border border-border/80 bg-card/60 backdrop-blur-2xl p-4 sm:p-5 shadow-sm hover:border-zinc-700 transition-all duration-200 flex flex-col justify-between space-y-4"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-muted/60 text-foreground border border-border/60">
                <Target className="h-3.5 w-3.5" />
              </div>
              <div>
                <h2 className="text-xs font-mono font-medium text-foreground tracking-tight">Sprint Targets</h2>
                <p className="text-[11px] text-muted-foreground">Weekly goals & velocity</p>
              </div>
            </div>
            <Link href="/weekly-goals" className="text-[10px] font-mono text-zinc-400 hover:text-foreground">
              Manage →
            </Link>
          </div>

          {/* Weekly Goals Widget (Checklist Style) */}
          <div className="space-y-2">
            {goalsLoading ? (
              <div className="h-20 bg-muted/40 rounded-lg animate-pulse" />
            ) : weeklyGoals ? (
              <div className="space-y-2">
                {[
                  { label: weeklyGoals.goal1, target: weeklyGoals.goal1Target, progress: weeklyGoals.goal1Progress, status: weeklyGoals.goal1Status },
                  weeklyGoals.goal2 ? { label: weeklyGoals.goal2, target: weeklyGoals.goal2Target, progress: weeklyGoals.goal2Progress, status: weeklyGoals.goal2Status } : null,
                  weeklyGoals.goal3 ? { label: weeklyGoals.goal3, target: weeklyGoals.goal3Target, progress: weeklyGoals.goal3Progress, status: weeklyGoals.goal3Status } : null,
                ]
                  .filter(Boolean)
                  .map((g, i) => {
                    const isCompleted = g!.target != null && (g!.progress || 0) >= g!.target
                    return (
                      <div key={i} className="p-2.5 rounded-lg border border-border/60 bg-background/40 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-medium truncate flex items-center gap-1.5 ${isCompleted ? "text-emerald-400" : "text-zinc-200"}`}>
                            {isCompleted ? "✓" : "○"} {g!.label}
                          </span>
                          <span className="font-mono text-[10px] text-zinc-500">{g!.status}</span>
                        </div>
                        {g!.target != null && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${isCompleted ? "bg-emerald-500" : "bg-primary"}`}
                                style={{ width: `${Math.min(100, ((g!.progress || 0) / g!.target) * 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                              {g!.progress || 0}/{g!.target}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            ) : (
              <div className="p-3 rounded-lg border border-dashed border-border/60 text-center">
                <p className="text-xs font-mono text-muted-foreground">No weekly targets configured</p>
              </div>
            )}
          </div>

          {/* Micro AI Insight Cards */}
          <div className="pt-3 border-t border-border/40 space-y-1.5 font-mono text-xs">
            {interviewRate > 0 && (
              <div className="p-2 rounded-lg bg-purple-500/5 border border-purple-500/20 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                <span className="text-zinc-400 text-[11px]">Interview conversion: <strong className="text-foreground">{interviewRate}%</strong></span>
              </div>
            )}
            {topSource && (
              <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/20 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                <span className="text-zinc-400 text-[11px]">Top source: <strong className="text-foreground">{topSource.source}</strong> ({topSource.count})</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
