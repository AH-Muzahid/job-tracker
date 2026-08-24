"use client"

import Link from "next/link"
import { Layers, ArrowRight } from "lucide-react"

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
  { key: "saved", step: "01", label: "Saved", color: "#3b82f6" },
  { key: "applied", step: "02", label: "Applied", color: "#6366f1" },
  { key: "assessment", step: "03", label: "Assessment", color: "#f59e0b" },
  { key: "interview", step: "04", label: "Interview", color: "#a855f7" },
  { key: "offer", step: "05", label: "Offer", color: "#10b981" },
] as const

type StageKey = (typeof STAGES)[number]["key"]

export default function BentoPipelineFunnel({ stats }: BentoPipelineFunnelProps) {
  const totalPipeline = stats.saved + stats.applied + stats.assessment + stats.interview + stats.offer

  return (
    <section
      role="region"
      aria-label="Live Application Pipeline Funnel"
      className="rounded-xl border border-border/80 bg-card/70 backdrop-blur-2xl p-4 sm:p-5 shadow-sm hover:border-border/90 hover:shadow-md transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground tracking-tight">Live Pipeline Funnel</h2>
            <p className="text-[10px] font-mono text-muted-foreground">Conversion steps across current active applications</p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground bg-muted/40 border border-border/60 px-2 py-0.5 rounded-md hidden sm:inline-block">
          Click stage to filter
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {STAGES.map((s) => {
          const count = stats[s.key]
          const percentage = totalPipeline > 0 ? Math.round((count / totalPipeline) * 100) : 0

          return (
            <Link
              key={s.key}
              href={`/applications?status=${s.label}`}
              className="group relative flex flex-col justify-between p-3 rounded-lg border border-border/70 bg-card/60 hover:bg-card hover:border-primary/40 hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                  {s.step}
                </span>
                <span
                  className="h-2 w-2 rounded-full shadow-xs"
                  style={{ backgroundColor: s.color }}
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors flex items-center justify-between">
                  <span>{s.label}</span>
                  <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                </p>
                <div className="flex items-baseline justify-between mt-1">
                  <p className="text-xl font-extrabold text-foreground tracking-tight">
                    {count}
                  </p>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {percentage}%
                  </span>
                </div>

                {/* Micro Progress Bar */}
                <div className="w-full h-1 bg-muted rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%`, backgroundColor: s.color }}
                  />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {stats.rejected > 0 && (
        <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between px-1">
          <Link
            href="/applications?status=Rejected"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
          >
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="font-medium">Archived / Rejected Applications:</span>
            <span className="font-bold text-foreground font-mono bg-muted/50 px-2 py-0.5 rounded-md group-hover:bg-muted transition-colors">
              {stats.rejected}
            </span>
          </Link>
        </div>
      )}
    </section>
  )
}
