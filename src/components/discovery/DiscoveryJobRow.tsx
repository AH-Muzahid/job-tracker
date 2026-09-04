"use client"

import { useEffect, useCallback, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BrainCircuit, BookmarkPlus, Check, ExternalLink, MapPin,
  Zap, Globe, RefreshCw, Clock, EyeOff,
  Copy, CheckCheck, UserCheck, MessageSquare, ShieldCheck,
  ChevronDown, ChevronUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DecorIcon } from "@/components/decor-icon"
import { cn } from "@/lib/utils"
import {
  getScoreBadgeClass,
  getSourceBadge,
  getVisaBadge,
  formatSalaryClean,
  parseMatchRationale,
} from "./types"
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
  const visaBadge = getVisaBadge(job.visaSponsorship)
  const cleanSalary = formatSalaryClean(job.salary)
  const parsedRationale = parseMatchRationale(job.matchRationale)

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
        "transition-colors group",
        isExpanded
          ? "bg-card border border-border/80 rounded-none my-2 shadow-xs relative"
          : "border-b border-border/50 py-3.5 px-4 cursor-pointer hover:bg-muted/20"
      )}
      onClick={!isExpanded ? onToggle : undefined}
    >
      {isExpanded && <DecorIcon position="top-right" />}
      {isExpanded && <DecorIcon position="bottom-left" />}

      {/* Main Row Content */}
      <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3", isExpanded && "px-4 pt-3.5 pb-2")}>
        {/* Left identity + details */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          {/* Company Avatar Monogram */}
          <div className="size-10 rounded-none bg-muted/80 flex items-center justify-center font-bold text-xs sm:text-sm text-foreground shrink-0 border border-border mt-0.5 sm:mt-0 font-mono select-none">
            {job.company.slice(0, 2).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Title & Fit Pill */}
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                {job.title}
              </h3>

              {/* Fit Score Badge */}
              <span className={cn(
                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-xs font-bold border shrink-0 font-mono",
                getScoreBadgeClass(job.fitScore)
              )}>
                <BrainCircuit className="size-3" />
                <span>{job.fitScore}% Match</span>
              </span>

              {/* Freshness Badge */}
              {job.freshnessLabel && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-xs font-medium border bg-muted/40 text-muted-foreground border-border/60 shrink-0">
                  <Clock className="size-3" />
                  <span>{job.freshnessLabel}</span>
                </span>
              )}
            </div>

            {/* Metadata Line */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground text-sm">{job.company}</span>
              <span className="text-muted-foreground/50 select-none">•</span>
              
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate max-w-[150px]">{job.location}</span>
              </span>

              {cleanSalary && (
                <>
                  <span className="text-muted-foreground/50 select-none">•</span>
                  <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20 rounded-none">
                    {cleanSalary}
                  </span>
                </>
              )}

              {visaBadge && (
                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-none font-medium border", visaBadge.color)}>
                  <ShieldCheck className="size-3" />
                  <span>{visaBadge.label}</span>
                </span>
              )}

              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-none font-medium border", sourceBadge.color)}>
                <Globe className="size-3" />
                <span>{sourceBadge.label}</span>
              </span>
            </div>

            {/* Tags (Collapsed View) */}
            {!isExpanded && job.tags && job.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {job.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 bg-muted/60 text-muted-foreground border border-border/50 rounded-none font-mono"
                  >
                    {tag}
                  </span>
                ))}
                {job.tags.length > 5 && (
                  <span className="text-xs text-muted-foreground/80 self-center font-mono">
                    +{job.tags.length - 5}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Instant Action Bar (Always Available on Collapsed Row) */}
        {!isExpanded && (
          <div
            className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40"
            onClick={(e) => e.stopPropagation()}
          >
            {job.appliedStatus ? (
              <span className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-none text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Check className="size-3.5" />
                <span>Applied</span>
              </span>
            ) : (
              <Button
                size="sm"
                variant={isSaved ? "secondary" : "default"}
                disabled={isSaved || isSaving}
                onClick={onSave}
                className="h-8 text-xs px-3 gap-1.5 cursor-pointer font-medium rounded-none"
              >
                {isSaved ? (
                  <><Check className="size-3.5 text-emerald-500" /><span>Saved</span></>
                ) : isSaving ? (
                  <><RefreshCw className="size-3.5 animate-spin" /><span>Saving...</span></>
                ) : (
                  <><BookmarkPlus className="size-3.5" /><span>Save</span></>
                )}
              </Button>
            )}

            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onApplyClick?.()}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-none border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <span>Apply</span>
              <ExternalLink className="size-3" />
            </a>

            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                disabled={isDismissing}
                title="Dismiss from feed"
                className="size-8 inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-none cursor-pointer border border-transparent hover:border-destructive/30"
              >
                <EyeOff className="size-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onToggle}
              title="View AI Match Breakdown"
              className="h-8 px-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors rounded-none cursor-pointer border border-border/60"
            >
              <span className="hidden md:inline">Details</span>
              <ChevronDown className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Expanded Content (Structured Intelligence Dossier) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden border-t border-border/60"
          >
            <div className="px-4 sm:px-5 pb-5 pt-3 space-y-4 bg-muted/10">
              {/* AI Match Intelligence Dossier */}
              <div className="bg-card border border-border/80 p-4 sm:p-5 rounded-none space-y-4 shadow-xs">
                {/* Dossier Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="size-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground font-mono">
                      AI Match Intelligence Dossier
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {typeof job.atsScore === "number" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-mono border bg-background text-foreground border-border">
                        <span className="text-muted-foreground">ATS Compatibility:</span>
                        <span className={cn(
                          "font-bold",
                          job.atsScore >= 75 ? "text-emerald-500" : job.atsScore >= 60 ? "text-amber-500" : "text-muted-foreground"
                        )}>
                          {job.atsScore}%
                        </span>
                      </span>
                    )}
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold border font-mono",
                      getScoreBadgeClass(job.fitScore)
                    )}>
                      <BrainCircuit className="size-3" />
                      <span>{job.fitScore}% Fit</span>
                    </span>
                  </div>
                </div>

                {/* 4 Pillars Scoring Rubric */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-muted/30 border border-border/60 rounded-none space-y-1">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block">Skills Match</span>
                    <p className="text-sm font-bold font-mono text-foreground">{parsedRationale.skillsScore || "40/40"}</p>
                    <span className="text-[11px] text-muted-foreground block">Verified stack alignment</span>
                  </div>

                  <div className="p-3 bg-muted/30 border border-border/60 rounded-none space-y-1">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block">Role Fit</span>
                    <p className="text-sm font-bold font-mono text-foreground">{parsedRationale.roleScore || "25/25"}</p>
                    <span className="text-[11px] text-muted-foreground block">Title &amp; profile match</span>
                  </div>

                  <div className="p-3 bg-muted/30 border border-border/60 rounded-none space-y-1">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block">Work Mode</span>
                    <p className="text-sm font-bold font-mono text-foreground">{parsedRationale.locationScore || "20/20"}</p>
                    <span className="text-[11px] text-muted-foreground block">Location compatibility</span>
                  </div>

                  <div className="p-3 bg-muted/30 border border-border/60 rounded-none space-y-1">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block">Seniority</span>
                    <p className="text-sm font-bold font-mono text-foreground">{parsedRationale.seniorityScore || "15/15"}</p>
                    <span className="text-[11px] text-muted-foreground block">Career stage match</span>
                  </div>
                </div>

                {/* Qualitative Insights */}
                <div className="space-y-2.5 pt-1">
                  {parsedRationale.roleMatch && (
                    <div className="p-3 bg-muted/20 border border-border/50 rounded-none flex items-start gap-2.5">
                      <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-foreground font-mono">Role Alignment</span>
                        <p className="text-xs text-muted-foreground leading-relaxed">{parsedRationale.roleMatch}</p>
                      </div>
                    </div>
                  )}

                  {parsedRationale.techStack && (
                    <div className="p-3 bg-muted/20 border border-border/50 rounded-none flex items-start gap-2.5">
                      <span className="text-primary font-bold shrink-0 mt-0.5">⚡</span>
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-foreground font-mono">Verified Stack Match</span>
                        <p className="text-xs text-muted-foreground font-mono leading-relaxed">{parsedRationale.techStack}</p>
                      </div>
                    </div>
                  )}

                  {parsedRationale.experienceFit && (
                    <div className="p-3 bg-muted/20 border border-border/50 rounded-none flex items-start gap-2.5">
                      <span className="text-sky-500 font-bold shrink-0 mt-0.5">🎓</span>
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-foreground font-mono">Experience &amp; Seniority</span>
                        <p className="text-xs text-muted-foreground leading-relaxed">{parsedRationale.experienceFit}</p>
                      </div>
                    </div>
                  )}

                  {parsedRationale.locationFit && (
                    <div className="p-3 bg-muted/20 border border-border/50 rounded-none flex items-start gap-2.5">
                      <span className="text-emerald-500 font-bold shrink-0 mt-0.5">🌍</span>
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-foreground font-mono">Work Mode &amp; Eligibility</span>
                        <p className="text-xs text-muted-foreground leading-relaxed">{parsedRationale.locationFit}</p>
                      </div>
                    </div>
                  )}

                  {parsedRationale.summary && !parsedRationale.roleMatch && !parsedRationale.techStack && (
                    <div className="p-3 bg-muted/20 border border-border/50 rounded-none">
                      <p className="text-xs text-muted-foreground leading-relaxed">{parsedRationale.summary}</p>
                    </div>
                  )}
                </div>

                {/* Strategy Tip Callout */}
                {parsedRationale.strategyTip && (
                  <div className="p-3.5 bg-primary/5 border border-primary/25 rounded-none flex items-start gap-2.5">
                    <Zap className="size-4 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-primary font-mono uppercase tracking-wider">
                        Strategy Recommendation
                      </span>
                      <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                        {parsedRationale.strategyTip}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Author Outreach */}
              {(job.outreachPitch || job.authorName || job.sourceBoard === "linkedin_post") && (
                <div className="bg-primary/5 border border-primary/25 p-3.5 rounded-none space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-primary/20 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary font-mono uppercase">
                      <MessageSquare className="size-4" />
                      <span>Direct Author Outreach (Bypasses ATS)</span>
                    </div>
                    {job.authorName && (
                      <span className="text-xs text-muted-foreground font-mono">
                        Author: <strong className="text-foreground">{job.authorName}</strong>
                      </span>
                    )}
                  </div>

                  {!showPitch ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                      <p className="text-xs text-muted-foreground">
                        Generate a customized 2-sentence direct message highlighting your verified projects.
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
                        className="h-8 text-xs gap-1.5 rounded-none font-medium text-primary hover:bg-primary/10 border-primary/30 shrink-0 cursor-pointer"
                      >
                        {isGeneratingPitch ? (
                          <>
                            <RefreshCw className="size-3.5 animate-spin text-primary" />
                            <span>Generating Pitch...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="size-3.5 text-primary" />
                            <span>Generate Outreach Pitch</span>
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2.5 pt-1">
                      <p className="text-xs text-foreground/90 leading-relaxed italic bg-background/80 p-3 border border-border/50 select-all">
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
                          className="h-8 text-xs gap-1.5 rounded-none font-medium cursor-pointer"
                        >
                          {copiedPitch ? (
                            <>
                              <CheckCheck className="size-3.5 text-emerald-500" />
                              <span>Copied to Clipboard!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3.5" />
                              <span>Copy Pitch</span>
                            </>
                          )}
                        </Button>
                        {job.authorUrl && (
                          <a
                            href={job.authorUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 h-8 px-3 text-xs font-medium border border-border text-foreground hover:bg-muted/40 transition-colors"
                          >
                            <UserCheck className="size-3.5 text-primary" />
                            <span>View Profile</span>
                            <ExternalLink className="size-3 opacity-70" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowPitch(false)
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground ml-auto cursor-pointer underline underline-offset-2"
                        >
                          Collapse Pitch
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* All Tags */}
              {job.tags && job.tags.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-mono text-muted-foreground uppercase block">All Extracted Tags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {job.tags.map((t) => (
                      <span
                        key={t}
                        className="text-xs px-2 py-0.5 bg-muted/60 rounded-none text-muted-foreground border border-border/50 font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Actions Bar in Expanded State */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-border/50">
                {job.appliedStatus ? (
                  <div className="inline-flex items-center gap-1.5 h-9 px-3 text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium">
                    <Check className="size-3.5" />
                    <span>Already in Tracker ({job.appliedStatus})</span>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant={isSaved ? "secondary" : "default"}
                    disabled={isSaved || isSaving}
                    onClick={(e) => { e.stopPropagation(); onSave() }}
                    className="h-9 text-xs px-4 gap-1.5 cursor-pointer font-medium rounded-none"
                  >
                    {isSaved ? (
                      <><Check className="size-3.5 text-emerald-500" /><span>Saved to Tracker</span></>
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
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-none border border-border text-xs text-foreground hover:bg-muted/50 font-medium transition-colors cursor-pointer"
                >
                  <span>
                    {job.sourceBoard === "curated"
                      ? `Apply on ${job.company}`
                      : `View on ${sourceBadge.label}`}
                  </span>
                  <ExternalLink className="size-3.5" />
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
                    className="h-9 text-xs gap-1.5 cursor-pointer text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10 rounded-none"
                  >
                    <EyeOff className="size-3.5" />
                    <span>Dismiss Role</span>
                  </Button>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onToggle() }}
                  className="ml-auto h-9 text-xs text-muted-foreground hover:text-foreground cursor-pointer rounded-none gap-1"
                >
                  <span>Collapse</span>
                  <ChevronUp className="size-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
