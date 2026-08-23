"use client"

import { Briefcase, TrendingUp, Activity, Award } from "lucide-react"

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

function MiniArc({ value, color = "hsl(var(--primary))" }: { value: number; color?: string }) {
  const size = 36
  const strokeWidth = 3
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-700"
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

  const items = [
    {
      label: "Total Applications",
      value: stats.total,
      badge: `${thisMonthCount} this month`,
      icon: Briefcase,
      iconBg: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    },
    {
      label: "Interview Rate",
      value: `${interviewRate}%`,
      badge: `${stats.interview + stats.assessment} interviewing`,
      icon: TrendingUp,
      iconBg: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      arc: interviewRate,
      arcColor: "#a855f7",
    },
    {
      label: "Active Pipeline",
      value: activePipeline,
      badge: `${stats.applied} active`,
      icon: Activity,
      iconBg: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    },
    {
      label: "Success Rate",
      value: `${successRate}%`,
      badge: `${stats.offer} offers`,
      icon: Award,
      iconBg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      arc: successRate,
      arcColor: "#10b981",
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => {
        const IconComponent = item.icon
        return (
          <div
            key={item.label}
            className="group relative rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xl p-4 shadow-sm hover:border-border/100 hover:shadow-md transition-all duration-300 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl border ${item.iconBg} transition-transform group-hover:scale-105`}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  {item.label}
                </span>
              </div>
              {item.arc !== undefined && <MiniArc value={item.arc} color={item.arcColor} />}
            </div>

            <div className="mt-3">
              <p className="text-2xl font-bold tracking-tight text-foreground font-sans">
                {item.value}
              </p>
              <p className="text-[10px] font-mono text-muted-foreground mt-1 flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/60" />
                {item.badge}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

