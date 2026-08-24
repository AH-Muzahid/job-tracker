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
      <section
        role="region"
        aria-label="Recent Applications Activity Stream"
        className="lg:col-span-3 rounded-xl border border-border/80 bg-card/70 backdrop-blur-2xl p-5 sm:p-6 shadow-sm hover:border-border/90 hover:shadow-md transition-all duration-300 flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground tracking-tight">Recent Activity Stream</h2>
                <p className="text-[10px] font-mono text-muted-foreground">Latest job updates & outreach reminders</p>
              </div>
            </div>
            <Link
              href="/applications"
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline font-mono transition-all"
            >
              All Roles <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Follow Up Banner */}
          {followUpApps.length > 0 && (
            <div className="mb-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" />
                  <span>Outreach Reminders ({followUpApps.length} Stale Roles)</span>
                </div>
              </div>
              <div className="space-y-1.5">
                {followUpApps.map((app) => (
                  <Link
                    key={app.id}
                    href={`/applications/${app.id}`}
                    className="flex items-center justify-between p-2 rounded-md bg-background/60 hover:bg-background transition-colors text-xs border border-amber-500/20"
                  >
                    <span className="font-medium text-foreground truncate">
                      {app.jobTitle} <span className="text-muted-foreground">at {app.companyName}</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0">
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
                  className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-card/50 hover:bg-card hover:border-primary/40 hover:shadow-xs transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-mono font-bold text-xs border border-primary/20 group-hover:scale-105 transition-transform">
                      {app.companyName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {app.jobTitle}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate font-medium">
                        {app.companyName}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono font-semibold border px-2.5 py-0.5 rounded-full ${
                      STATUS_PILL[app.status] || "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {app.status}
                  </span>
                </Link>
              ))
            ) : (
              <div className="py-8 text-center border border-dashed border-border/60 rounded-lg">
                <p className="text-xs text-muted-foreground">No recent application activity</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Insights Bento — right 2/5 */}
      <section
        role="region"
        aria-label="Target Goals & AI Insights"
        className="lg:col-span-2 rounded-xl border border-border/80 bg-card/70 backdrop-blur-2xl p-5 sm:p-6 shadow-sm hover:border-border/90 hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-4"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-500 border border-purple-500/20">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground tracking-tight">Goals & AI Insights</h2>
                <p className="text-[10px] font-mono text-muted-foreground">Target progress & AI performance</p>
              </div>
            </div>
            <Sparkles className="h-4 w-4 text-purple-500" />
          </div>

          {/* Weekly Goals Widget */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                Weekly Target Goals
              </span>
              <Link href="/weekly-goals" className="text-[10px] font-mono text-primary font-semibold hover:underline">
                Manage Goals
              </Link>
            </div>

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
                  .map((g, i) => (
                    <div key={i} className="p-2.5 rounded-lg border border-border/60 bg-background/50 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground truncate">{g!.label}</span>
                        <span className="font-mono text-[10px] text-muted-foreground font-medium">{g!.status}</span>
                      </div>
                      {g!.target != null && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-500"
                              style={{ width: `${Math.min(100, ((g!.progress || 0) / g!.target) * 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-foreground shrink-0">
                            {g!.progress || 0}/{g!.target}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg border border-dashed border-border/80 text-center">
                <p className="text-xs text-muted-foreground">No weekly targets configured</p>
              </div>
            )}
          </div>

          {/* Micro AI Insight Cards */}
          <div className="pt-3 border-t border-border/60 space-y-2">
            {interviewRate > 0 && (
              <div className="p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/20 text-xs flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-purple-500 shrink-0" />
                <span className="text-muted-foreground">Interview conversion rate is currently <strong className="text-foreground">{interviewRate}%</strong></span>
              </div>
            )}
            {topSource && (
              <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="text-muted-foreground">Top source: <strong className="text-foreground">{topSource.source}</strong> ({topSource.count} roles)</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
