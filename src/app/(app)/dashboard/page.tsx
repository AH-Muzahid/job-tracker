"use client"

import { Suspense, useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { BarChart3, PieChart as PieIcon, TrendingUp, Target, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import StatCards from "@/components/dashboard/StatCards"
import ApplicationFormModal from "@/components/dashboard/ApplicationFormModal"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts"

interface Stats {
  total: number
  saved: number
  applied: number
  assessment: number
  interview: number
  rejected: number
  offer: number
  recent: Array<{ id: string; companyName: string; jobTitle: string; status: string; createdAt: string }>
  trend: Array<{ month: string; count: number }>
  bySource: Array<{ source: string; count: number }>
}

interface Application {
  id: string
  companyName: string
  jobTitle: string
  jobUrl: string | null
  source: string
  status: string
  applicationDate: string
  createdAt: string
  tags: Array<{ tag: { id: string; name: string } }>
}

const COLORS = ["#6366f1", "#3b82f6", "#f59e0b", "#a855f7", "#ef4444", "#22c55e", "#06b6d4"]

function DashboardContent() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push("/login"); return }

    Promise.all([
      fetch("/api/dashboard/stats").then((r) => r.json()),
      fetch("/api/applications?pageSize=500&sort=newest").then((r) => r.json()),
    ])
      .then(([s, a]) => { setStats(s); setApplications(a.data || []) })
      .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between"><Skeleton className="h-8 w-40" /><Skeleton className="h-10 w-28" /></div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">{Array.from({ length: 6 }).map((_, i) => <Card key={i} className="p-3 flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-lg" /><div className="space-y-1"><Skeleton className="h-5 w-8" /><Skeleton className="h-3 w-14" /></div></Card>)}</div>
        <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>)}</div>
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

  const successRate = stats.total > 0 ? Math.round((stats.offer / stats.total) * 100) : 0
  const interviewRate = stats.total > 0 ? Math.round(((stats.interview + stats.assessment) / stats.total) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your job search overview</p>
        </div>
        <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> Add Job</Button>
      </div>

      <StatCards applications={applications} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStatCard icon={<Target className="h-4 w-4" />} label="Interview Rate" value={`${interviewRate}%`} />
        <MiniStatCard icon={<PieIcon className="h-4 w-4" />} label="Success Rate" value={`${successRate}%`} />
        <MiniStatCard icon={<BarChart3 className="h-4 w-4" />} label="Active Pipeline" value={stats.applied + stats.assessment + stats.interview} />
        <MiniStatCard icon={<TrendingUp className="h-4 w-4" />} label="This Month" value={stats.trend[stats.trend.length - 1]?.count || 0} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Monthly Trend</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={220}>
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
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Status Distribution</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Applications by Source</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={220}>
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
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pipeline Funnel</CardTitle></CardHeader>
          <CardContent className="pt-2 space-y-3">
            {[
              { label: "Saved", value: stats.saved, color: "bg-gray-500" },
              { label: "Applied", value: stats.applied, color: "bg-blue-500" },
              { label: "Interview", value: stats.interview + stats.assessment, color: "bg-purple-500" },
              { label: "Offer", value: stats.offer, color: "bg-emerald-500" },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">{item.label}</span><span className="font-medium">{item.value}</span></div>
                <div className="h-2 rounded-full bg-muted"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${stats.total > 0 ? (item.value / stats.total) * 100 : 0}%` }} /></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <ApplicationFormModal open={formOpen} onOpenChange={setFormOpen} onUpdated={() => {
        setFormOpen(false)
        fetch("/api/dashboard/stats").then((r) => r.json()).then(setStats)
        fetch("/api/applications?pageSize=500&sort=newest").then((r) => r.json()).then((d) => setApplications(d.data || []))
      }} />
    </div>
  )
}

function MiniStatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
        <div><p className="text-lg font-bold leading-none">{value}</p><p className="text-[10px] text-muted-foreground">{label}</p></div>
      </div>
    </Card>
  )
}

export default function DashboardPage() {
  return <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-40" /><Skeleton className="h-64 w-full" /></div>}><DashboardContent /></Suspense>
}
