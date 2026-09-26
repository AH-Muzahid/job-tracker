"use client"

import React from "react"
import { CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { OpportunityDetailData } from "./types"

interface OpportunityMatchScoreCardProps {
  opportunity: OpportunityDetailData
}

export function OpportunityMatchScoreCard({ opportunity }: OpportunityMatchScoreCardProps) {
  const { scores } = opportunity
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (scores.overall / 100) * circumference

  const breakdownItems = [
    { label: "Skills Match", value: scores.skillsMatch },
    { label: "Experience Match", value: scores.experienceMatch },
    { label: "Role Fit", value: scores.roleFit },
    { label: "Company Fit", value: scores.companyFit },
  ]

  return (
    <div className="bg-card border border-border rounded-[6px] p-5 shadow-none space-y-4">
      <h3 className="text-sm font-bold text-foreground tracking-tight">Match Score</h3>

      {/* Side-by-side Circular Gauge and Progress Bars (Matching media_1790349120375.png) */}
      <div className="flex flex-col sm:flex-row items-center gap-5 pt-1">
        {/* Left: Circular Gauge */}
        <div className="shrink-0 relative flex items-center justify-center">
          <svg className="size-24 -rotate-90 transform" viewBox="0 0 88 88">
            <circle
              cx="44"
              cy="44"
              r={radius}
              className="stroke-muted/40"
              strokeWidth="5.5"
              fill="transparent"
            />
            <circle
              cx="44"
              cy="44"
              r={radius}
              className={cn(
                "transition-all duration-1000 ease-out",
                scores.overall >= 75 ? "stroke-emerald-500" : scores.overall >= 60 ? "stroke-sky-500" : "stroke-amber-500"
              )}
              strokeWidth="5.5"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-xl font-bold tracking-tight text-foreground tabular-nums">
              {scores.overall}%
            </span>
            <span
              className={cn(
                "text-[10px] font-medium",
                scores.overall >= 75
                  ? "text-emerald-600 dark:text-emerald-400"
                  : scores.overall >= 60
                  ? "text-sky-600 dark:text-sky-400"
                  : "text-amber-600 dark:text-amber-400"
              )}
            >
              {scores.overall >= 90
                ? "Great Match"
                : scores.overall >= 75
                ? "Strong Match"
                : scores.overall >= 60
                ? "Good Match"
                : "Stretch Role"}
            </span>
          </div>
        </div>

        {/* Right: 4 Dimension Progress Bars */}
        <div className="flex-1 min-w-0 space-y-2.5 w-full">
          {breakdownItems.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-medium">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="text-foreground font-semibold tabular-nums">{item.value}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    scores.overall >= 75
                      ? "bg-emerald-500"
                      : scores.overall >= 60
                      ? "bg-sky-500"
                      : "bg-amber-500"
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, item.value))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Candidate Alignment Banner */}
      {scores.overall >= 75 ? (
        <div className="flex items-start gap-2.5 p-3 rounded-sm bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-xs">
          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-semibold text-emerald-800 dark:text-emerald-300">
              You&apos;re a strong candidate!
            </div>
            <div className="text-[11px] text-emerald-700/90 dark:text-emerald-400/90 leading-relaxed">
              This role aligns well with your verified skills and experience.
            </div>
          </div>
        </div>
      ) : scores.overall >= 60 ? (
        <div className="flex items-start gap-2.5 p-3 rounded-sm bg-sky-50 dark:bg-sky-950/40 border border-sky-500/20 text-xs">
          <CheckCircle2 className="size-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-semibold text-sky-800 dark:text-sky-300">
              Good Potential Match
            </div>
            <div className="text-[11px] text-sky-700/90 dark:text-sky-400/90 leading-relaxed">
              Key stack components match. Highlight your practical projects to maximize interview yield.
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2.5 p-3 rounded-sm bg-amber-50 dark:bg-amber-950/40 border border-amber-500/20 text-xs">
          <CheckCircle2 className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-semibold text-amber-800 dark:text-amber-300">
              Stretch Opportunity
            </div>
            <div className="text-[11px] text-amber-700/90 dark:text-amber-400/90 leading-relaxed">
              Some requirements may need bridge preparation or tailored portfolio materials.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
