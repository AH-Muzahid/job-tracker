"use client"

import Link from "next/link"

interface BentoPipelineFunnelProps {
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
  { key: "saved", step: "01", label: "Saved" },
  { key: "applied", step: "02", label: "Applied" },
  { key: "assessment", step: "03", label: "Assessment" },
  { key: "interview", step: "04", label: "Interview" },
  { key: "offer", step: "05", label: "Offer" },
] as const

type StageKey = (typeof STAGES)[number]["key"]

const STATUS_INDICATOR: Record<StageKey | "rejected", string> = {
  saved: "bg-status-saved",
  applied: "bg-status-applied",
  assessment: "bg-status-assessment",
  interview: "bg-status-interview",
  offer: "bg-status-offer",
  rejected: "bg-status-rejected",
}

export default function BentoPipelineFunnel({ stats }: BentoPipelineFunnelProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xl p-4 sm:p-5 shadow-sm hover:border-border transition-all duration-300">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Live Application Funnel
          </span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">
          Click any step to filter
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {STAGES.map((s) => {
          const count = stats[s.key]
          const hasCount = count > 0

          return (
            <Link
              key={s.key}
              href={`/applications?status=${s.label}`}
              className={`group relative flex flex-col justify-between p-3 rounded-xl border transition-all duration-200 ${
                hasCount
                  ? "border-border/80 bg-card/80 hover:border-primary/40 hover:shadow-xs"
                  : "border-border/40 bg-muted/20 opacity-70 hover:opacity-100"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-muted-foreground">
                  {s.step}
                </span>
                <span className={`h-2 w-2 rounded-full ${STATUS_INDICATOR[s.key]}`} />
              </div>

              <div>
                <p className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {s.label}
                </p>
                <p className="text-lg font-bold text-foreground tracking-tight mt-0.5">
                  {count}
                </p>
              </div>
            </Link>
          )
        })}
      </div>

      {stats.rejected > 0 && (
        <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between px-1">
          <Link
            href="/applications?status=Rejected"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className={`h-2 w-2 rounded-full ${STATUS_INDICATOR.rejected}`} />
            <span className="font-medium">Archived / Rejected:</span>
            <span className="font-bold text-foreground">{stats.rejected}</span>
          </Link>
        </div>
      )}
    </div>
  )
}
