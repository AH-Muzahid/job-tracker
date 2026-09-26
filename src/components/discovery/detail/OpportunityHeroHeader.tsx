"use client"

import React, { useMemo } from "react"
import Link from "next/link"
import {
  ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, Share2, MoreHorizontal,
  CheckCircle2, MapPin, Wifi, Building2, Briefcase, Calendar,
  RefreshCw, Check, ExternalLink, Link2
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { cleanTag } from "@/components/discovery/types"
import { getCompanyLogo } from "./company-logo"
import type { OpportunityDetailData } from "./types"

interface OpportunityHeroHeaderProps {
  opportunity: OpportunityDetailData
  isSaved: boolean
  isSaving: boolean
  isPackaging: boolean
  isStaged: boolean
  stagedApplicationId?: string | null
  onSaveToggle: () => void
  onPackage: () => void
  onStatusChange?: (status: string) => void
}

export function OpportunityHeroHeader({
  opportunity,
  isSaved,
  isSaving,
  isPackaging,
  isStaged,
  stagedApplicationId,
  onSaveToggle,
  onPackage,
}: OpportunityHeroHeaderProps) {
  const logo = useMemo(
    () => getCompanyLogo(opportunity.company, "lg"),
    [opportunity.company]
  )

  const workMode = useMemo(() => {
    if (opportunity.isRemote) {
      return { label: "Remote", icon: <Wifi className="size-3.5 text-muted-foreground" /> }
    }
    const locLower = (opportunity.location || "").toLowerCase()
    if (locLower.includes("hybrid")) {
      return { label: "Hybrid", icon: <Building2 className="size-3.5 text-muted-foreground" /> }
    }
    return { label: "On-site", icon: <Building2 className="size-3.5 text-muted-foreground" /> }
  }, [opportunity.isRemote, opportunity.location])

  const postedTimeAgo = useMemo(() => {
    try {
      const posted = new Date(opportunity.postedAt)
      const diffMs = Date.now() - posted.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      if (diffHours < 24) return `Posted ${Math.max(1, diffHours)}h ago`
      const diffDays = Math.floor(diffHours / 24)
      return `Posted ${diffDays} day${diffDays > 1 ? "s" : ""} ago`
    } catch {
      return "Recently posted"
    }
  }, [opportunity.postedAt])

  const handleShare = async () => {
    if (typeof window !== "undefined") {
      try {
        await navigator.clipboard.writeText(window.location.href)
        toast.success("Opportunity link copied to clipboard")
      } catch {
        toast.success("Opportunity URL ready to share")
      }
    }
  }

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(opportunity.url)
      toast.success("Source job posting link copied")
    }
  }

  const cleanedTags = useMemo(() => {
    const list: string[] = []
    if (Array.isArray(opportunity.tags)) {
      for (const t of opportunity.tags) {
        const cleaned = cleanTag(t)
        if (cleaned) list.push(cleaned)
      }
    }
    const seen = new Set<string>()
    const unique: string[] = []
    for (const t of list) {
      const lower = t.toLowerCase()
      if (!seen.has(lower) && !lower.includes(opportunity.company.toLowerCase())) {
        seen.add(lower)
        unique.push(t)
      }
    }
    return unique.slice(0, 4)
  }, [opportunity.tags, opportunity.company])

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Top Action Bar (Matching Mobile Mockup media_1790363520553.png & Desktop) */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/discovery"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group cursor-pointer p-1 sm:p-0 -ml-1 sm:ml-0"
          title="Back to Opportunities"
        >
          <ArrowLeft className="size-5 sm:size-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="hidden sm:inline">Back to Opportunities</span>
        </Link>

        {/* Action controls row on top right: [Bookmark] [Share] [...] */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onSaveToggle}
            disabled={isSaving}
            className={cn(
              "size-8.5 sm:h-8 sm:w-auto sm:px-3 rounded-full sm:rounded-sm border border-border/80 hover:border-border hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5",
              isSaved && "text-primary border-primary/30 bg-primary/5 hover:bg-primary/10",
              isSaving && "opacity-75 cursor-wait"
            )}
            title={isSaved ? "Remove from Saved" : "Save opportunity"}
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="size-4 sm:size-3.5 text-primary fill-primary/10" />
                <span className="hidden sm:inline">Saved</span>
              </>
            ) : (
              <>
                <Bookmark className="size-4 sm:size-3.5 stroke-[1.75]" />
                <span className="hidden sm:inline">Save</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="size-8.5 sm:h-8 sm:w-auto sm:px-3 rounded-full sm:rounded-sm border border-border/80 hover:border-border hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
            title="Share opportunity"
          >
            <Share2 className="size-4 sm:size-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="size-8.5 sm:size-8 rounded-full sm:rounded-sm border border-border/80 hover:border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center"
                title="More options"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-1 z-50">
              <DropdownMenuItem onClick={handleCopyLink} className="flex items-center gap-2 cursor-pointer text-xs">
                <Link2 className="size-3.5 text-muted-foreground" />
                <span>Copy source link</span>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href={opportunity.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 cursor-pointer text-xs"
                >
                  <ExternalLink className="size-3.5 text-muted-foreground" />
                  <span>Open source board</span>
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Opportunity Hero Header */}
      <div className="bg-transparent sm:bg-card border-0 sm:border border-border rounded-none sm:rounded-[6px] p-0 sm:p-6 shadow-none">
        {/* Mobile View: 100% Pixel Match with media_1790363520553.png */}
        <div className="sm:hidden space-y-3 pt-1">
          {/* Row 1: Logo & Match pill */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "shrink-0 size-12 border rounded-[8px] flex items-center justify-center font-bold",
                logo.bg
              )}
            >
              {logo.content}
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 tabular-nums">
              {opportunity.fitScore}% match
            </span>
          </div>

          {/* Row 2: Title */}
          <h1 className="text-xl font-bold tracking-tight text-foreground leading-snug">
            {opportunity.title}
          </h1>

          {/* Row 3: Company */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
            <span className="text-foreground font-semibold">{opportunity.company}</span>
            <CheckCircle2 className="size-3.5 fill-blue-500 text-white dark:text-zinc-950 shrink-0" />
          </div>

          {/* Row 4: Location & Work Mode: 📍 New York, NY • Remote */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 text-muted-foreground shrink-0" />
            <span>{opportunity.location}</span>
            <span>•</span>
            <span>{workMode.label}</span>
          </div>

          {/* Row 5: Clean Tag Pills: [ Product ] [ Strategy ] [ Growth ] */}
          {cleanedTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {cleanedTags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-muted/70 text-muted-foreground border border-border/40"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Desktop View (sm+): High-density Blueprint Linear/Stripe standard */}
        <div className="hidden sm:flex sm:flex-row sm:items-start justify-between gap-5">
          {/* Left Side: Logo + Info */}
          <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
            {/* Company Logo */}
            <div
              className={cn(
                "shrink-0 size-14 sm:size-16 border rounded-[8px] flex items-center justify-center font-bold mt-0.5",
                logo.bg
              )}
            >
              {logo.content}
            </div>

            {/* Content Column */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Title & Match Pill */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground leading-snug">
                  {opportunity.title}
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 leading-none shrink-0 tabular-nums">
                  {opportunity.fitScore}% match
                </span>
              </div>

              {/* Company & Verified Badge */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                <span className="text-foreground font-semibold">{opportunity.company}</span>
                <CheckCircle2 className="size-4 fill-blue-500 text-white dark:text-zinc-950 shrink-0" />
              </div>

              {/* Metadata Row */}
              <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs sm:text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                  <span>{opportunity.location}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  {workMode.icon}
                  <span>{workMode.label}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Briefcase className="size-3.5 text-muted-foreground shrink-0" />
                  <span>{opportunity.employmentType}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                  <span>{postedTimeAgo}</span>
                </span>
              </div>

              {/* Tags Row */}
              {cleanedTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {cleanedTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-xs text-[11px] font-medium bg-muted/80 text-muted-foreground border border-border/60"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Primary CTA Only (Desktop) */}
          <div className="shrink-0 w-full sm:w-48 self-start pt-1">
            {isStaged ? (
              <Link
                href={stagedApplicationId ? `/applications/${stagedApplicationId}` : "/applications?status=Staged"}
                className="w-full inline-flex items-center justify-center gap-2 h-9 px-4 rounded-[4px] text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-100/50 transition-colors cursor-pointer shadow-xs"
              >
                <Check className="size-3.5 stroke-[2.5]" />
                <span>Staged in Workbench</span>
                <ArrowRight className="size-3.5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={onPackage}
                disabled={isPackaging}
                className="w-full inline-flex items-center justify-center gap-2 h-9 px-4 rounded-[4px] text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                {isPackaging ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    <span>Packaging...</span>
                  </>
                ) : (
                  <>
                    <span>Package & Stage</span>
                    <ArrowRight className="size-3.5 stroke-[2]" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
