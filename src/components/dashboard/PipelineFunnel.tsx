"use client"

import Link from "next/link"

interface PipelineFunnelProps {
  stats: {
    saved: number
    applied: number
    assessment: number
    interview: number
    rejected: number
    offer: number
  }
}

const STAGES = [
  { key: "saved", label: "Saved" },
  { key: "applied", label: "Applied" },
  { key: "assessment", label: "Assessment" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
] as const

type StageKey = (typeof STAGES)[number]["key"]

const STATUS_COLOR_MAP: Record<StageKey | "rejected", string> = {
  saved: "bg-status-saved",
  applied: "bg-status-applied",
  assessment: "bg-status-assessment",
  interview: "bg-status-interview",
  offer: "bg-status-offer",
  rejected: "bg-status-rejected",
}

export default function PipelineFunnel({ stats }: PipelineFunnelProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 animate-fade-in-up animation-delay-100">
      {/* Main pipeline */}
      <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1">
        {STAGES.map((stage, i) => {
          const count = stats[stage.key]
          const isActive = count > 0
          return (
            <div key={stage.key} className="flex items-center gap-1 sm:gap-2 shrink-0">
              <Link
                href={`/applications?status=${stage.label}`}
                className={`group relative flex items-center gap-2 rounded-lg border px-3 py-2 sm:px-4 sm:py-2.5 transition-all duration-200 ${
                  isActive
                    ? "border-border bg-card hover:bg-muted/50 hover:shadow-sm"
                    : "border-border/50 bg-muted/30 opacity-60 hover:opacity-80"
                }`}
              >
                <div className={`h-2 w-2 rounded-full shrink-0 ${STATUS_COLOR_MAP[stage.key]}`} />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-muted-foreground leading-none mb-0.5 hidden sm:block">
                    {stage.label}
                  </p>
                  <p className={`text-sm font-bold leading-none ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                    {count}
                  </p>
                </div>
                {/* Mobile label */}
                <span className="text-[10px] font-medium text-muted-foreground sm:hidden">
                  {stage.label}
                </span>
              </Link>
              {/* Connector arrow */}
              {i < STAGES.length - 1 && (
                <svg className="h-3 w-3 text-border shrink-0 hidden sm:block" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          )
        })}
      </div>

      {/* Rejected branch */}
      {stats.rejected > 0 && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <Link
            href="/applications?status=Rejected"
            className="inline-flex items-center gap-2 rounded-lg border border-border/50 px-3 py-1.5 hover:bg-muted/50 transition-all text-muted-foreground hover:text-foreground"
          >
            <div className={`h-2 w-2 rounded-full ${STATUS_COLOR_MAP.rejected}`} />
            <span className="text-[10px] font-medium">Rejected</span>
            <span className="text-xs font-bold">{stats.rejected}</span>
          </Link>
        </div>
      )}
    </div>
  )
}
