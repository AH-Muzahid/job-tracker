"use client"

import Link from "next/link"
import { Clock, ArrowUpRight, Target, Sparkles, AlertCircle } from "lucide-react"

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
    <div className="grid gap-4 lg:grid-cols-5">
      {/* Activity Feed — left 3/5 */}
      <div className="lg:col-span-3 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xl p-5 shadow-sm hover:border-border transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Live Activity Stream
            </span>
          </div>
          <Link
            href="/applications"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-mono transition-colors"
          >
            All Roles <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Follow Up Banner */}
        {followUpApps.length > 0 && (
          <div className="mb-3 p-3 rounded-xl border border-warning/30 bg-warning/5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-warning">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Outreach Reminders ({followUpApps.length} Stale Roles)</span>
            </div>
            <div className="space-y-1">
              {followUpApps.map((app) => (
                <Link
                  key={app.id}
                  href={`/applications/${app.id}`}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-muted/40 transition-colors text-xs"
                >
                  <span className="font-medium text-foreground truncate">
                    {app.jobTitle} <span className="text-muted-foreground">at {app.companyName}</span>
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-warning shrink-0">
                    Follow Up →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Applications Cards */}
        <div className="space-y-2">
          {recentApps.length > 0 ? (
            recentApps.map((app) => (
              <Link
                key={app.id}
                href={`/applications/${app.id}`}
                className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/30 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted font-mono font-bold text-xs text-muted-foreground">
                    {app.companyName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {app.jobTitle}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {app.companyName}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-mono border px-2 py-0.5 rounded-full ${
                    STATUS_PILL[app.status] || "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {app.status}
                </span>
              </Link>
            ))
          ) : (
            <div className="py-8 text-center border border-dashed border-border/60 rounded-xl">
              <p className="text-xs text-muted-foreground">No recent application activity</p>
            </div>
          )}
        </div>
      </div>

      {/* Insights Bento — right 2/5 */}
      <div className="lg:col-span-2 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xl p-5 shadow-sm hover:border-border transition-all duration-300 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Target Goals & AI Insights
          </span>
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>

        {/* Weekly Goals Widget */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-muted-foreground" /> Weekly Target
            </span>
            <Link href="/weekly-goals" className="text-[10px] font-mono text-primary hover:underline">
              Manage
            </Link>
          </div>

          {goalsLoading ? (
            <div className="h-16 bg-muted/40 rounded-xl animate-pulse" />
          ) : weeklyGoals ? (
            <div className="space-y-2">
              {[
                { label: weeklyGoals.goal1, target: weeklyGoals.goal1Target, progress: weeklyGoals.goal1Progress, status: weeklyGoals.goal1Status },
                weeklyGoals.goal2 ? { label: weeklyGoals.goal2, target: weeklyGoals.goal2Target, progress: weeklyGoals.goal2Progress, status: weeklyGoals.goal2Status } : null,
                weeklyGoals.goal3 ? { label: weeklyGoals.goal3, target: weeklyGoals.goal3Target, progress: weeklyGoals.goal3Progress, status: weeklyGoals.goal3Status } : null,
              ]
                .filter(Boolean)
                .map((g, i) => (
                  <div key={i} className="p-2.5 rounded-xl border border-border/50 bg-background/50 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-foreground truncate">{g!.label}</span>
                      <span className="font-mono text-[9px] text-muted-foreground">{g!.status}</span>
                    </div>
                    {g!.target != null && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${Math.min(100, ((g!.progress || 0) / g!.target) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-muted-foreground shrink-0">
                          {g!.progress || 0}/{g!.target}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <div className="p-3 rounded-xl border border-dashed border-border text-center">
              <p className="text-[11px] text-muted-foreground">No weekly targets set</p>
            </div>
          )}
        </div>

        {/* Micro AI Insight Cards */}
        <div className="pt-2 border-t border-border/60 space-y-2">
          {interviewRate > 0 && (
            <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 text-xs flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Interview conversion rate is currently <strong className="text-foreground">{interviewRate}%</strong></span>
            </div>
          )}
          {topSource && (
            <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 text-xs flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Top performing channel: <strong className="text-foreground">{topSource.source}</strong> ({topSource.count})</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
