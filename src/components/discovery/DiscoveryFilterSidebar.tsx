"use client"

import { Layers, RotateCcw, Briefcase, ShieldCheck, BrainCircuit, Globe } from "lucide-react"
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
  const hasFilters = Boolean(
    filters.source ||
    filters.location ||
    filters.minScore ||
    filters.visaSponsorship ||
    filters.tags.length > 0 ||
    filters.hideApplied
  )

  const update = (patch: Partial<DiscoveryFilters>) => {
    onFilterChange({ ...filters, ...patch })
  }

  const toggleTag = (tag: string) => {
    const tags = filters.tags.includes(tag) ? filters.tags.filter((t) => t !== tag) : [...filters.tags, tag]
    update({ tags })
  }

  const clearAll = () => {
    onFilterChange({
      source: "",
      location: "",
      minScore: "",
      visaSponsorship: "",
      batchSlot: filters.batchSlot, // keep active batch window intact
      tags: [],
      hideApplied: false,
    })
  }

  return (
    <div className={cn("w-full relative", className)}>
      {!hideDecor && <DecorIcon position="top-right" />}

      <div className="space-y-5">
        {/* Header with Quick Clear */}
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <span className="text-xs font-bold uppercase tracking-wider font-mono text-foreground">
            Filter Feed
          </span>
          {hasFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-primary hover:underline cursor-pointer font-medium flex items-center gap-1"
            >
              <RotateCcw className="size-3" />
              Reset
            </button>
          )}
        </div>

        {/* Work Mode */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-mono">
            <Briefcase className="size-3.5 text-primary" />
            Work Mode
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { value: "", label: "All Modes" },
              { value: "remote", label: "Remote" },
              { value: "hybrid", label: "Hybrid" },
              { value: "onsite", label: "On-site" },
            ].map((opt) => {
              const active = filters.location === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update({ location: opt.value as DiscoveryFilters["location"] })}
                  className={cn(
                    "px-2.5 py-1.5 text-xs font-medium rounded-none border transition-all text-center cursor-pointer",
                    active
                      ? "bg-foreground text-background border-foreground font-semibold"
                      : "bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60 border-border/60"
                  )}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Visa & Work Auth */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-mono">
            <ShieldCheck className="size-3.5 text-emerald-500" />
            Visa &amp; Work Auth
          </label>
          <div className="flex flex-col gap-1.5">
            {[
              { value: "", label: "All Candidates" },
              { value: "available", label: "Visa Sponsor Only" },
              { value: "not_available", label: "Direct / No Visa Needed" },
            ].map((opt) => {
              const active = (filters.visaSponsorship || "") === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update({ visaSponsorship: opt.value as DiscoveryFilters["visaSponsorship"] })}
                  className={cn(
                    "px-2.5 py-1.5 text-xs font-medium rounded-none border transition-all text-left flex items-center justify-between cursor-pointer",
                    active
                      ? "bg-foreground text-background border-foreground font-semibold"
                      : "bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60 border-border/60"
                  )}
                >
                  <span>{opt.label}</span>
                  {active && <span className="size-1.5 rounded-full bg-background shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Minimum Match Score */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-mono">
            <BrainCircuit className="size-3.5 text-primary" />
            Match Quality
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { value: "", label: "All Scores" },
              { value: "90", label: "90%+ Top Picks" },
              { value: "75", label: "75%+ Strong" },
              { value: "50", label: "50%+ Moderate" },
            ].map((opt) => {
              const active = filters.minScore === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update({ minScore: opt.value as DiscoveryFilters["minScore"] })}
                  className={cn(
                    "px-2.5 py-1.5 text-xs font-medium rounded-none border transition-all text-center cursor-pointer",
                    active
                      ? "bg-foreground text-background border-foreground font-semibold"
                      : "bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60 border-border/60"
                  )}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Primary Source */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-mono">
            <Globe className="size-3.5 text-sky-500" />
            Job Board Source
          </label>
          <select
            value={filters.source}
            onChange={(e) => update({ source: e.target.value as DiscoveryFilters["source"] })}
            className="w-full h-8 px-2.5 text-xs bg-muted/40 border border-border/70 rounded-none text-foreground cursor-pointer focus:outline-hidden focus:border-primary"
          >
            <option value="">All Direct &amp; Aggregated Sources</option>
            <option value="greenhouse">Greenhouse Direct</option>
            <option value="lever">Lever Direct</option>
            <option value="linkedin">LinkedIn / Local</option>
            <option value="remoteok">RemoteOK</option>
            <option value="jobicy">Jobicy</option>
            <option value="arbeitnow">Arbeitnow</option>
            <option value="adzuna">Adzuna</option>
            <option value="curated">Curated Tech</option>
          </select>
        </div>

        {/* Tracker Cross-Check Toggle */}
        <div className="pt-2 border-t border-border/50">
          <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
            <input
              type="checkbox"
              checked={!!filters.hideApplied}
              onChange={(e) => update({ hideApplied: e.target.checked })}
              className="rounded-none border-border size-4 text-primary accent-primary cursor-pointer"
            />
            <span className="text-xs font-medium text-foreground">Hide already tracked / applied</span>
          </label>
        </div>

        {/* Tech Stack Tags */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-mono">
            <Layers className="size-3.5 text-primary" />
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
                    "px-2.5 py-1 rounded-none text-xs font-medium transition-all cursor-pointer border font-mono",
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
      </div>
    </div>
  )
}
