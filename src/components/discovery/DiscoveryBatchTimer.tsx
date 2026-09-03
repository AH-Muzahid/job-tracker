"use client"

import { useState, useEffect } from "react"
import { Clock, Layers, Zap, RefreshCw, Compass, Target, Briefcase, MapPin, Sliders } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DecorIcon } from "@/components/decor-icon"
import { cn } from "@/lib/utils"
import type { BatchSlot, BatchSummary } from "./types"
import type { UserPreferencesPayload } from "./DiscoveryPreferencesModal"

interface DiscoveryBatchTimerProps {
  nextBatchAt?: string
  batchSummary?: BatchSummary
  activeSlot: BatchSlot
  onSelectSlot: (slot: BatchSlot) => void
  onForceRefresh?: () => void
  isRefreshing?: boolean
  preferences?: UserPreferencesPayload
  onOpenPreferences?: () => void
}

export function DiscoveryBatchTimer({
  nextBatchAt,
  batchSummary,
  activeSlot,
  onSelectSlot,
  onForceRefresh,
  isRefreshing = false,
  preferences,
  onOpenPreferences,
}: DiscoveryBatchTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date()
      let targetTime: number

      if (nextBatchAt && !isNaN(new Date(nextBatchAt).getTime()) && new Date(nextBatchAt).getTime() > now.getTime()) {
        targetTime = new Date(nextBatchAt).getTime()
      } else {
        // Compute upcoming 6-hour UTC release slot (00:00, 06:00, 12:00, 18:00 UTC)
        const currentIntervalHour = Math.floor(now.getUTCHours() / 6) * 6
        targetTime = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), currentIntervalHour + 6, 0, 0, 0)
      }

      const diff = Math.max(0, targetTime - now.getTime())
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({ hours, minutes, seconds })
    }

    calculateTimeRemaining()
    const timer = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(timer)
  }, [nextBatchAt])

  const formatDigit = (n: number) => n.toString().padStart(2, "0")

  const summary = batchSummary || {
    justIn: 0,
    earlierToday: 0,
    yesterday: 0,
    totalActive: 0,
  }

  return (
    <div className="relative rounded-none border border-border bg-card p-4 sm:p-5 shadow-xs overflow-hidden">
      <DecorIcon position="top-right" />
      <DecorIcon position="bottom-left" />

      {/* Top Header Row: Title & Status on left, Countdown & Action on right */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4">
        {/* Left: Title + Badge + Subtitle */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-none bg-primary/10 text-primary border border-primary/20">
              <Compass className="size-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Job Discovery
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-medium border border-border bg-muted/40 text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Rolling 24h Feed
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
            Curated opportunities scored against your profile and released in rolling 6-hour batches. Saved jobs stay permanently tracked.
          </p>
        </div>

        {/* Right: Next Batch Countdown Box + Sync Action */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 self-start lg:self-auto shrink-0">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-none border border-border bg-muted/40">
            <Clock className="size-3.5 text-primary shrink-0" />
            <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Next Batch:</span>
            <span className="font-mono text-xs sm:text-sm font-bold text-foreground tracking-tight">
              {formatDigit(timeLeft.hours)}h : {formatDigit(timeLeft.minutes)}m : {formatDigit(timeLeft.seconds)}s
            </span>
          </div>

          {onForceRefresh && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onForceRefresh}
              disabled={isRefreshing}
              className="h-8 text-xs gap-1.5 rounded-none cursor-pointer"
            >
              <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
              <span className="hidden xs:inline">{isRefreshing ? "Scoring..." : "Sync Fresh Batch"}</span>
              <span className="xs:hidden">Sync</span>
            </Button>
          )}
        </div>
      </div>

      {/* Middle Row: Active Personalization Criteria Pill */}
      <div className="mt-3.5 pt-3 border-t border-border/70 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div
          onClick={onOpenPreferences}
          className={cn(
            "flex flex-wrap items-center gap-1.5 sm:gap-2 text-muted-foreground",
            onOpenPreferences && "cursor-pointer group"
          )}
          title="Click to edit discovery criteria"
        >
          <span className="font-mono text-[10px] uppercase tracking-wider text-foreground font-semibold flex items-center gap-1 group-hover:text-primary transition-colors">
            <Target className="size-3 text-primary" /> Active Intent:
          </span>

          <span className="inline-flex items-center gap-1 font-medium text-foreground bg-background px-2 py-0.5 border border-border group-hover:border-primary/50 transition-colors">
            <Briefcase className="size-3 text-muted-foreground" />
            {preferences?.targetRoles?.[0] || "All Tech Roles"}
          </span>

          <span className="inline-flex items-center gap-1.5 font-medium text-foreground bg-background px-2 py-0.5 border border-border capitalize group-hover:border-primary/50 transition-colors">
            <span
              className={cn(
                "size-1.5 rounded-full",
                preferences?.workPreference === "remote" && "bg-emerald-500",
                preferences?.workPreference === "hybrid" && "bg-sky-500",
                preferences?.workPreference === "onsite" && "bg-amber-500",
                (!preferences?.workPreference || preferences?.workPreference === "open") && "bg-primary"
              )}
            />
            {preferences?.workPreference ? `${preferences.workPreference} only` : "Open to any"}
          </span>

          {preferences?.location && (
            <span className="inline-flex items-center gap-1 font-medium text-foreground bg-background px-2 py-0.5 border border-border group-hover:border-primary/50 transition-colors">
              <MapPin className="size-3 text-muted-foreground" />
              {preferences.location}
            </span>
          )}
        </div>

        {onOpenPreferences && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenPreferences}
            className="h-6 text-[11px] font-mono gap-1 text-primary hover:text-primary hover:bg-primary/10 rounded-none cursor-pointer px-2"
          >
            <Sliders className="size-3" />
            <span>Edit Criteria</span>
          </Button>
        )}
      </div>

      {/* Bottom Row: Batch Segment Navigation Tabs */}
      <div className="mt-3 pt-3 border-t border-border/80 flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        <span className="text-[11px] font-medium text-muted-foreground mr-0.5 sm:mr-1 shrink-0 flex items-center gap-1">
          <Layers className="size-3 text-primary" />
          Batch:
        </span>

        <button
          type="button"
          onClick={() => onSelectSlot("")}
          className={cn(
            "text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 border transition-colors cursor-pointer rounded-none shrink-0 flex items-center gap-1 sm:gap-1.5",
            activeSlot === ""
              ? "bg-primary text-primary-foreground border-primary font-medium"
              : "bg-background text-muted-foreground hover:text-foreground border-border hover:bg-muted/50"
          )}
        >
          <span>All 24h</span>
          <span className="text-[10px] opacity-80 px-1 bg-black/10 dark:bg-white/10 rounded-xs font-mono">
            {summary.totalActive}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelectSlot("just-in")}
          className={cn(
            "text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 border transition-colors cursor-pointer rounded-none shrink-0 flex items-center gap-1 sm:gap-1.5",
            activeSlot === "just-in"
              ? "bg-emerald-600 text-white border-emerald-600 font-medium"
              : "bg-background text-muted-foreground hover:text-foreground border-border hover:bg-muted/50"
          )}
        >
          <Zap className="size-3 text-emerald-400" />
          <span>Just In (&lt;6h)</span>
          <span className="text-[10px] opacity-80 px-1 bg-black/10 dark:bg-white/10 rounded-xs font-mono">
            {summary.justIn}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelectSlot("earlier-today")}
          className={cn(
            "text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 border transition-colors cursor-pointer rounded-none shrink-0 flex items-center gap-1 sm:gap-1.5",
            activeSlot === "earlier-today"
              ? "bg-sky-600 text-white border-sky-600 font-medium"
              : "bg-background text-muted-foreground hover:text-foreground border-border hover:bg-muted/50"
          )}
        >
          <span>Earlier (6-12h)</span>
          <span className="text-[10px] opacity-80 px-1 bg-black/10 dark:bg-white/10 rounded-xs font-mono">
            {summary.earlierToday}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelectSlot("yesterday")}
          className={cn(
            "text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 border transition-colors cursor-pointer rounded-none shrink-0 flex items-center gap-1 sm:gap-1.5",
            activeSlot === "yesterday"
              ? "bg-foreground text-background border-foreground font-medium"
              : "bg-background text-muted-foreground hover:text-foreground border-border hover:bg-muted/50"
          )}
        >
          <span>Past (12-24h)</span>
          <span className="text-[10px] opacity-80 px-1 bg-black/10 dark:bg-white/10 rounded-xs font-mono">
            {summary.yesterday}
          </span>
        </button>
      </div>
    </div>
  )
}
