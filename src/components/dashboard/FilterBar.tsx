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
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search jobs..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 rounded-md border bg-muted/50 pl-8 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring w-48"
        />
        {search && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
      />

      {hasFilters && (
        <button
          onClick={onClearAll}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
          Clear
        </button>
      )}

      <span className="text-xs text-muted-foreground">
        {hasFilters ? `${filteredCount} of ${total}` : `${total} jobs`}
      </span>
    </div>
  )
}

function Dropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
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
          "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors",
          value
            ? "border-primary/30 bg-primary/5 text-foreground"
            : "bg-muted/50 text-muted-foreground hover:text-foreground"
        )}
      >
        <Filter className="h-3 w-3" />
        {selectedLabel || label}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-40 rounded-lg border bg-popover p-1 shadow-md">
          <button
            onClick={() => {
              onChange("")
              setOpen(false)
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent",
              !value && "bg-accent"
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
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent",
                value === option.value && "bg-accent"
              )}
            >
              <Check
                className={cn(
                  "h-3.5 w-3.5",
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
