"use client"

import { Zap, BrainCircuit, ExternalLink, BookmarkPlus, Check, RefreshCw, EyeOff, MapPin, DollarSign, Globe, ShieldCheck, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DecorIcon } from "@/components/decor-icon"
import { cn } from "@/lib/utils"
import { getScoreBadgeClass, getSourceBadge, getVisaBadge } from "./types"
import type { ExternalJobOpportunity } from "@/lib/discovery/types"

interface DiscoveryTopPicksProps {
  topPicks: ExternalJobOpportunity[]
  savedJobs: Set<string>
  isSavingId?: string | null
  onSave: (job: ExternalJobOpportunity) => void
  onDismiss: (job: ExternalJobOpportunity) => void
  onApplyClick?: (job: ExternalJobOpportunity) => void
  onSelectJob?: (jobId: string) => void
}

export function DiscoveryTopPicks({
  topPicks,
  savedJobs,
  isSavingId,
  onSave,
  onDismiss,
  onApplyClick,
  onSelectJob,
}: DiscoveryTopPicksProps) {
  // Graceful degradation: only render when there is at least one 90%+ match
  const eligiblePicks = topPicks.filter((j) => j.fitScore >= 90).slice(0, 3)

  if (eligiblePicks.length === 0) {
    return null
  }

  return (
    <div className="mb-6 space-y-3">
      {/* Blueprint Header */}
      <div className="flex items-center justify-between border-b border-border/70 pb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono">
            <Zap className="size-3" />
            Top Picks • 90%+ Match
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Curated high-signal roles matched directly to your verified skills
          </span>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground">
          {eligiblePicks.length} Selected
        </span>
      </div>

      {/* Blueprint Top Picks Grid */}
      <div className={cn(
        "grid gap-3",
        eligiblePicks.length === 1 ? "grid-cols-1" :
        eligiblePicks.length === 2 ? "grid-cols-1 md:grid-cols-2" :
        "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      )}>
        {eligiblePicks.map((job) => {
          const isSaved = savedJobs.has(job.id)
          const isSaving = isSavingId === job.id
          const sourceBadge = getSourceBadge(job.sourceBoard)
          const visaBadge = getVisaBadge(job.visaSponsorship)

          return (
            <div
              key={job.id}
              onClick={() => onSelectJob?.(job.id)}
              className="group relative bg-card border border-border/80 hover:border-emerald-500/50 p-4 rounded-none shadow-xs transition-all flex flex-col justify-between cursor-pointer"
            >
              <DecorIcon position="top-right" />
              <DecorIcon position="bottom-left" />

              <div>
                {/* Top badges bar */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[11px] font-bold border",
                    getScoreBadgeClass(job.fitScore)
                  )}>
                    <BrainCircuit className="size-3" />
                    <span>{job.fitScore}% Fit</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {visaBadge && (
                      <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-none text-[10px] font-medium border", visaBadge.color)}>
                        <ShieldCheck className="size-2.5" />
                        <span>{visaBadge.label}</span>
                      </span>
                    )}

                    {job.freshnessLabel && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-none text-[10px] font-medium border bg-muted/40 text-muted-foreground border-border/60">
                        <Clock className="size-2.5" />
                        <span>{job.freshnessLabel}</span>
                      </span>
                    )}

                    <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-none text-[10px] font-medium border", sourceBadge.color)}>
                      <Globe className="size-2.5" />
                      <span>{sourceBadge.label}</span>
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDismiss(job)
                      }}
                      title="Dismiss from feed"
                      className="size-6 inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-none cursor-pointer"
                    >
                      <EyeOff className="size-3" />
                    </button>
                  </div>
                </div>

                {/* Company & Title */}
                <div className="space-y-1 mb-2">
                  <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {job.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{job.company}</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-0.5 text-[11px]">
                      <MapPin className="size-3 shrink-0" />
                      <span className="truncate max-w-[120px]">{job.location}</span>
                    </span>
                  </div>
                  {job.salary && (
                    <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 pt-0.5">
                      <DollarSign className="size-3 shrink-0" />
                      <span>{job.salary}</span>
                    </div>
                  )}
                </div>

                {/* Match Rationale Pill */}
                {job.matchRationale && (
                  <div className="p-2 bg-muted/30 border border-border/50 rounded-none mb-3 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                    <span className="text-emerald-500 font-medium mr-1">Match Reason:</span>
                    {job.matchRationale}
                  </div>
                )}

                {/* Tags */}
                {job.tags && job.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {job.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-muted/60 text-muted-foreground border border-border/40 rounded-none font-mono">
                        {tag}
                      </span>
                    ))}
                    {job.tags.length > 3 && (
                      <span className="text-[10px] text-muted-foreground self-center">
                        +{job.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant={isSaved ? "secondary" : "default"}
                  disabled={isSaved || isSaving}
                  onClick={() => onSave(job)}
                  className="h-7 text-xs gap-1.5 cursor-pointer font-medium rounded-none flex-1"
                >
                  {isSaved ? (
                    <><Check className="size-3 text-emerald-500" /><span>Saved</span></>
                  ) : isSaving ? (
                    <><RefreshCw className="size-3 animate-spin" /><span>Saving...</span></>
                  ) : (
                    <><BookmarkPlus className="size-3" /><span>Save to Tracker</span></>
                  )}
                </Button>

                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onApplyClick?.(job)}
                  className="inline-flex items-center justify-center gap-1 h-7 px-2.5 rounded-none border border-border text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
                >
                  <span>Apply</span>
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
