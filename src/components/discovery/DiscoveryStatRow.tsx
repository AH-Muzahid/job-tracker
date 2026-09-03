"use client"

import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { DecorIcon } from "@/components/decor-icon"
import type { ExternalJobOpportunity } from "@/lib/ai/graph/tools/discovery-tools"

function VercelSparkline({ points, strokeColor = "#3b82f6" }: { points: number[]; strokeColor?: string }) {
  if (!points || points.length < 2) points = [2, 4, 3, 7, 5, 9, 8, 12, 10, 15]
  const max = Math.max(...points, 1)
  const min = Math.min(...points, 0)
  const range = max - min || 1
  const width = 100
  const height = 28
  const pathPoints = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width
    const y = height - ((p - min) / range) * (height - 6) - 3
    return `${x},${y}`
  })
  const d = `M ${pathPoints.join(" L ")}`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible shrink-0 max-w-[65px] sm:max-w-[100px] h-5 sm:h-7">
      <path d={d} fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface DiscoveryStatRowProps {
  opportunities: ExternalJobOpportunity[]
  savedJobs: Set<string>
}

export function DiscoveryStatRow({ opportunities, savedJobs }: DiscoveryStatRowProps) {
  const total = opportunities.length
  const avgScore = total > 0 ? Math.round(opportunities.reduce((sum, j) => sum + j.fitScore, 0) / total) : 0
  const topScore = total > 0 ? Math.max(...opportunities.map((j) => j.fitScore)) : 0
  const savedCount = savedJobs.size
  const justInCount = opportunities.filter((j) => j.batchSlot === "just-in").length

  const sparkFromScores = opportunities.slice(0, 8).map((j) => j.fitScore)

  const items = [
    { label: "Active (24h)", value: total, badge: "rolling", sub: "rolling window", spark: sparkFromScores, color: "#3b82f6", href: "#" },
    { label: "Avg Fit Score", value: `${avgScore}%`, badge: `top ${topScore}%`, sub: "top match", spark: sparkFromScores, color: "#a855f7", href: "#" },
    { label: "Just In (<6h)", value: justInCount, badge: "new batch", sub: "latest release", spark: sparkFromScores, color: "#10b981", href: "#" },
    { label: "Saved", value: savedCount, badge: "tracked", sub: "to tracker", spark: [savedCount, savedCount, savedCount, savedCount, savedCount], color: "#06b6d4", href: "/applications?status=Saved" },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="group relative flex flex-col justify-between p-3 sm:p-4 rounded-none border border-border/70 bg-card/60 backdrop-blur-xl hover:border-zinc-700 hover:bg-card/90 transition-all duration-200"
        >
          <DecorIcon position="top-right" />
          <DecorIcon position="bottom-left" />
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 sm:mb-3">
              <span className="font-mono text-[10px] sm:text-[11px] font-medium tracking-tight text-zinc-400 group-hover:text-zinc-200 transition-colors truncate mr-1">
                {item.label}
              </span>
              <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-zinc-500 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all shrink-0" />
            </div>
            <div className="flex items-baseline gap-1.5 sm:gap-2">
              <span className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground font-sans">{item.value}</span>
              <span className="text-[10px] sm:text-[11px] font-mono text-muted-foreground truncate">{item.badge}</span>
            </div>
          </div>
          <div className="flex items-end justify-between mt-3 sm:mt-4 pt-2 border-t border-border/40">
            <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500 truncate max-w-[50px] sm:max-w-none">{item.sub}</span>
            <VercelSparkline points={item.spark} strokeColor={item.color} />
          </div>
        </Link>
      ))}
    </div>
  )
}
