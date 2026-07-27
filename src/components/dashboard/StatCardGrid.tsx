"use client"

interface StatCardGridProps {
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

function ProgressRing({ value, size = 40, strokeWidth = 3.5 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <svg
      width={size}
      height={size}
      className="shrink-0 -rotate-90"
      style={{ "--ring-circumference": circumference, "--ring-offset": offset } as React.CSSProperties}
    >
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
        strokeDashoffset={circumference}
        className="animate-draw-ring"
        style={{ "--ring-circumference": circumference, "--ring-offset": offset } as React.CSSProperties}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="rotate-90 origin-center fill-foreground text-[9px] font-bold"
      >
        {value}%
      </text>
    </svg>
  )
}

export default function StatCardGrid({ stats }: StatCardGridProps) {
  const interviewRate = stats.total > 0
    ? Math.round(((stats.interview + stats.assessment) / stats.total) * 100)
    : 0
  const successRate = stats.total > 0
    ? Math.round((stats.offer / stats.total) * 100)
    : 0
  const activePipeline = stats.applied + stats.assessment + stats.interview
  const thisMonthCount = stats.trend[stats.trend.length - 1]?.count || 0
  const lastMonthCount = stats.trend[stats.trend.length - 2]?.count || 0
  const monthDiff = thisMonthCount - lastMonthCount

  const cards = [
    {
      title: "Total Applications",
      value: stats.total,
      subtitle: monthDiff >= 0 ? `+${thisMonthCount} this month` : `${thisMonthCount} this month`,
    },
    {
      title: "Interview Rate",
      value: interviewRate,
      isPercentage: true,
      subtitle: `${stats.interview + stats.assessment} interviewing`,
    },
    {
      title: "Active Pipeline",
      value: activePipeline,
      subtitle: `${stats.applied} applied, ${stats.interview} interview`,
    },
    {
      title: "Success Rate",
      value: successRate,
      isPercentage: true,
      subtitle: `${stats.offer} offer${stats.offer !== 1 ? "s" : ""} total`,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, i) => (
        <div
          key={card.title}
          className={`group rounded-xl border border-border bg-card p-4 hover:shadow-md transition-all duration-200 animate-fade-in-up animation-delay-${(i + 1) * 100}`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
              {card.isPercentage ? (
                <div className="flex items-center gap-2.5">
                  <p className="text-2xl font-bold tracking-tight text-foreground">{card.value}%</p>
                </div>
              ) : (
                <p className="text-2xl font-bold tracking-tight text-foreground">{card.value}</p>
              )}
              {card.subtitle && (
                <p className="text-[10px] text-muted-foreground leading-tight">{card.subtitle}</p>
              )}
            </div>
            {card.isPercentage && (
              <ProgressRing value={card.value} />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
