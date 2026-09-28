"use client"

import { useMemo } from "react"
import { Clock, TrendingUp, Briefcase } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Application } from "./types"
import { boardColumns } from "./types"
import { isFollowUpDue } from "@/lib/applications/follow-up-utils"

interface PipelineFunnelStripProps {
  applications: Application[]
  total: number
  selectedStage?: string
  onSelectStage?: (stage: string) => void
  followUpOnly?: boolean
  onToggleFollowUpOnly?: () => void
}

export function PipelineFunnelStrip({
  applications,
  total,
  selectedStage,
  onSelectStage,
  followUpOnly,
  onToggleFollowUpOnly,
}: PipelineFunnelStripProps) {
  // Count by stage
  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const col of boardColumns) {
      map[col.key] = applications.filter((app) =>
        (col.statuses as readonly string[]).includes(app.status)
      ).length
    }
    return map
  }, [applications])

  // Count dormant follow-ups
  const followUpCount = useMemo(() => {
    return applications.filter((app) => isFollowUpDue(app)).length
  }, [applications])

  // Calculate advanced & offers
  const advancedCount = (counts.interviews || 0) + (counts.offer || 0)
  const responseRate = total > 0 ? Math.round((advancedCount / total) * 100) : 0

  return (
    <div className="relative border border-border bg-card rounded-[6px] overflow-hidden select-none">
      {/* 1. Proportional Pipeline Funnel Bar */}
      <div className="flex h-2 w-full bg-muted/40 divide-x divide-background overflow-hidden">
        {boardColumns.map((col) => {
          const count = counts[col.key] || 0
          const pct = total > 0 ? (count / total) * 100 : 0
          if (pct === 0) return null

          return (
            <div
              key={col.key}
              style={{ width: `${pct}%` }}
              className={cn("h-full transition-all duration-300", col.dot)}
              title={`${col.title}: ${count} (${Math.round(pct)}%)`}
            />
          )
        })}
      </div>

      {/* 2. Interactive Stage Metric Strip */}
      <div className="p-3 sm:px-4 sm:py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Stage Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {boardColumns.map((col) => {
            const count = counts[col.key] || 0
            const isSelected = selectedStage?.toLowerCase() === col.statuses[0]?.toLowerCase()

            return (
              <button
                key={col.key}
                type="button"
                onClick={() => onSelectStage?.(isSelected ? "" : col.statuses[0])}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs font-medium border transition-all cursor-pointer shrink-0",
                  isSelected
                    ? "border-foreground/30 bg-muted text-foreground font-semibold shadow-2xs"
                    : "border-border/70 bg-background hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <span className={cn("size-2 rounded-full", col.dot)} />
                <span>{col.title}</span>
                <span className="font-mono text-[11px] tabular-nums opacity-80 font-bold">
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Executive Metrics: Response Rate & Follow-Up Alert */}
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto border-t md:border-t-0 border-border/50 pt-2 md:pt-0">
          {/* Conversion rate */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2 py-0.5">
            <TrendingUp className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium text-foreground tabular-nums">{responseRate}%</span>
            <span className="hidden sm:inline">Conversion</span>
          </div>

          <div className="h-3.5 w-px bg-border hidden sm:block" />

          {/* Follow-up trigger button */}
          {followUpCount > 0 ? (
            <button
              type="button"
              onClick={onToggleFollowUpOnly}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs font-medium border font-mono transition-colors cursor-pointer",
                followUpOnly
                  ? "border-amber-500 bg-amber-500 text-white font-semibold"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
              )}
              title={followUpOnly ? "Show all applications" : "Filter by applications needing follow-up"}
            >
              <Clock className="size-3" />
              <span>{followUpCount} Due</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
              <Briefcase className="size-3" />
              <span>{total} active</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
