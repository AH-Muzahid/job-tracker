"use client"

import { useState, useRef, useEffect } from "react"
import { Check, ChevronDown, Filter, Search, X } from "lucide-react"
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
}: FilterBarProps) {
  const hasFilters = search || status || source || sort !== "newest"

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-sm w-full md:w-auto">
      <div className="relative w-full sm:w-52 md:w-64">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search company, title, tag..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 rounded-md border border-border bg-background pl-8 pr-8 text-xs outline-none focus:border-foreground/30 w-full transition-all"
        />
        {search && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-md hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <Dropdown
        label="Status"
        value={status}
        options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
        onChange={onStatusChange}
      />

      <Dropdown
        label="Source"
        value={source}
        options={SOURCE_OPTIONS.map((s) => ({ value: s, label: s }))}
        onChange={onSourceChange}
      />

      <Dropdown
        label="Sort"
        value={sort}
        options={SORT_OPTIONS}
        onChange={(v) => onSortChange(v as SortOption)}
        align="right"
      />

      {hasFilters && (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
        >
          <X className="h-3 w-3" />
          Clear
        </button>
      )}

      <div className="ml-auto text-xs font-mono tabular-nums text-muted-foreground border border-border bg-card/60 px-2.5 py-1 rounded-md">
        {hasFilters ? `${filteredCount} of ${total}` : `${total} total`}
      </div>
    </div>
  )
}

function Dropdown({
  label,
  value,
  options,
  onChange,
  align = "left",
}: {
  label: string
  value: string
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

  const selectedLabel = options.find((o) => o.value === value)?.label

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium transition-colors cursor-pointer",
          value
            ? "border-foreground/20 bg-muted/60 text-foreground"
            : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted/40"
        )}
      >
        <Filter className="h-3 w-3 text-muted-foreground" />
        {selectedLabel || label}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div className={cn(
          "absolute top-full z-50 mt-1 w-44 rounded-md border border-border bg-popover p-1 shadow-lg backdrop-blur-xl",
          align === "right" ? "right-0" : "left-0"
        )}>
          <button
            onClick={() => {
              onChange("")
              setOpen(false)
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent cursor-pointer",
              !value && "bg-accent font-medium text-foreground"
            )}
          >
            <span className="w-3.5" />
            All {label}
          </button>
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent cursor-pointer",
                value === option.value && "bg-accent font-medium text-foreground"
              )}
            >
              <Check
                className={cn(
                  "h-3.5 w-3.5 text-primary",
                  value === option.value ? "opacity-100" : "opacity-0"
                )}
              />
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
