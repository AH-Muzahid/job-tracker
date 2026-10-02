"use client"

import React, { useMemo } from "react"
import {
  computeSalaryIndex,
  parseSalaryString,
  getIndustryBaseline,
  type SalaryIndexAssessment,
} from "@/lib/salary/benchmark-engine"
import { Scale } from "lucide-react"

interface SalaryIndexIndicatorProps {
  salary?: string | null
  company?: string | null
  role?: string | null
  location?: string | null
  benchmarkMedian?: number | null
  assessment?: SalaryIndexAssessment | null
  className?: string
  showDetails?: boolean
  size?: "sm" | "default"
}

export function SalaryIndexIndicator({
  salary,
  role,
  location,
  benchmarkMedian,
  assessment: propAssessment,
  className = "",
  showDetails = false,
  size = "sm",
}: SalaryIndexIndicatorProps) {
  const assessment = useMemo(() => {
    if (propAssessment) return propAssessment
    if (!salary) return null
    const parsed = parseSalaryString(salary)
    if (!parsed) return null

    // Determine baseline:
    // If benchmarkMedian is provided and seems in the same order of magnitude (currency aligned), use it.
    // Otherwise or if omitted, compute region-aware baseline.
    let median = benchmarkMedian
    let curr = parsed.currency
    let source = "Market Benchmark"

    const isBdtMismatch = parsed.currency === "BDT" && (!median || median < 500000)
    const isUsdMismatch = parsed.currency === "USD" && median && median > 1000000

    if (!median || isBdtMismatch || isUsdMismatch) {
      const baseline = getIndustryBaseline(role, location, parsed.currency)
      median = baseline.median
      curr = baseline.currency
      source = baseline.source
    }

    return computeSalaryIndex(parsed.midpoint, {
      salaryMedian: median,
      currency: curr,
      source,
    })
  }, [salary, benchmarkMedian, propAssessment, role, location])

  if (!assessment) return null

  const isAbove = assessment.band === "top_10" || assessment.band === "above_market"
  const isBelow = assessment.band === "below_market"

  // Stripe hairline color tokens (strictly no gradients)
  const badgeColors = isAbove
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : isBelow
    ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
    : "border-border bg-muted/60 text-muted-foreground"

  const dotColor = isAbove
    ? "bg-emerald-500"
    : isBelow
    ? "bg-rose-500"
    : "bg-muted-foreground/60"

  const paddingClass = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"

  const symbol =
    assessment.currency === "BDT"
      ? "৳"
      : assessment.currency === "EUR"
      ? "€"
      : assessment.currency === "GBP"
      ? "£"
      : "$"

  const formattedMedian =
    assessment.currency === "BDT"
      ? assessment.benchmarkMedian >= 100000
        ? `৳${(assessment.benchmarkMedian / 100000).toFixed(1)}L`
        : `৳${(assessment.benchmarkMedian / 1000).toFixed(0)}k`
      : `${symbol}${(assessment.benchmarkMedian / 1000).toFixed(0)}k`

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-[4px] border font-mono font-medium select-none ${badgeColors} ${paddingClass} ${className}`}
      title={`Market Median: ${formattedMedian} | Source: ${assessment.source}`}
    >
      <span className={`size-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span className="flex items-center gap-1">
        <Scale className="size-2.5 opacity-70 shrink-0" />
        <span className="tabular-nums">
          Idx {assessment.index}
        </span>
        {assessment.deltaPercent !== 0 && (
          <span className="tabular-nums opacity-90 text-[9px]">
            ({assessment.deltaPercent > 0 ? `+${assessment.deltaPercent}%` : `${assessment.deltaPercent}%`})
          </span>
        )}
      </span>
      {showDetails && (
        <span className="text-[9px] opacity-75 font-sans border-l border-border/40 pl-1">
          {assessment.band === "top_10"
            ? "Top 10%"
            : assessment.band === "above_market"
            ? "Above Mkt"
            : assessment.band === "below_market"
            ? "Below Mkt"
            : "Market Align"}
        </span>
      )}
    </div>
  )
}
