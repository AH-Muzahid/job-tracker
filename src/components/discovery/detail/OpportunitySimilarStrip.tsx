"use client"

import React, { useState } from "react"
import Link from "next/link"
import { ArrowRight, Bookmark, BookmarkCheck, MapPin, Wifi, Building2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { getCompanyLogo } from "./company-logo"
import type { SimilarOpportunityItem } from "./types"

interface OpportunitySimilarStripProps {
  opportunities: SimilarOpportunityItem[]
}

export function OpportunitySimilarStrip({ opportunities }: OpportunitySimilarStripProps) {
  const [savedSet, setSavedSet] = useState<Set<string>>(
    () => new Set(opportunities.filter((o) => o.isSaved).map((o) => o.id))
  )

  const toggleSave = async (item: SimilarOpportunityItem) => {
    const isCurrentlySaved = savedSet.has(item.id)
    const nextSaved = !isCurrentlySaved

    // Optimistic toggle
    setSavedSet((prev) => {
      const copy = new Set(prev)
      if (nextSaved) copy.add(item.id)
      else copy.delete(item.id)
      return copy
    })

    toast.success(nextSaved ? `Saved "${item.title}" to tracker` : `Removed "${item.title}" from Saved`)

    try {
      await fetch("/api/jobs/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: nextSaved ? "save" : "unsave",
          jobId: item.jobId || item.id,
          companyName: item.company,
          jobTitle: item.title,
          jobUrl: item.url,
          location: item.location,
        }),
      })
    } catch {
      // Revert on error
      setSavedSet((prev) => {
        const copy = new Set(prev)
        if (isCurrentlySaved) copy.add(item.id)
        else copy.delete(item.id)
        return copy
      })
      toast.error("Failed to update saved status")
    }
  }

  if (!opportunities || opportunities.length === 0) return null

  return (
    <div className="space-y-3 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground tracking-tight">Similar Opportunities</h3>
        <Link
          href="/discovery"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <span>View all</span>
          <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* 3-Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {opportunities.map((item) => {
          const logo = getCompanyLogo(item.company, "sm")
          const isSaved = savedSet.has(item.id)

          return (
            <div
              key={item.id}
              className="p-3.5 bg-card border border-border rounded-[6px] hover:border-border/80 transition-all flex flex-col justify-between group relative space-y-3"
            >
              {/* Top row: Logo, Title, Match, Bookmark */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <div
                    className={cn(
                      "shrink-0 size-8 border rounded-sm flex items-center justify-center font-bold",
                      logo.bg
                    )}
                  >
                    {logo.content}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <Link
                      href={`/discovery/${item.jobId || item.id}`}
                      className="text-xs font-bold text-foreground hover:text-primary transition-colors truncate block leading-snug"
                    >
                      {item.title}
                    </Link>
                    <div className="text-[11px] text-muted-foreground truncate">{item.company}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 tabular-nums">
                    {item.fitScore}%
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleSave(item)}
                    className={cn(
                      "size-7 rounded-sm border border-border/70 hover:border-border hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer",
                      isSaved && "text-primary bg-primary/5 border-primary/30"
                    )}
                    title={isSaved ? "Remove from Saved" : "Save opportunity"}
                  >
                    {isSaved ? (
                      <BookmarkCheck className="size-3.5 text-primary fill-primary/10" />
                    ) : (
                      <Bookmark className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Location & Work Mode */}
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">{item.location}</span>
                <span>•</span>
                <span className="flex items-center gap-1 shrink-0">
                  {item.isRemote ? <Wifi className="size-3" /> : <Building2 className="size-3" />}
                  <span>{item.isRemote ? "Remote" : "On-site"}</span>
                </span>
              </div>

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  {item.tags.slice(0, 3).map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="inline-flex items-center px-1.5 py-0.2 rounded-xs text-[10px] font-medium bg-muted/80 text-muted-foreground border border-border/50"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
