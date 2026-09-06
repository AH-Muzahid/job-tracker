"use client"

import { useState, useMemo } from "react"
import {
  BookmarkPlus, Check, ExternalLink, MapPin,
  RefreshCw, EyeOff, ShieldCheck, Globe, Briefcase,
  BrainCircuit, ChevronDown, ChevronUp, Zap, Banknote
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  getScoreBadgeClass,
  getSourceBadge,
  getVisaBadge,
  getEmploymentType,
  formatSalaryClean,
  parseMatchRationale,
} from "./types"
import type { ExternalJobOpportunity } from "@/lib/ai/graph/tools/discovery-tools"

interface DiscoveryJobRowProps {
  job: ExternalJobOpportunity
  isSaved: boolean
  isSaving: boolean
  isDismissing?: boolean
  onSave: () => void
  onDismiss?: () => void
  onApplyClick?: () => void
}

export function DiscoveryJobRow({
  job,
  isSaved,
  isSaving,
  isDismissing = false,
  onSave,
  onDismiss,
  onApplyClick,
}: DiscoveryJobRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const sourceBadge = getSourceBadge(job.sourceBoard)
  const visaBadge = getVisaBadge(job.visaSponsorship)
  const employmentType = getEmploymentType(job)
  const parsed = useMemo(() => parseMatchRationale(job.matchRationale), [job.matchRationale])

  const hasExpandedContent = Boolean(
    parsed.skillsScore ||
    parsed.roleScore ||
    parsed.locationScore ||
    parsed.seniorityScore ||
    parsed.techStack ||
    parsed.strategyTip ||
    (parsed.learnedNotes && parsed.learnedNotes.length > 0) ||
    job.descriptionSnippet
  )

  return (
    <div className="group border-b border-border/50 py-3 px-3 sm:px-4 hover:bg-muted/20 transition-colors">
      {/* 1. Header: Monogram + Company & Location (left) | Match Score Badge (right) */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-6 sm:size-7 rounded-none bg-muted/80 flex items-center justify-center font-bold text-[10px] sm:text-xs text-foreground shrink-0 border border-border font-mono select-none">
            {job.company.slice(0, 2).toUpperCase()}
          </div>
          <span className="font-semibold text-foreground text-xs sm:text-sm truncate">
            {job.company}
          </span>
          <span className="text-muted-foreground/30 text-xs select-none">•</span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground truncate">
            <MapPin className="size-3 shrink-0 text-muted-foreground/70" />
            <span className="truncate max-w-[140px] sm:max-w-[200px]">{job.location}</span>
          </span>
        </div>

        {/* Highlighted Match Score Badge - pinned at top-right */}
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-none text-xs tracking-tight border shrink-0 font-mono select-none font-bold",
            getScoreBadgeClass(job.fitScore)
          )}
        >
          {job.fitScore}% Match
        </span>
      </div>

      {/* 2. Middle: Title (Full width clickable link) */}
      <div className="mb-2">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onApplyClick?.()}
          className="text-sm sm:text-base font-semibold text-foreground hover:text-primary hover:underline transition-colors leading-snug line-clamp-2 block"
          title={`View ${job.title} at ${job.company}`}
        >
          {job.title}
        </a>
      </div>

      {/* 3. Bottom Row: Metadata Badges (left) | Action CTAs (right) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
        {/* Left: Badges (Employment Type, Salary, Visa, Source) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none text-[11px] font-medium border shrink-0", employmentType.color)}>
            <Briefcase className="size-3" />
            <span>{employmentType.label}</span>
          </span>

          {job.salary && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none text-[11px] font-medium border border-border bg-muted/40 text-foreground shrink-0 font-mono">
              <Banknote className="size-3 text-muted-foreground/70" />
              <span>{formatSalaryClean(job.salary)}</span>
            </span>
          )}

          {visaBadge && (
            <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none text-[11px] font-medium border shrink-0", visaBadge.color)}>
              <ShieldCheck className="size-3" />
              <span>{visaBadge.label}</span>
            </span>
          )}

          <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none text-[11px] font-medium border shrink-0", sourceBadge.color)}>
            <Globe className="size-3" />
            <span>{sourceBadge.label}</span>
          </span>
        </div>

        {/* Right: Action CTAs: In 1 line taking full width on mobile */}
        <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 shrink-0">
          {/* Why Match / Details Toggle */}
          {hasExpandedContent && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "h-8 px-2.5 inline-flex items-center justify-center gap-1 text-xs transition-colors rounded-none border shrink-0 cursor-pointer",
                isExpanded
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border-border/70"
              )}
              title="Toggle match breakdown & intelligence"
            >
              <BrainCircuit className="size-3.5" />
              <span className="font-medium hidden sm:inline">{isExpanded ? "Hide Details" : "Why Match?"}</span>
              {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>
          )}

          {/* Hide / Dismiss Button */}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              disabled={isDismissing}
              title="Dismiss / Hide this role"
              className="h-8 px-3 inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-none cursor-pointer border border-border/70 hover:border-destructive/30 shrink-0"
            >
              <EyeOff className="size-3.5" />
              <span className="font-medium sm:hidden">Hide</span>
            </button>
          )}

          {job.appliedStatus ? (
            <span className="inline-flex items-center justify-center gap-1 h-8 px-3 rounded-none text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex-1 sm:flex-initial">
              <Check className="size-3" />
              <span>Applied</span>
            </span>
          ) : (
            <Button
              size="sm"
              variant={isSaved ? "secondary" : "default"}
              disabled={isSaved || isSaving}
              onClick={onSave}
              className="h-8 text-xs px-3 gap-1.5 cursor-pointer font-medium rounded-none flex-1 sm:flex-initial"
            >
              {isSaved ? (
                <><Check className="size-3 text-emerald-500" /><span>Saved</span></>
              ) : isSaving ? (
                <><RefreshCw className="size-3 animate-spin" /><span>Saving...</span></>
              ) : (
                <><BookmarkPlus className="size-3" /><span>Save</span></>
              )}
            </Button>
          )}

          {/* Direct Link to Origin Source */}
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onApplyClick?.()}
            className="inline-flex items-center justify-center gap-1 h-8 px-3 rounded-none border border-border text-xs font-medium text-foreground hover:bg-muted/50 transition-colors cursor-pointer flex-1 sm:flex-initial"
            title={`Open full job posting on ${sourceBadge.label}`}
          >
            <span>View Job</span>
            <ExternalLink className="size-3 text-muted-foreground" />
          </a>
        </div>
      </div>

      {/* 4. Expandable Intelligence Drawer */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-border/60 bg-muted/10 p-3 sm:p-4 rounded-none space-y-3">
          {/* Sub-scores grid */}
          {(parsed.skillsScore || parsed.roleScore || parsed.locationScore || parsed.seniorityScore) && (
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Evaluation Rubric Breakdown
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {parsed.skillsScore && (
                  <div className="bg-background border border-border p-2 rounded-none">
                    <div className="text-[10px] text-muted-foreground uppercase font-mono">Skills Fit</div>
                    <div className="text-xs font-bold text-foreground font-mono">{parsed.skillsScore}</div>
                  </div>
                )}
                {parsed.roleScore && (
                  <div className="bg-background border border-border p-2 rounded-none">
                    <div className="text-[10px] text-muted-foreground uppercase font-mono">Role Fit</div>
                    <div className="text-xs font-bold text-foreground font-mono">{parsed.roleScore}</div>
                  </div>
                )}
                {parsed.locationScore && (
                  <div className="bg-background border border-border p-2 rounded-none">
                    <div className="text-[10px] text-muted-foreground uppercase font-mono">Location</div>
                    <div className="text-xs font-bold text-foreground font-mono">{parsed.locationScore}</div>
                  </div>
                )}
                {parsed.seniorityScore && (
                  <div className="bg-background border border-border p-2 rounded-none">
                    <div className="text-[10px] text-muted-foreground uppercase font-mono">Seniority</div>
                    <div className="text-xs font-bold text-foreground font-mono">{parsed.seniorityScore}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Verified Tech Stack */}
          {parsed.techStack && (
            <div className="text-xs">
              <span className="font-mono font-semibold text-muted-foreground">Tech Stack: </span>
              <span className="text-foreground">{parsed.techStack}</span>
            </div>
          )}

          {/* Strategy Tip if present */}
          {parsed.strategyTip && (
            <div className="text-xs bg-primary/5 border border-primary/20 p-2.5 rounded-none flex items-start gap-2">
              <Zap className="size-3.5 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-primary">Strategy Tip: </span>
                <span className="text-foreground/90">{parsed.strategyTip}</span>
              </div>
            </div>
          )}

          {/* Learned Notes if present */}
          {parsed.learnedNotes && parsed.learnedNotes.length > 0 && (
            <div className="text-xs text-muted-foreground space-y-1">
              {parsed.learnedNotes.map((note, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <BrainCircuit className="size-3 text-muted-foreground/70 shrink-0" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          )}

          {/* Description Snippet preview */}
          {job.descriptionSnippet && (
            <div className="pt-2 border-t border-border/40">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Job Overview Preview
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {job.descriptionSnippet}
              </p>
            </div>
          )}

          {/* Company Profile Intel (REC-10) */}
          {job.companyEnrichment && (job.companyEnrichment.stage || job.companyEnrichment.headcount || job.companyEnrichment.industry || (job.companyEnrichment.cultureHighlights && job.companyEnrichment.cultureHighlights.length > 0)) && (
            <div className="pt-2 border-t border-border/40 space-y-1.5">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Company Intel</span>
                {job.companyEnrichment.verified && (
                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="size-3" />
                    Verified
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {job.companyEnrichment.stage && (
                  <span className="px-2 py-0.5 border border-border bg-background text-foreground/80 font-mono text-[11px]">
                    Stage: {job.companyEnrichment.stage}
                  </span>
                )}
                {job.companyEnrichment.headcount && (
                  <span className="px-2 py-0.5 border border-border bg-background text-foreground/80 font-mono text-[11px]">
                    Team: {job.companyEnrichment.headcount}
                  </span>
                )}
                {job.companyEnrichment.industry && (
                  <span className="px-2 py-0.5 border border-border bg-background text-foreground/80 font-mono text-[11px]">
                    Domain: {job.companyEnrichment.industry}
                  </span>
                )}
                {job.companyEnrichment.isRemoteFirst && (
                  <span className="px-2 py-0.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
                    Remote-First
                  </span>
                )}
              </div>
              {job.companyEnrichment.cultureHighlights && job.companyEnrichment.cultureHighlights.length > 0 && (
                <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 pt-0.5">
                  {job.companyEnrichment.cultureHighlights.map((hl, idx) => (
                    <span key={idx}>• {hl}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
