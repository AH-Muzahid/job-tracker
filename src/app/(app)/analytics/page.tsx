"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { BarChart3, PieChart as PieIcon, TrendingUp, Target } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line,
} from "recharts"

interface Stats {
  total: number
  saved: number
  applied: number
  assessment: number
  interview: number
  rejected: number
  offer: number
  trend: Array<{ month: string; count: number }>
  bySource: Array<{ source: string; count: number }>
}

const COLORS = ["#6366f1", "#3b82f6", "#f59e0b", "#a855f7", "#ef4444", "#22c55e", "#06b6d4"]

export default function AnalyticsPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push("/login"); return }

    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return null

  const statusData = [
    { name: "Saved", value: stats.saved },
    { name: "Applied", value: stats.applied },
    { name: "Assessment", value: stats.assessment },
    { name: "Interview", value: stats.interview },
    { name: "Rejected", value: stats.rejected },
    { name: "Offer", value: stats.offer },
  ].filter((d) => d.value > 0)

  const successRate = stats.total > 0
    ? Math.round(((stats.offer) / stats.total) * 100)
    : 0

  const interviewRate = stats.total > 0
    ? Math.round(((stats.interview + stats.assessment) / stats.total) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Insights into your job search</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Target className="h-4 w-4" />} label="Total Applications" value={stats.total} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Interview Rate" value={`${interviewRate}%`} />
        <StatCard icon={<PieIcon className="h-4 w-4" />} label="Success Rate" value={`${successRate}%`} />
        <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Active Pipeline" value={stats.applied + stats.assessment + stats.interview} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stats.trend}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Applications by Source</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.bySource}>
                <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Funnel</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 space-y-3">
            {[
              { label: "Saved", value: stats.saved, color: "bg-gray-500" },
              { label: "Applied", value: stats.applied, color: "bg-blue-500" },
              { label: "Interview", value: stats.interview + stats.assessment, color: "bg-purple-500" },
              { label: "Offer", value: stats.offer, color: "bg-emerald-500" },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${stats.total > 0 ? (item.value / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  )
}
