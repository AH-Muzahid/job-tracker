"use client"

import { Layers, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { DecorIcon } from "@/components/decor-icon"
import { DISCOVERY_QUICK_TAGS, type DiscoveryFilters } from "./types"

interface DiscoveryFilterSidebarProps {
  filters: DiscoveryFilters
  onFilterChange: (filters: DiscoveryFilters) => void
  className?: string
  hideDecor?: boolean
}

export function DiscoveryFilterSidebar({
  filters,
  onFilterChange,
  className,
  hideDecor = false,
}: DiscoveryFilterSidebarProps) {
  const hasFilters = filters.source || filters.location || filters.minScore || filters.batchSlot || filters.tags.length > 0

  const update = (patch: Partial<DiscoveryFilters>) => {
    onFilterChange({ ...filters, ...patch })
  }

  const toggleTag = (tag: string) => {
    const tags = filters.tags.includes(tag) ? filters.tags.filter((t) => t !== tag) : [...filters.tags, tag]
    update({ tags })
  }

  const clearAll = () => {
    onFilterChange({ source: "", location: "", minScore: "", batchSlot: "", tags: [] })
  }

  return (
    <div className={cn("w-full relative", className)}>
      {!hideDecor && <DecorIcon position="top-right" />}

      <div className="space-y-4">
        {/* 24-Hour Batch Window */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 mb-2 block">Batch Release</label>
          <RadioGroup
            value={filters.batchSlot || ""}
            onChange={(v) => update({ batchSlot: v as DiscoveryFilters["batchSlot"] })}
            options={[
              { value: "", label: "All 24h Windows" },
              { value: "just-in", label: "Just In (<6h)", dot: "bg-emerald-500" },
              { value: "earlier-today", label: "Earlier Today (6-12h)", dot: "bg-sky-500" },
              { value: "yesterday", label: "Past (12-24h)", dot: "bg-muted-foreground" },
            ]}
          />
        </div>

        {/* Source */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 mb-2 block">Source</label>
          <RadioGroup
            value={filters.source}
            onChange={(v) => update({ source: v as DiscoveryFilters["source"] })}
            options={[
              { value: "", label: "All Sources" },
              { value: "linkedin", label: "LinkedIn / Local", dot: "bg-blue-500" },
              { value: "remoteok", label: "RemoteOK", dot: "bg-indigo-500" },
              { value: "arbeitnow", label: "Arbeitnow", dot: "bg-emerald-500" },
              { value: "adzuna", label: "Adzuna", dot: "bg-violet-500" },
              { value: "curated", label: "Curated Tech", dot: "bg-primary" },
            ]}
          />
        </div>

        {/* Work Mode / Location */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 mb-2 block">Work Mode</label>
          <RadioGroup
            value={filters.location}
            onChange={(v) => update({ location: v as DiscoveryFilters["location"] })}
            options={[
              { value: "", label: "All Modes" },
              { value: "remote", label: "Remote", dot: "bg-emerald-500" },
              { value: "hybrid", label: "Hybrid", dot: "bg-sky-500" },
              { value: "onsite", label: "On-site", dot: "bg-amber-500" },
            ]}
          />
        </div>

        {/* Match Score */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 mb-2 block">Match Score</label>
          <RadioGroup
            value={filters.minScore}
            onChange={(v) => update({ minScore: v as DiscoveryFilters["minScore"] })}
            options={[
              { value: "", label: "All Scores" },
              { value: "85", label: "85%+ (Strong)", dot: "bg-emerald-500" },
              { value: "70", label: "70-84% (Good)", dot: "bg-sky-500" },
              { value: "0", label: "Below 70%", dot: "bg-amber-500" },
            ]}
          />
        </div>

        {/* Tech Tags */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 mb-2 flex items-center gap-1">
            <Layers className="size-3" />
            Tech Tags
          </label>
          <div className="flex flex-wrap gap-1.5">
            {DISCOVERY_QUICK_TAGS.map((tag) => {
              const active = filters.tags.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "px-2 py-0.5 rounded-none text-[11px] font-medium transition-all cursor-pointer border",
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border-border/60"
                  )}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        </div>

        {/* Clear All */}
        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer font-medium flex items-center gap-1"
          >
            <X className="size-3" />
            Clear All Filters
          </button>
        )}
      </div>
    </div>
  )
}

function RadioGroup({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; dot?: string }[]
}) {
  return (
    <div className="space-y-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className="flex items-center gap-2 w-full text-left cursor-pointer group"
        >
          <span className={cn(
            "size-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
            value === opt.value ? "border-foreground/60" : "border-foreground/40"
          )}>
            {value === opt.value && <span className="size-1.5 rounded-full bg-foreground" />}
          </span>
          {opt.dot && <span className={cn("size-2 rounded-full shrink-0", opt.dot)} />}
          <span className={cn(
            "text-xs transition-colors",
            value === opt.value ? "text-foreground font-medium" : "text-muted-foreground group-hover:text-foreground"
          )}>
            {opt.label}
          </span>
        </button>
      ))}
    </div>
  )
}
