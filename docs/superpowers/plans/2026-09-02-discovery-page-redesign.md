# Discovery Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Job Discovery page from a monolithic card grid to a dense list + persistent filter sidebar + bento stat row layout.

**Architecture:** Decompose the 481-line `JobDiscoveryHub.tsx` into 6 focused components. All state lifts to `DiscoveryPage.tsx`. Client-side filtering/sorting on top of existing API. No API changes.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS v4, TanStack Query, Lucide icons, Framer Motion, Radix UI (Dialog for mobile drawer).

## Global Constraints

- Zero round corners: `rounded-none` everywhere (sharp corners, architectural blueprint aesthetic)
- `DecorIcon` (+) corner crosshairs on stat cards, empty state, filter sidebar, expanded rows
- No Sparkles icon — use `Compass`, `Layers`, `BrainCircuit`, `Zap` per AGENTS.md
- Dark/light mode support via Tailwind semantic tokens
- Typography: `font-mono` for labels/badges, `font-sans` for values

---

## File Structure

```
src/components/discovery/
├── types.ts                   ← shared types (FilterState, SortOption, etc.)
├── DiscoveryStatRow.tsx        ← 4 bento stat cards with sparklines
├── DiscoveryFilterSidebar.tsx  ← persistent sidebar with filter groups
├── DiscoveryJobList.tsx        ← list container + empty/loading states
├── DiscoveryJobRow.tsx         ← single row + inline expanded state
├── DiscoverySortDropdown.tsx   ← sort control
└── DiscoveryPage.tsx           ← page shell, state owner, layout (replaces JobDiscoveryHub.tsx)

src/app/(app)/discovery/
└── page.tsx                    ← update import to new DiscoveryPage
```

---

### Task 1: Create types.ts

**Files:**
- Create: `src/components/discovery/types.ts`

**Interfaces:**
- Produces: `DiscoveryFilters`, `SortOption`, `DISCOVERY_QUICK_TAGS`, `getSourceBadge`, `getScoreBadgeClass`

- [ ] **Step 1: Create types.ts with all shared types and helpers**

```typescript
export interface DiscoveryFilters {
  source: "" | "remoteok" | "arbeitnow" | "adzuna"
  location: "" | "remote" | "hybrid"
  minScore: "" | "85" | "70" | "0"
  tags: string[]
}

export type SortOption = "score-desc" | "score-asc" | "salary-desc" | "salary-asc" | "newest"

export const DISCOVERY_QUICK_TAGS = [
  "React", "Python", "Go", "TypeScript", "AI", "Next.js", "Node.js", "Remote",
]

export const DISCOVERY_SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "score-desc", label: "Fit Score (highest)" },
  { value: "score-asc", label: "Fit Score (lowest)" },
  { value: "salary-desc", label: "Salary (highest)" },
  { value: "salary-asc", label: "Salary (lowest)" },
  { value: "newest", label: "Newest" },
]

export function getScoreBadgeClass(score: number): string {
  if (score >= 85) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
  if (score >= 70) return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30"
  return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
}

export function getSourceBadge(source: string): { label: string; color: string } {
  switch (source) {
    case "remoteok":
      return { label: "RemoteOK", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" }
    case "arbeitnow":
      return { label: "Arbeitnow", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" }
    case "adzuna":
      return { label: "Adzuna", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" }
    default:
      return { label: "Curated", color: "bg-primary/10 text-primary border-primary/20" }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/discovery/types.ts
git commit -m "feat(discovery): add shared types and helper functions"
```

---

### Task 2: Create DiscoveryStatRow.tsx

**Files:**
- Create: `src/components/discovery/DiscoveryStatRow.tsx`

**Interfaces:**
- Consumes: `ExternalJobOpportunity[]`, `savedJobs: Set<string>`
- Produces: `<DiscoveryStatRow />` component

- [ ] **Step 1: Create DiscoveryStatRow.tsx**

```tsx
"use client"

import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { DecorIcon } from "@/components/decor-icon"
import type { ExternalJobOpportunity } from "@/lib/ai/graph/tools/discovery-tools"

function VercelSparkline({ points, strokeColor = "#3b82f6" }: { points: number[]; strokeColor?: string }) {
  if (!points || points.length < 2) points = [2, 4, 3, 7, 5, 9, 8, 12, 10, 15]
  const max = Math.max(...points, 1)
  const min = Math.min(...points, 0)
  const range = max - min || 1
  const width = 120
  const height = 32
  const pathPoints = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width
    const y = height - ((p - min) / range) * (height - 6) - 3
    return `${x},${y}`
  })
  const d = `M ${pathPoints.join(" L ")}`
  return (
    <svg width={width} height={height} className="overflow-visible shrink-0">
      <path d={d} fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface DiscoveryStatRowProps {
  opportunities: ExternalJobOpportunity[]
  savedJobs: Set<string>
}

export function DiscoveryStatRow({ opportunities, savedJobs }: DiscoveryStatRowProps) {
  const total = opportunities.length
  const avgScore = total > 0 ? Math.round(opportunities.reduce((sum, j) => sum + j.fitScore, 0) / total) : 0
  const topScore = total > 0 ? Math.max(...opportunities.map((j) => j.fitScore)) : 0
  const savedCount = savedJobs.size

  const sparkFromScores = opportunities.slice(0, 8).map((j) => j.fitScore)
  const savedSpark = [savedCount, savedCount, savedCount, savedCount, savedCount]

  const items = [
    { label: "Total Found", value: total, badge: "all sources", sub: "all sources", spark: sparkFromScores, color: "#3b82f6", href: "#" },
    { label: "Avg Fit Score", value: `${avgScore}%`, badge: `top match ${topScore}%`, sub: "top match", spark: sparkFromScores, color: "#a855f7", href: "#" },
    { label: "New This Session", value: total, badge: "just now", sub: "just now", spark: sparkFromScores, color: "#06b6d4", href: "#" },
    { label: "Saved", value: savedCount, badge: "to tracker", sub: "to tracker", spark: savedSpark, color: "#10b981", href: "/applications?status=Saved" },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="group relative flex flex-col justify-between p-4 rounded-none border border-border/70 bg-card/60 backdrop-blur-xl hover:border-zinc-700 hover:bg-card/90 transition-all duration-200"
        >
          <DecorIcon position="top-right" />
          <DecorIcon position="bottom-left" />
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
              <span className="font-mono text-[11px] font-medium tracking-tight text-zinc-400 group-hover:text-zinc-200 transition-colors">
                {item.label}
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight text-foreground font-sans">{item.value}</span>
              <span className="text-[11px] font-mono text-muted-foreground">{item.badge}</span>
            </div>
          </div>
          <div className="flex items-end justify-between mt-4 pt-2 border-t border-border/40">
            <span className="text-[10px] font-mono text-zinc-500">{item.sub}</span>
            <VercelSparkline points={item.spark} strokeColor={item.color} />
          </div>
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/discovery/DiscoveryStatRow.tsx
git commit -m "feat(discovery): add bento stat row component"
```

---

### Task 3: Create DiscoveryFilterSidebar.tsx

**Files:**
- Create: `src/components/discovery/DiscoveryFilterSidebar.tsx`

**Interfaces:**
- Consumes: `DiscoveryFilters`, `onFilterChange` callback
- Produces: `<DiscoveryFilterSidebar />` component

- [ ] **Step 1: Create DiscoveryFilterSidebar.tsx**

```tsx
"use client"

import { Layers, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { DecorIcon } from "@/components/decor-icon"
import { DISCOVERY_QUICK_TAGS, type DiscoveryFilters } from "./types"

interface DiscoveryFilterSidebarProps {
  filters: DiscoveryFilters
  onFilterChange: (filters: DiscoveryFilters) => void
}

export function DiscoveryFilterSidebar({ filters, onFilterChange }: DiscoveryFilterSidebarProps) {
  const hasFilters = filters.source || filters.location || filters.minScore || filters.tags.length > 0

  const update = (patch: Partial<DiscoveryFilters>) => {
    onFilterChange({ ...filters, ...patch })
  }

  const toggleTag = (tag: string) => {
    const tags = filters.tags.includes(tag) ? filters.tags.filter((t) => t !== tag) : [...filters.tags, tag]
    update({ tags })
  }

  const clearAll = () => {
    onFilterChange({ source: "", location: "", minScore: "", tags: [] })
  }

  return (
    <div className="w-60 shrink-0 border-r border-border/60 pr-5 relative">
      <DecorIcon position="top-right" />

      <div className="space-y-4">
        {/* Source */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 mb-2 block">Source</label>
          <RadioGroup
            value={filters.source}
            onChange={(v) => update({ source: v as DiscoveryFilters["source"] })}
            options={[
              { value: "", label: "All Sources" },
              { value: "remoteok", label: "RemoteOK", dot: "bg-indigo-500" },
              { value: "arbeitnow", label: "Arbeitnow", dot: "bg-emerald-500" },
              { value: "adzuna", label: "Adzuna", dot: "bg-violet-500" },
            ]}
          />
        </div>

        {/* Location */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 mb-2 block">Location</label>
          <RadioGroup
            value={filters.location}
            onChange={(v) => update({ location: v as DiscoveryFilters["location"] })}
            options={[
              { value: "", label: "All Locations" },
              { value: "remote", label: "Remote" },
              { value: "hybrid", label: "Hybrid / On-site" },
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/discovery/DiscoveryFilterSidebar.tsx
git commit -m "feat(discovery): add filter sidebar component"
```

---

### Task 4: Create DiscoverySortDropdown.tsx

**Files:**
- Create: `src/components/discovery/DiscoverySortDropdown.tsx`

**Interfaces:**
- Consumes: `SortOption`, `onSortChange` callback
- Produces: `<DiscoverySortDropdown />` component

- [ ] **Step 1: Create DiscoverySortDropdown.tsx**

```tsx
"use client"

import { useState, useRef, useEffect } from "react"
import { ArrowUpDown, Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { DISCOVERY_SORT_OPTIONS, type SortOption } from "./types"

interface DiscoverySortDropdownProps {
  value: SortOption
  onChange: (value: SortOption) => void
}

export function DiscoverySortDropdown({ value, onChange }: DiscoverySortDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedLabel = DISCOVERY_SORT_OPTIONS.find((o) => o.value === value)?.label

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex h-8 items-center gap-1.5 rounded-none border border-border px-2.5 text-xs font-medium bg-background text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
      >
        <ArrowUpDown className="h-3 w-3" />
        {selectedLabel}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-none border border-border bg-popover p-1 shadow-lg backdrop-blur-xl">
          {DISCOVERY_SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={cn(
                "flex w-full items-center gap-2 rounded-none px-2 py-1.5 text-xs hover:bg-accent cursor-pointer",
                value === opt.value && "bg-accent font-medium text-foreground"
              )}
            >
              <Check className={cn("h-3.5 w-3.5 text-primary", value === opt.value ? "opacity-100" : "opacity-0")} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/discovery/DiscoverySortDropdown.tsx
git commit -m "feat(discovery): add sort dropdown component"
```

---

### Task 5: Create DiscoveryJobRow.tsx

**Files:**
- Create: `src/components/discovery/DiscoveryJobRow.tsx`

**Interfaces:**
- Consumes: `ExternalJobOpportunity`, `isExpanded`, `isSaved`, `isSaving`, `onToggle`, `onSave`
- Produces: `<DiscoveryJobRow />` component

- [ ] **Step 1: Create DiscoveryJobRow.tsx**

```tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BrainCircuit, BookmarkPlus, Check, ExternalLink, MapPin,
  DollarSign, Zap, Globe, RefreshCw, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DecorIcon } from "@/components/decor-icon"
import { cn } from "@/lib/utils"
import { getScoreBadgeClass, getSourceBadge } from "./types"
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

      {/* Collapsed row always visible */}
      <div className={cn("flex items-center gap-3", isExpanded && "px-4 pt-3 pb-2")}>
        <div className="size-8 rounded-none bg-muted flex items-center justify-center font-bold text-xs text-foreground shrink-0 border border-border">
          {job.company.slice(0, 2).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {job.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">{job.company}</span>
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
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
          <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-[200px] hidden lg:block">
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
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant={isSaved ? "secondary" : "default"}
                  disabled={isSaved || isSaving}
                  onClick={(e) => { e.stopPropagation(); onSave() }}
                  className="h-8 text-xs gap-1.5 cursor-pointer font-medium rounded-none"
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
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-none border border-border text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/discovery/DiscoveryJobRow.tsx
git commit -m "feat(discovery): add job row with inline expand"
```

---

### Task 6: Create DiscoveryJobList.tsx

**Files:**
- Create: `src/components/discovery/DiscoveryJobList.tsx`

**Interfaces:**
- Consumes: `ExternalJobOpportunity[]`, `isLoading`, `expandedRowId`, `savedJobs`, `saveMutation`, `onToggleExpand`, `onSave`
- Produces: `<DiscoveryJobList />` component

- [ ] **Step 1: Create DiscoveryJobList.tsx**

```tsx
"use client"

import { Briefcase, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DecorIcon } from "@/components/decor-icon"
import { DiscoveryJobRow } from "./DiscoveryJobRow"
import type { ExternalJobOpportunity } from "@/lib/ai/graph/tools/discovery-tools"
import type { UseMutationResult } from "@tanstack/react-query"

interface DiscoveryJobListProps {
  opportunities: ExternalJobOpportunity[]
  isLoading: boolean
  expandedRowId: string | null
  savedJobs: Set<string>
  saveMutation: UseMutationResult<any, Error, ExternalJobOpportunity>
  onToggleExpand: (id: string) => void
  onSave: (job: ExternalJobOpportunity) => void
  onClearAll: () => void
  onRefetch: () => void
  searchQuery: string
}

export function DiscoveryJobList({
  opportunities, isLoading, expandedRowId, savedJobs, saveMutation,
  onToggleExpand, onSave, onClearAll, onRefetch, searchQuery,
}: DiscoveryJobListProps) {
  if (isLoading) {
    return (
      <div className="space-y-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="animate-pulse py-3 px-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="size-8 bg-muted/40 rounded-none" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 bg-muted/40 rounded-none w-2/5" />
                <div className="h-3 bg-muted/30 rounded-none w-1/6" />
              </div>
              <div className="h-6 bg-muted/40 rounded-none w-16" />
            </div>
            <div className="flex gap-1 mt-2 ml-11">
              <div className="h-3 bg-muted/30 rounded-none w-12" />
              <div className="h-3 bg-muted/30 rounded-none w-16" />
              <div className="h-3 bg-muted/30 rounded-none w-10" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (opportunities.length === 0) {
    return (
      <div className="relative rounded-none border border-dashed border-border p-10 sm:p-14 text-center bg-card shadow-xs">
        <DecorIcon position="top-right" />
        <DecorIcon position="bottom-left" />
        <div className="mx-auto size-12 rounded-none bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary">
          <Briefcase className="size-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">No matching opportunities found</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
          {searchQuery ? (
            <>We couldn&apos;t find roles matching <span className="font-semibold text-foreground">&ldquo;{searchQuery}&rdquo;</span>. Try broader keywords or adjust filters.</>
          ) : (
            "No live opportunities returned. Try popular tech categories or refresh the feed."
          )}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto">
          <span className="text-xs text-muted-foreground mr-1">Try searching:</span>
          {["Full Stack", "React", "Backend", "AI Systems", "Go"].map((kw) => (
            <Button key={kw} variant="outline" size="sm" onClick={onClearAll} className="h-7 text-xs px-2.5 rounded-none cursor-pointer">{kw}</Button>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="default" size="sm" onClick={onClearAll} className="text-xs px-4 cursor-pointer rounded-none">Browse All Roles</Button>
          <Button variant="outline" size="sm" onClick={onRefetch} className="text-xs px-3 cursor-pointer rounded-none">
            <RefreshCw className="size-3.5 mr-1" />Refresh Feed
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-semibold text-foreground">{opportunities.length} Positions Available</span>
      </div>
      <div>
        {opportunities.map((job) => (
          <DiscoveryJobRow
            key={job.id}
            job={job}
            isExpanded={expandedRowId === job.id}
            isSaved={savedJobs.has(job.id)}
            isSaving={saveMutation.isPending && saveMutation.variables?.id === job.id}
            onToggle={() => onToggleExpand(job.id)}
            onSave={() => onSave(job)}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/discovery/DiscoveryJobList.tsx
git commit -m "feat(discovery): add job list with empty and loading states"
```

---

### Task 7: Create DiscoveryPage.tsx (main shell)

**Files:**
- Create: `src/components/discovery/DiscoveryPage.tsx`

**Interfaces:**
- Consumes: all previous components
- Produces: `<DiscoveryPage />` replacement for `JobDiscoveryHub`

- [ ] **Step 1: Create DiscoveryPage.tsx**

```tsx
"use client"

import { useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Search, X, Compass, RefreshCw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DecorIcon } from "@/components/decor-icon"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { DiscoveryStatRow } from "./DiscoveryStatRow"
import { DiscoveryFilterSidebar } from "./DiscoveryFilterSidebar"
import { DiscoverySortDropdown } from "./DiscoverySortDropdown"
import { DiscoveryJobList } from "./DiscoveryJobList"
import type { DiscoveryFilters, SortOption } from "./types"
import type { ExternalJobOpportunity } from "@/lib/ai/graph/tools/discovery-tools"

export function DiscoveryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<DiscoveryFilters>({ source: "", location: "", minScore: "", tags: [] })
  const [sortBy, setSortBy] = useState<SortOption>("score-desc")
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["discovery", searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchQuery.trim()) params.append("query", searchQuery.trim())
      params.append("limit", "50")
      const res = await fetch(`/api/jobs/discover?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to discover jobs")
      const json = await res.json()
      return json.data as { opportunities: ExternalJobOpportunity[]; count: number }
    },
    staleTime: 60_000,
  })

  const allOpportunities = data?.opportunities || []

  // Client-side filter
  const filteredOpportunities = allOpportunities.filter((job) => {
    if (filters.source && job.sourceBoard !== filters.source) return false
    if (filters.location) {
      const loc = job.location.toLowerCase()
      if (filters.location === "remote" && !loc.includes("remote")) return false
      if (filters.location === "hybrid" && (loc.includes("remote") && !loc.includes("hybrid"))) return false
    }
    if (filters.minScore) {
      const min = parseInt(filters.minScore)
      if (min === 85 && job.fitScore < 85) return false
      if (min === 70 && (job.fitScore < 70 || job.fitScore >= 85)) return false
      if (min === 0 && job.fitScore >= 70) return false
    }
    if (filters.tags.length > 0) {
      const jobTags = job.tags?.map((t) => t.toLowerCase()) || []
      if (!filters.tags.some((t) => jobTags.includes(t.toLowerCase()))) return false
    }
    return true
  })

  // Client-side sort
  const sortedOpportunities = [...filteredOpportunities].sort((a, b) => {
    switch (sortBy) {
      case "score-desc": return b.fitScore - a.fitScore
      case "score-asc": return a.fitScore - b.fitScore
      case "salary-desc": return parseSalary(b.salary) - parseSalary(a.salary)
      case "salary-asc": return parseSalary(a.salary) - parseSalary(b.salary)
      default: return 0
    }
  })

  const saveMutation = useMutation({
    mutationFn: async (job: ExternalJobOpportunity) => {
      const res = await fetch("/api/jobs/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          companyName: job.company,
          jobTitle: job.title,
          jobUrl: job.url,
          location: job.location,
          salary: job.salary,
          notes: `Fit Score: ${job.fitScore}%\n${job.matchRationale}`,
        }),
      })
      if (!res.ok) throw new Error("Failed to save job to tracker")
      return res.json()
    },
    onSuccess: (_, job) => {
      setSavedJobs((prev) => new Set(prev).add(job.id))
      queryClient.invalidateQueries({ queryKey: ["applications"] })
      toast.success(`"${job.title}" saved to your Tracker!`)
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save"),
  })

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    refetch()
  }

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id))
  }, [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="relative rounded-none border border-border bg-card p-5 sm:p-6 shadow-xs overflow-hidden">
        <DecorIcon position="top-right" />
        <DecorIcon position="bottom-left" />
        <div className="flex items-center gap-2 mb-1">
          <div className="flex size-7 items-center justify-center rounded-none bg-primary/10 text-primary border border-primary/20">
            <Compass className="size-4" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Job Discovery</h2>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Real-time opportunities from verified tech boards, scored against your profile.
        </p>
      </div>

      {/* Stat Row */}
      <DiscoveryStatRow opportunities={allOpportunities} savedJobs={savedJobs} />

      {/* Search + Sort Bar */}
      <div className="flex items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search roles, companies, or tech stack..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 text-xs sm:text-sm h-10 bg-background rounded-none"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5">
              <X className="size-3.5" />
            </button>
          )}
        </form>
        <DiscoverySortDropdown value={sortBy} onChange={setSortBy} />
        <Button
          type="button"
          variant="outline"
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="h-10 px-3 cursor-pointer rounded-none"
          title="Refresh"
        >
          <RefreshCw className={cn("size-4", (isLoading || isRefetching) && "animate-spin")} />
        </Button>
      </div>

      {/* Two-column: Sidebar + List */}
      <div className="flex gap-6">
        <DiscoveryFilterSidebar filters={filters} onFilterChange={setFilters} />
        <div className="flex-1 min-w-0">
          <DiscoveryJobList
            opportunities={sortedOpportunities}
            isLoading={isLoading}
            expandedRowId={expandedRowId}
            savedJobs={savedJobs}
            saveMutation={saveMutation}
            onToggleExpand={handleToggleExpand}
            onSave={(job) => saveMutation.mutate(job)}
            onClearAll={() => { setSearchQuery(""); setFilters({ source: "", location: "", minScore: "", tags: [] }) }}
            onRefetch={() => refetch()}
            searchQuery={searchQuery}
          />
        </div>
      </div>
    </div>
  )
}

function parseSalary(s?: string): number {
  if (!s) return 0
  const match = s.replace(/,/g, "").match(/\d+/)
  return match ? parseInt(match[0]) : 0
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/discovery/DiscoveryPage.tsx
git commit -m "feat(discovery): add main DiscoveryPage shell with state management"
```

---

### Task 8: Update page.tsx to use new component

**Files:**
- Modify: `src/app/(app)/discovery/page.tsx`

- [ ] **Step 1: Replace import and usage**

```tsx
"use client"

import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { DiscoveryPage } from "@/components/discovery/DiscoveryPage"

export default function DiscoveryPageWrapper() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) router.push("/login")
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="w-full animate-pulse space-y-4">
        <div className="h-24 rounded-none bg-muted/40" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-none bg-muted/30" />)}
        </div>
        <div className="h-10 rounded-none bg-muted/30" />
        <div className="flex gap-6">
          <div className="w-60 h-64 rounded-none bg-muted/30" />
          <div className="flex-1 space-y-1">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-16 rounded-none bg-muted/20" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <DiscoveryPage />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/discovery/page.tsx
git commit -m "feat(discovery): wire up new DiscoveryPage component"
```

---

### Task 9: Verify build passes

- [ ] **Step 1: Run typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

- [ ] **Step 3: Run build**

```bash
npm run build
```

- [ ] **Step 4: Fix any errors and commit**

```bash
git add -A
git commit -m "fix(discovery): resolve type and lint errors"
```
