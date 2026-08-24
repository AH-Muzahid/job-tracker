"use client"

import { Bookmark, Mail, Clock, Target, Trash2, CheckCircle2 } from "lucide-react"
import { Application } from "./types"

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  Saved: { color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-500/10", icon: <Bookmark className="h-3.5 w-3.5" /> },
  Applied: { color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-500/10", icon: <Mail className="h-3.5 w-3.5" /> },
  Assessment: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", icon: <Clock className="h-3.5 w-3.5" /> },
  Interview: { color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-500/10", icon: <Target className="h-3.5 w-3.5" /> },
  Rejected: { color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10", icon: <Trash2 className="h-3.5 w-3.5" /> },
  Offer: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
}

interface MilestoneTimelineProps {
  application: Application
}

export function MilestoneTimeline({ application }: MilestoneTimelineProps) {
  return (
    <div className="space-y-4 py-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Application Milestones</h3>
      <div className="relative border-l border-border pl-5 space-y-6">
        {application.statusChanges.map((change) => {
          const cfg = STATUS_CONFIG[change.toStatus] || STATUS_CONFIG.Saved
          return (
            <div key={change.id} className="relative">
              {/* Dot indicator */}
              <span className="absolute -left-[27px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-background border border-border shadow-xs">
                <span className={`h-1.5 w-1.5 rounded-full ${change.toStatus === 'Offer' ? 'bg-emerald-500' : change.toStatus === 'Rejected' ? 'bg-rose-500' : 'bg-foreground'}`} />
              </span>
              
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {new Date(change.changedAt).toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-muted border border-border text-foreground">
                    {cfg.icon}
                    {change.toStatus}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {change.fromStatus ? (
                    <>
                      Status transitioned from <span className="font-medium text-foreground">{change.fromStatus}</span> to <span className="font-medium text-foreground">{change.toStatus}</span>.
                    </>
                  ) : (
                    <>Application created and set to status <span className="font-medium text-foreground">{change.toStatus}</span>.</>
                  )}
                </p>
              </div>
            </div>
          )
        })}
        {application.statusChanges.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-xs font-mono">No status changes recorded.</div>
        )}
      </div>
    </div>
  )
}
