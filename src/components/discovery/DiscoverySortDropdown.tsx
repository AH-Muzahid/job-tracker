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
        className="inline-flex h-8 items-center gap-1.5 rounded-none border border-border px-2 sm:px-2.5 text-xs font-medium bg-background text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
      >
        <ArrowUpDown className="h-3 w-3 shrink-0" />
        <span className="hidden sm:inline">{selectedLabel}</span>
        <span className="sm:hidden text-[11px]">Sort</span>
        <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
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
