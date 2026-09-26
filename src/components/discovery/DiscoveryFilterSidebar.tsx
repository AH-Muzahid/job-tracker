"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { DiscoveryFilters, DiscoveryFacetCounts } from "./types"

interface DiscoveryFilterSidebarProps {
  filters: DiscoveryFilters
  onFilterChange: (filters: DiscoveryFilters) => void
  facetCounts?: DiscoveryFacetCounts
  totalCount?: number
  className?: string
  hideDecor?: boolean
  onApplyFilters?: () => void
}

export function DiscoveryFilterSidebar({
  filters,
  onFilterChange,
  facetCounts,
  onApplyFilters,
  totalCount,
  className,
}: DiscoveryFilterSidebarProps) {
  const [openAccordions, setOpenAccordions] = useState<{
    experience: boolean
    company: boolean
    salary: boolean
    visa: boolean
  }>({
    experience: false,
    company: false,
    salary: false,
    visa: false,
  })

  const counts: DiscoveryFacetCounts = facetCounts || {
    total: totalCount ?? 128,
    recommended: 48,
    saved: 12,
    recent: 14,
    hidden: 3,
    fullTime: 86,
    partTime: 12,
    contract: 18,
    internship: 8,
    remote: 72,
    hybrid: 34,
    onsite: 22,
  }

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

  const clearAll = () => {
    onFilterChange({
      source: "",
      location: "",
      minScore: "",
      visaSponsorship: "",
      batchSlot: filters.batchSlot,
      tags: [],
      hideApplied: false,
    })
  }

  const toggleAccordion = (key: keyof typeof openAccordions) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className={cn("w-full space-y-4 rounded-[6px] border border-border bg-card p-4 shadow-none", className)}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <h3 className="font-semibold text-sm sm:text-base text-foreground">Filters</h3>
        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-primary font-medium hover:underline cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="size-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Job Type Section */}
      <div className="space-y-2 pt-1">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Job Type
        </label>
        <div className="space-y-1.5">
          {[
            { label: "Full-time", count: counts.fullTime, tag: "Full-time" },
            { label: "Part-time", count: counts.partTime, tag: "Part-time" },
            { label: "Contract", count: counts.contract, tag: "Contract" },
            { label: "Internship", count: counts.internship, tag: "Internship" },
          ].map((item) => {
            const isChecked = filters.tags.includes(item.tag)
            return (
              <label
                key={item.label}
                className="flex items-center justify-between text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none py-0.5"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const tags = e.target.checked
                        ? [...filters.tags, item.tag]
                        : filters.tags.filter((t) => t !== item.tag)
                      update({ tags })
                    }}
                    className="size-3.5 rounded-xs border-border accent-primary cursor-pointer"
                  />
                  <span>{item.label}</span>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-muted-foreground/75">
                  {item.count}
                </span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Work Mode Checkboxes */}
      <div className="space-y-2 pt-2 border-t border-border">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Work Mode
        </label>
        <div className="space-y-1.5">
          {[
            { label: "Remote", value: "remote", count: counts.remote },
            { label: "Hybrid", value: "hybrid", count: counts.hybrid },
            { label: "On-site", value: "onsite", count: counts.onsite },
          ].map((item) => {
            const isChecked = filters.location === item.value
            return (
              <label
                key={item.label}
                className="flex items-center justify-between text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none py-0.5"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      update({ location: e.target.checked ? (item.value as DiscoveryFilters["location"]) : "" })
                    }}
                    className="size-3.5 rounded-xs border-border accent-primary cursor-pointer"
                  />
                  <span>{item.label}</span>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-muted-foreground/75">
                  {item.count}
                </span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Collapsible Accordion: Experience Level */}
      <div className="border-t border-border pt-2">
        <button
          type="button"
          onClick={() => toggleAccordion("experience")}
          className="w-full flex items-center justify-between py-1 text-xs font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
        >
          <span>Experience Level</span>
          {openAccordions.experience ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
        {openAccordions.experience && (
          <div className="pt-2 space-y-1.5">
            {[
              { label: "Entry Level (0-2 yrs)", tag: "Entry" },
              { label: "Mid Level (3-5 yrs)", tag: "Mid" },
              { label: "Senior (5+ yrs)", tag: "Senior" },
              { label: "Staff / Lead", tag: "Staff" },
            ].map((exp) => (
              <label key={exp.tag} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.tags.includes(exp.tag)}
                  onChange={(e) => {
                    const tags = e.target.checked
                      ? [...filters.tags, exp.tag]
                      : filters.tags.filter((t) => t !== exp.tag)
                    update({ tags })
                  }}
                  className="size-3.5 rounded-xs border-border accent-primary cursor-pointer"
                />
                <span>{exp.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Collapsible Accordion: Match Score */}
      <div className="border-t border-border pt-2">
        <button
          type="button"
          onClick={() => toggleAccordion("salary")}
          className="w-full flex items-center justify-between py-1 text-xs font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
        >
          <span>Match Score</span>
          {openAccordions.salary ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
        {openAccordions.salary && (
          <div className="pt-2 space-y-1.5">
            {[
              { value: "", label: "All Match Scores" },
              { value: "90", label: "90%+ Top Picks" },
              { value: "75", label: "75%+ Strong Fit" },
              { value: "50", label: "50%+ Moderate" },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                <input
                  type="radio"
                  name="minScore"
                  checked={filters.minScore === opt.value}
                  onChange={() => update({ minScore: opt.value as DiscoveryFilters["minScore"] })}
                  className="size-3.5 text-primary accent-primary cursor-pointer"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Collapsible Accordion: Visa & Work Auth */}
      <div className="border-t border-border pt-2">
        <button
          type="button"
          onClick={() => toggleAccordion("visa")}
          className="w-full flex items-center justify-between py-1 text-xs font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
        >
          <span>Visa &amp; Work Auth</span>
          {openAccordions.visa ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
        {openAccordions.visa && (
          <div className="pt-2 space-y-1.5">
            {[
              { value: "", label: "All Candidates" },
              { value: "available", label: "Visa Sponsor Available" },
              { value: "not_available", label: "No Sponsorship Needed" },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                <input
                  type="radio"
                  name="visaSponsorship"
                  checked={(filters.visaSponsorship || "") === opt.value}
                  onChange={() => update({ visaSponsorship: opt.value as DiscoveryFilters["visaSponsorship"] })}
                  className="size-3.5 text-primary accent-primary cursor-pointer"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Apply Filters & Results Count Footer */}
      <div className="pt-3 border-t border-border space-y-2">
        <Button
          type="button"
          onClick={() => onApplyFilters?.()}
          className="w-full h-8.5 text-xs font-semibold rounded-sm bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer shadow-none"
        >
          Apply Filters
        </Button>
        <div className="text-center text-[11px] text-muted-foreground font-mono tabular-nums">
          {totalCount ?? counts.total} results
        </div>
      </div>
    </div>
  )
}
