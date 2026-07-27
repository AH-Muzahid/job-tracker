"use client"

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

function MiniArc({ value }: { value: number }) {
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
        stroke="hsl(var(--primary))"
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
    },
    {
      label: "Interview Rate",
      value: `${interviewRate}%`,
      badge: `${stats.interview + stats.assessment} interviewing`,
      arc: interviewRate,
    },
    {
      label: "Active Pipeline",
      value: activePipeline,
      badge: `${stats.applied} active`,
    },
    {
      label: "Success Rate",
      value: `${successRate}%`,
      badge: `${stats.offer} offers`,
      arc: successRate,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xl p-4 shadow-sm hover:border-border transition-all duration-300 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              {item.label}
            </span>
            {item.arc !== undefined && <MiniArc value={item.arc} />}
          </div>

          <div className="mt-3">
            <p className="text-2xl font-bold tracking-tight text-foreground font-sans">
              {item.value}
            </p>
            <p className="text-[10px] font-mono text-muted-foreground mt-1">
              {item.badge}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
