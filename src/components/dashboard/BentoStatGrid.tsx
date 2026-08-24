"use client"

import { Briefcase, TrendingUp, Activity, Award, ArrowUpRight } from "lucide-react"
import Link from "next/link"

interface BentoStatGridProps {
  stats: {
    total: number
    saved: number
    applied: number
    assessment: number
    interview: number
    rejected: number
    offer: number
    trend: { month: string; count: number }[]
  }
}

function VercelSparkline({ points, strokeColor = "#3b82f6" }: { points: number[]; strokeColor?: string }) {
  if (!points || points.length < 2) {
    points = [2, 4, 3, 7, 5, 9, 8, 12, 10, 15]
  }
  const max = Math.max(...points, 1)
  const min = Math.min(...points, 0)
  const range = max - min || 1
  const width = 120
  const height = 32

  const pathPoints = points.map((p, index) => {
    const x = (index / (points.length - 1)) * width
    const y = height - ((p - min) / range) * (height - 6) - 3
    return `${x},${y}`
  })

  const d = `M ${pathPoints.join(" L ")}`

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0">
      <path
        d={d}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function BentoStatGrid({ stats }: BentoStatGridProps) {
  const interviewRate = stats.total > 0
    ? Math.round(((stats.interview + stats.assessment) / stats.total) * 100)
    : 0
  const successRate = stats.total > 0
    ? Math.round((stats.offer / stats.total) * 100)
    : 0
  const activePipeline = stats.applied + stats.assessment + stats.interview
  const thisMonthCount = stats.trend[stats.trend.length - 1]?.count || 0
  const trendCounts = stats.trend.length >= 2 ? stats.trend.map((t) => t.count) : [2, 4, 6, 8, stats.total || 10]

  const items = [
    {
      label: "Total Applications",
      subLabel: "All Time Pipeline",
      value: stats.total,
      badge: `${thisMonthCount} this month`,
      icon: Briefcase,
      sparkColor: "#3b82f6",
      sparkPoints: trendCounts,
      href: "/applications",
    },
    {
      label: "Interview Rate",
      subLabel: "Screening to Stage",
      value: `${interviewRate}%`,
      badge: `${stats.interview + stats.assessment} active`,
      icon: TrendingUp,
      sparkColor: "#a855f7",
      sparkPoints: [5, 12, 18, 15, 24, interviewRate || 20],
      href: "/interview-prep",
    },
    {
      label: "Active In Flight",
      subLabel: "Applied & Assessing",
      value: activePipeline,
      badge: `${stats.applied} awaiting response`,
      icon: Activity,
      sparkColor: "#06b6d4",
      sparkPoints: [1, 3, 5, 4, 8, activePipeline || 6],
      href: "/applications?status=Applied",
    },
    {
      label: "Offer Rate",
      subLabel: "Pipeline Conversion",
      value: `${successRate}%`,
      badge: `${stats.offer} finalized`,
      icon: Award,
      sparkColor: "#10b981",
      sparkPoints: [0, 1, 1, 2, stats.offer || 2],
      href: "/applications?status=Offer",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="group relative flex flex-col justify-between p-4 rounded-xl border border-border/70 bg-card/60 backdrop-blur-xl hover:border-zinc-700 hover:bg-card/90 transition-all duration-200"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
              <span className="font-mono text-[11px] font-medium tracking-tight text-zinc-400 group-hover:text-zinc-200 transition-colors">
                {item.label}
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight text-foreground font-sans">
                {item.value}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                {item.badge}
              </span>
            </div>
          </div>

          <div className="flex items-end justify-between mt-4 pt-2 border-t border-border/40">
            <span className="text-[10px] font-mono text-zinc-500">
              {item.subLabel}
            </span>
            <VercelSparkline points={item.sparkPoints} strokeColor={item.sparkColor} />
          </div>
        </Link>
      ))}
    </div>
  )
}

