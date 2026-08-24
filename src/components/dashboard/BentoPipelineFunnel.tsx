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

export default function BentoPipelineFunnel({ stats }: BentoPipelineFunnelProps) {
  const totalPipeline = stats.saved + stats.applied + stats.assessment + stats.interview + stats.offer

  return (
    <section
      role="region"
      aria-label="Live Application Pipeline Funnel"
      className="rounded-xl border border-border/80 bg-card/60 backdrop-blur-2xl p-4 sm:p-5 shadow-sm hover:border-zinc-700 transition-all duration-200"
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-muted/60 text-foreground border border-border/60">
            <Layers className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-mono font-medium text-foreground tracking-tight">Conversion Funnel</h2>
            <p className="text-[11px] text-muted-foreground">Active pipeline distribution by hiring stage</p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 bg-muted/30 border border-border/60 px-2 py-0.5 rounded-md hidden sm:inline-block">
          {totalPipeline} active roles
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {STAGES.map((s) => {
          const count = stats[s.key]
          const percentage = totalPipeline > 0 ? Math.round((count / totalPipeline) * 100) : 0

          return (
            <Link
              key={s.key}
              href={`/applications?status=${s.label}`}
              className="group relative flex flex-col justify-between p-3.5 rounded-lg border border-border/60 bg-background/40 hover:bg-card hover:border-zinc-700 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-zinc-500">
                  {s.step}
                </span>
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
              </div>

              <div>
                <p className="text-xs font-medium text-zinc-400 group-hover:text-foreground transition-colors flex items-center justify-between">
                  <span>{s.label}</span>
                  <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-zinc-400" />
                </p>
                <div className="flex items-baseline justify-between mt-1">
                  <p className="text-xl font-bold text-foreground tracking-tight font-sans">
                    {count}
                  </p>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {percentage}%
                  </span>
                </div>

                {/* Micro Progress Bar */}
                <div className="w-full h-1 bg-muted/60 rounded-full mt-2 overflow-hidden">
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
        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between px-1">
          <Link
            href="/applications?status=Rejected"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-red-500/80" />
            <span className="font-mono text-[11px] text-zinc-400">Archived / Rejected:</span>
            <span className="font-bold text-foreground font-mono bg-muted/40 border border-border/60 px-2 py-0.5 rounded text-[11px]">
              {stats.rejected}
            </span>
          </Link>
        </div>
      )}
    </section>
  )
}
