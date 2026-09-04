"use client"

import { useEffect, useCallback, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BrainCircuit, BookmarkPlus, Check, ExternalLink, MapPin,
  DollarSign, Zap, Globe, RefreshCw, X, Clock, EyeOff,
  Copy, CheckCheck, UserCheck, MessageSquare,
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
  isDismissing?: boolean
  onToggle: () => void
  onSave: () => void
  onDismiss?: () => void
  onApplyClick?: () => void
}

export function DiscoveryJobRow({
  job,
  isExpanded,
  isSaved,
  isSaving,
  isDismissing = false,
  onToggle,
  onSave,
  onDismiss,
  onApplyClick,
}: DiscoveryJobRowProps) {
  const sourceBadge = getSourceBadge(job.sourceBoard)
  const [copiedPitch, setCopiedPitch] = useState(false)
  const [showPitch, setShowPitch] = useState(false)
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false)

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
              {job.appliedStatus && (
                <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-none text-[9px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <Check className="size-2" />
                  Applied
                </span>
              )}
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
          {job.appliedStatus && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Check className="size-2.5" />
              <span>Applied ({job.appliedStatus})</span>
            </span>
          )}
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
          {onDismiss && !isExpanded && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDismiss()
              }}
              disabled={isDismissing}
              title="Dismiss this job from feed"
              className="size-6 inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-none cursor-pointer ml-1"
            >
              <EyeOff className="size-3" />
            </button>
          )}
        </div>

        {!isExpanded && (
          <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-[320px] hidden lg:block" title={job.matchRationale}>
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
              {/* AI Rationale & In-Depth Personalization */}
              <div className="bg-muted/20 rounded-none p-3.5 border border-border/60 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Zap className="size-3.5 text-primary" />
                    <span>AI Personalization & Match Rationale</span>
                  </p>
                  <div className="flex items-center gap-2">
                    {typeof job.atsScore === "number" && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none text-[10px] font-mono border bg-background/60 text-muted-foreground border-border">
                        <span>ATS Match:</span>
                        <span className={cn(
                          "font-bold",
                          job.atsScore >= 75 ? "text-emerald-500" : job.atsScore >= 60 ? "text-amber-500" : "text-muted-foreground"
                        )}>
                          {job.atsScore}%
                        </span>
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
                      Evaluated against profile & bestProjects
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5 pt-0.5">
                  {job.matchRationale.split(" • ").map((dimension, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                      <span className="text-primary/70 shrink-0 select-none">•</span>
                      <span>{dimension}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Direct Author Outreach (On-Demand Generation) */}
              {(job.outreachPitch || job.authorName || job.sourceBoard === "linkedin_post") && (
                <div className="bg-primary/5 border border-primary/25 p-3 rounded-none space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-primary/20 pb-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <MessageSquare className="size-3.5" />
                      <span>Direct Author Outreach (Bypasses ATS)</span>
                    </div>
                    {job.authorName && (
                      <span className="text-[11px] text-muted-foreground font-mono">
                        Author / Recruiter: {job.authorName}
                      </span>
                    )}
                  </div>

                  {!showPitch ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                      <p className="text-xs text-muted-foreground">
                        Ready to reach out? Generate a custom 2-sentence cold message referencing your verified projects.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isGeneratingPitch}
                        onClick={(e) => {
                          e.stopPropagation()
                          setIsGeneratingPitch(true)
                          setTimeout(() => {
                            setIsGeneratingPitch(false)
                            setShowPitch(true)
                          }, 300)
                        }}
                        className="h-7 text-[11px] gap-1.5 rounded-none font-medium text-primary hover:text-primary hover:bg-primary/10 border-primary/30 shrink-0 cursor-pointer"
                      >
                        {isGeneratingPitch ? (
                          <>
                            <RefreshCw className="size-3 animate-spin text-primary" />
                            <span>Generating Pitch...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="size-3 text-primary" />
                            <span>Generate Outreach Pitch</span>
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs text-muted-foreground leading-relaxed italic bg-background/60 p-2.5 border border-border/50 select-all">
                        &ldquo;{job.outreachPitch || `Hi ${job.authorName ? job.authorName.split(" ")[0] : "Hiring Lead"}, I noticed your opening for ${job.title} at ${job.company}. My verified full-stack projects align closely with your stack requirements. I'd love to share my portfolio and connect!`}&rdquo;
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            const pitchText = job.outreachPitch || `Hi ${job.authorName ? job.authorName.split(" ")[0] : "Hiring Lead"}, I noticed your opening for ${job.title} at ${job.company}. My verified full-stack projects align closely with your stack requirements. I'd love to share my portfolio and connect!`
                            navigator.clipboard.writeText(pitchText)
                            setCopiedPitch(true)
                            setTimeout(() => setCopiedPitch(false), 2000)
                          }}
                          className="h-7 text-[11px] gap-1.5 rounded-none font-medium cursor-pointer"
                        >
                          {copiedPitch ? (
                            <>
                              <CheckCheck className="size-3 text-emerald-500" />
                              <span>Copied to Clipboard!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3" />
                              <span>Copy Tailored DM Pitch</span>
                            </>
                          )}
                        </Button>
                        {job.authorUrl && (
                          <a
                            href={job.authorUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-medium border border-border text-foreground hover:bg-muted/40 transition-colors"
                          >
                            <UserCheck className="size-3 text-primary" />
                            <span>View Author Profile</span>
                            <ExternalLink className="size-2.5 opacity-70" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowPitch(false)
                          }}
                          className="text-[11px] text-muted-foreground hover:text-foreground ml-auto cursor-pointer underline underline-offset-2"
                        >
                          Collapse
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                <span>Source: {sourceBadge.label}</span>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {job.appliedStatus ? (
                  <div className="inline-flex items-center gap-1.5 h-8 px-3 text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium">
                    <Check className="size-3.5" />
                    <span>Already in Tracker ({job.appliedStatus})</span>
                  </div>
                ) : (
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
                )}

                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation()
                    onApplyClick?.()
                  }}
                  className="inline-flex items-center justify-center gap-1 h-8 px-3 rounded-none border border-border text-xs text-muted-foreground hover:text-foreground font-medium transition-colors flex-1 sm:flex-initial"
                >
                  <span>
                    {job.sourceBoard === "curated"
                      ? `Apply at ${job.company}`
                      : `View on ${sourceBadge.label}`}
                  </span>
                  <ExternalLink className="size-3" />
                </a>

                {onDismiss && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isDismissing}
                    onClick={(e) => {
                      e.stopPropagation()
                      onDismiss()
                    }}
                    className="h-8 text-xs gap-1 cursor-pointer text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10 rounded-none"
                  >
                    <EyeOff className="size-3.5" />
                    <span>Dismiss</span>
                  </Button>
                )}

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
