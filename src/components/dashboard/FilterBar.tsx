"use client"

import { useState, useRef, useEffect } from "react"
import { Check, ChevronDown, Filter, Search, X, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  STATUS_OPTIONS,
  SOURCE_OPTIONS,
  SORT_OPTIONS,
  type SortOption,
} from "./types"

interface FilterBarProps {
  search: string
  status: string
  source: string
  sort: SortOption
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onSourceChange: (value: string) => void
  onSortChange: (value: SortOption) => void
  onClearAll: () => void
  total: number
  filteredCount: number
  followUpOnly?: boolean
  onToggleFollowUpOnly?: () => void
  followUpCount?: number
}

export default function FilterBar({
  search,
  status,
  source,
  sort,
  onSearchChange,
  onStatusChange,
  onSourceChange,
  onSortChange,
  onClearAll,
  total,
  filteredCount,
  followUpOnly,
  onToggleFollowUpOnly,
  followUpCount,
}: FilterBarProps) {
  const hasFilters = Boolean(search || status || source || sort !== "newest" || followUpOnly)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut: Press "/" to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        document.activeElement !== searchInputRef.current &&
        !["INPUT", "TEXTAREA"].includes((document.activeElement as HTMLElement)?.tagName)
      ) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-sm w-full md:w-auto">
      {/* Search Input with Linear-style Keyboard Hint */}
      <div className="relative w-full sm:w-52 md:w-64">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search role, company, tag..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 rounded-[4px] border border-border bg-background pl-8 pr-12 text-xs outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/20 w-full transition-all placeholder:text-muted-foreground/60"
        />
        {search ? (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-[4px] hover:bg-muted transition-colors cursor-pointer"
            title="Clear search"
          >
            <X className="size-3" />
          </button>
        ) : (
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-4 items-center justify-center rounded border border-border bg-muted/60 px-1 font-mono text-[9px] font-medium text-muted-foreground">
            /
          </kbd>
        )}
      </div>

      {/* Stage / Status Dropdown */}
      <Dropdown
        label="Stage"
        value={status}
        options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
        onChange={onStatusChange}
      />

      {/* Source Dropdown */}
      <Dropdown
        label="Source"
        value={source}
        options={SOURCE_OPTIONS.map((s) => ({ value: s, label: s }))}
        onChange={onSourceChange}
      />

      {/* Sort Dropdown */}
      <Dropdown
        label="Sort"
        value={sort === "newest" ? "" : sort}
        displayValue={SORT_OPTIONS.find((s) => s.value === sort)?.label}
        options={SORT_OPTIONS}
        onChange={(v) => onSortChange((v || "newest") as SortOption)}
        align="right"
      />

      {/* Quick Follow-up Filter Chip */}
      {followUpCount !== undefined && followUpCount > 0 && (
        <button
          type="button"
          onClick={onToggleFollowUpOnly}
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[4px] text-xs font-medium border font-mono transition-colors cursor-pointer select-none",
            followUpOnly
              ? "border-amber-500 bg-amber-500 text-white font-semibold shadow-2xs"
              : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
          )}
          title={followUpOnly ? "Show all applications" : "Filter by applications needing follow-up"}
        >
          <Clock className="size-3" />
          <span>Follow-ups ({followUpCount})</span>
        </button>
      )}

      {/* Clear Filters Button */}
      {hasFilters && (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-[4px] text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-dashed border-border transition-colors cursor-pointer"
          title="Reset all active filters"
        >
          <X className="size-3" />
          Reset
        </button>
      )}

      {/* Results Count Pill */}
      <div className="ml-auto text-xs font-mono tabular-nums text-muted-foreground border border-border bg-card px-2.5 py-1.5 rounded-[4px] shadow-2xs">
        {hasFilters ? (
          <span>
            <strong className="text-foreground">{filteredCount}</strong> of {total}
          </span>
        ) : (
          <span>{total} total</span>
        )}
      </div>
    </div>
  )
}

function Dropdown({
  label,
  value,
  displayValue,
  options,
  onChange,
  align = "left",
}: {
  label: string
  value: string
  displayValue?: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  align?: "left" | "right"
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedLabel = displayValue || options.find((o) => o.value === value)?.label
  const isActive = Boolean(value)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-[4px] border px-2.5 text-xs font-medium transition-colors cursor-pointer select-none",
          isActive
            ? "border-foreground/30 bg-muted text-foreground shadow-2xs"
            : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        <Filter className={cn("size-3", isActive ? "text-primary" : "text-muted-foreground")} />
        <span>{selectedLabel || label}</span>
        {isActive && <span className="size-1.5 rounded-full bg-primary" />}
        <ChevronDown className="size-3 opacity-60 ml-0.5" />
      </button>

      {open && (
        <div
          className={cn(
            "absolute top-full z-50 mt-1 w-44 rounded-[6px] border border-border bg-popover p-1 shadow-lg backdrop-blur-xl animate-in fade-in-50 zoom-in-95",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          <button
            type="button"
            onClick={() => {
              onChange("")
              setOpen(false)
            }}
            className={cn(
              "flex w-full items-center justify-between rounded-[4px] px-2 py-1.5 text-xs hover:bg-accent cursor-pointer transition-colors text-left",
              !value && "bg-accent font-medium text-foreground"
            )}
          >
            <span>All {label}</span>
            {!value && <Check className="size-3 text-primary" />}
          </button>
          {options.map((option) => {
            const isOptionSelected = value === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-[4px] px-2 py-1.5 text-xs hover:bg-accent cursor-pointer transition-colors text-left",
                  isOptionSelected && "bg-accent font-medium text-foreground"
                )}
              >
                <span className="truncate">{option.label}</span>
                {isOptionSelected && <Check className="size-3 text-primary shrink-0 ml-1.5" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
