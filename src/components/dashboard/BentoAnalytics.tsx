"use client"

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts"

interface BentoAnalyticsProps {
  stats: {
    saved: number
    applied: number
    assessment: number
    interview: number
    rejected: number
    offer: number
    trend: { month: string; count: number }[]
  }
}

export default function BentoAnalytics({ stats }: BentoAnalyticsProps) {
  const statusData = [
    { name: "Saved", value: stats.saved },
    { name: "Applied", value: stats.applied },
    { name: "Assessment", value: stats.assessment },
    { name: "Interview", value: stats.interview },
    { name: "Rejected", value: stats.rejected },
    { name: "Offer", value: stats.offer },
  ].filter((d) => d.value > 0)

  const STATUS_COLORS: Record<string, string> = {
    Saved: "#3b82f6",       // Blue
    Applied: "#6366f1",     // Indigo
    Assessment: "#f59e0b",  // Amber / Gold
    Interview: "#a855f7",   // Purple
    Rejected: "#ef4444",    // Red
    Offer: "#10b981",       // Emerald Green
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Monthly Trend Bento */}
      <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xl p-5 shadow-sm hover:border-border transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Application Volume Trend
            </span>
            <h3 className="text-xs font-semibold text-foreground mt-0.5">Monthly Submissions</h3>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={stats.trend}>
            <defs>
              <linearGradient id="bentoAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground, #a1a1aa)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground, #a1a1aa)" }}
              axisLine={false}
              tickLine={false}
              width={24}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--color-border, rgba(255,255,255,0.1))",
                background: "var(--color-popover, #18181b)",
                color: "var(--color-popover-foreground, #fafafa)",
                fontSize: 11,
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#bentoAreaGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Status Distribution Bento */}
      <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xl p-5 shadow-sm hover:border-border transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Pipeline Distribution
            </span>
            <h3 className="text-xs font-semibold text-foreground mt-0.5">Status Breakdown</h3>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ResponsiveContainer width="50%" height={180}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                strokeWidth={0}
              >
                {statusData.map((item) => (
                  <Cell key={item.name} fill={STATUS_COLORS[item.name] || "#8884d8"} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--color-border, rgba(255,255,255,0.1))",
                  background: "var(--color-popover, #18181b)",
                  color: "var(--color-popover-foreground, #fafafa)",
                  fontSize: 11,
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex-1 space-y-1.5">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: STATUS_COLORS[item.name] || "#8884d8" }}
                />
                <span className="text-xs text-muted-foreground flex-1 truncate">{item.name}</span>
                <span className="text-xs font-mono font-bold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
