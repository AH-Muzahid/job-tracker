"use client"

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts"
import { TrendingUp, PieChart as PieChartIcon } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
      <Card className="rounded-xl border border-border/80 bg-card/70 backdrop-blur-2xl p-5 sm:p-6 shadow-sm hover:border-border/90 hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden">
        <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-foreground tracking-tight">Application Volume Trend</CardTitle>
              <p className="text-[10px] font-mono text-muted-foreground">Monthly job application volume</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={stats.trend}>
              <defs>
                <linearGradient id="bentoAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
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
                  borderRadius: 10,
                  border: "1px solid var(--color-border, rgba(255,255,255,0.15))",
                  background: "var(--color-popover, #18181b)",
                  color: "var(--color-popover-foreground, #fafafa)",
                  fontSize: 11,
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#6366f1"
                strokeWidth={2.5}
                fill="url(#bentoAreaGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Status Distribution Bento */}
      <Card className="rounded-xl border border-border/80 bg-card/70 backdrop-blur-2xl p-5 sm:p-6 shadow-sm hover:border-border/90 hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden">
        <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <PieChartIcon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-foreground tracking-tight">Pipeline Status Breakdown</CardTitle>
              <p className="text-[10px] font-mono text-muted-foreground">Distribution across all stages</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex items-center gap-4">
          <ResponsiveContainer width="50%" height={190}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={46}
                outerRadius={72}
                strokeWidth={0}
              >
                {statusData.map((item) => (
                  <Cell key={item.name} fill={STATUS_COLORS[item.name] || "#8884d8"} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 14,
                  border: "1px solid var(--color-border, rgba(255,255,255,0.15))",
                  background: "var(--color-popover, #18181b)",
                  color: "var(--color-popover-foreground, #fafafa)",
                  fontSize: 11,
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex-1 space-y-2">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
                  style={{ background: STATUS_COLORS[item.name] || "#8884d8" }}
                />
                <span className="text-xs font-medium text-muted-foreground flex-1 truncate">{item.name}</span>
                <Badge variant="outline" className="text-xs font-mono font-bold text-foreground border-border/50 bg-muted/40 px-2 py-0.5">
                  {item.value}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
