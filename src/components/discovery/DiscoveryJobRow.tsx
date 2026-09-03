"use client"

import { useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BrainCircuit, BookmarkPlus, Check, ExternalLink, MapPin,
  DollarSign, Zap, Globe, RefreshCw, X, Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DecorIcon } from "@/components/decor-icon"
import { cn } from "@/lib/utils"
import { getScoreBadgeClass, getSourceBadge, getBatchSlotBadge } from "./types"
import type { ExternalJobOpportunity } from "@/lib/ai/graph/tools/discovery-tools"

interface DiscoveryJobRowProps {
  job: ExternalJobOpportunity
  isExpanded: boolean
  isSaved: boolean
  isSaving: boolean
  onToggle: () => void
  onSave: () => void
}

export function DiscoveryJobRow({ job, isExpanded, isSaved, isSaving, onToggle, onSave }: DiscoveryJobRowProps) {
  const sourceBadge = getSourceBadge(job.sourceBoard)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && isExpanded) onToggle()
  }, [isExpanded, onToggle])

  useEffect(() => {
    if (isExpanded) {
      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isExpanded, handleKeyDown])

  return (
    <div
      className={cn(
        "transition-colors",
        isExpanded
          ? "bg-card border border-border/60 rounded-none my-1 shadow-xs relative"
          : "border-b border-border/40 py-3 px-4 cursor-pointer hover:bg-muted/30"
      )}
      onClick={!isExpanded ? onToggle : undefined}
    >
      {isExpanded && <DecorIcon position="top-right" />}
      {isExpanded && <DecorIcon position="bottom-left" />}

      {/* Row content */}
      <div className={cn("flex items-start sm:items-center gap-3", isExpanded && "px-4 pt-3 pb-2")}>
        <div className="size-8 rounded-none bg-muted flex items-center justify-center font-bold text-xs text-foreground shrink-0 border border-border mt-0.5 sm:mt-0">
          {job.company.slice(0, 2).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {job.title}
            </h3>

            {/* Mobile-only compact fit score */}
            <span className={cn("sm:hidden flex items-center gap-1 px-1.5 py-0.2 rounded-none text-[10px] font-bold border shrink-0", getScoreBadgeClass(job.fitScore))}>
              <BrainCircuit className="size-2.5" />
              {job.fitScore}%
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
            <span className="text-xs text-muted-foreground font-medium">{job.company}</span>
            <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate max-w-[110px]">{job.location}</span>
            </span>
            {job.salary && (
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <DollarSign className="size-3 shrink-0" />
                {job.salary}
              </span>
            )}

            {/* Mobile-only badges displayed on second line */}
            <div className="flex sm:hidden items-center gap-1.5 mt-0.5">
              {job.batchSlot && (
                <span className={cn("inline-flex items-center gap-0.5 px-1 py-0.2 rounded-none text-[9px] font-medium border", getBatchSlotBadge(job.batchSlot).color)}>
                  <Clock className="size-2" />
                  {getBatchSlotBadge(job.batchSlot).label}
                </span>
              )}
              <span className={cn("inline-flex items-center gap-0.5 px-1 py-0.2 rounded-none text-[9px] font-medium border", sourceBadge.color)}>
                <Globe className="size-2" />
                {sourceBadge.label}
              </span>
            </div>
          </div>
        </div>

        {/* Desktop-only badges aligned to right */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          {job.batchSlot && (
            <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-none text-[10px] font-medium border", getBatchSlotBadge(job.batchSlot).color)}>
              <Clock className="size-2.5" />
              {getBatchSlotBadge(job.batchSlot).label}
            </span>
          )}
          <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-none text-[11px] font-bold border", getScoreBadgeClass(job.fitScore))}>
            <BrainCircuit className="size-3" />
            {job.fitScore}%
          </span>
          <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-none text-[10px] font-medium border", sourceBadge.color)}>
            <Globe className="size-2.5" />
            {sourceBadge.label}
          </span>
        </div>

        {!isExpanded && (
          <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-[200px] hidden xl:block">
            {job.matchRationale}
          </div>
        )}
      </div>

      {/* Tags row (collapsed) */}
      {!isExpanded && job.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5 ml-11">
          {job.tags.slice(0, 4).map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0 bg-muted/70 rounded-none text-muted-foreground">{t}</span>
          ))}
          {job.tags.length > 4 && <span className="text-[10px] text-muted-foreground">+{job.tags.length - 4}</span>}
        </div>
      )}

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-3">
              {/* AI Rationale */}
              <div className="bg-muted/30 rounded-none p-3 border border-border/60">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1 mb-1">
                  <Zap className="size-3 text-primary" />
                  AI Rationale
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{job.matchRationale}</p>
              </div>

              {/* Tags */}
              {job.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {job.tags.map((t) => (
                    <span key={t} className="text-[10px] px-1.5 py-0 bg-muted/70 rounded-none text-muted-foreground border border-border/50">{t}</span>
                  ))}
                </div>
              )}

              {/* Source */}
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Globe className="size-3" />
                <span>{sourceBadge.label}</span>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant={isSaved ? "secondary" : "default"}
                  disabled={isSaved || isSaving}
                  onClick={(e) => { e.stopPropagation(); onSave() }}
                  className="h-8 text-xs gap-1.5 cursor-pointer font-medium rounded-none flex-1 sm:flex-initial"
                >
                  {isSaved ? (
                    <><Check className="size-3.5 text-emerald-500" /><span>Saved</span></>
                  ) : isSaving ? (
                    <><RefreshCw className="size-3.5 animate-spin" /><span>Saving...</span></>
                  ) : (
                    <><BookmarkPlus className="size-3.5" /><span>Save to Tracker</span></>
                  )}
                </Button>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center justify-center gap-1 h-8 px-3 rounded-none border border-border text-xs text-muted-foreground hover:text-foreground font-medium transition-colors flex-1 sm:flex-initial"
                >
                  <span>View on {sourceBadge.label}</span>
                  <ExternalLink className="size-3" />
                </a>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggle() }}
                  className="ml-auto text-muted-foreground hover:text-foreground cursor-pointer p-1"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
