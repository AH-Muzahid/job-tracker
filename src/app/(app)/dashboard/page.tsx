"use client"

import { Suspense, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Plus, TrendingUp, Briefcase, Clock,
  CheckCircle2, XCircle, Bookmark, Sparkles, Target,
  ChevronRight, Bot, Send, FileText,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import ApplicationFormModal from "@/components/dashboard/ApplicationFormModal"
import WeeklyGoalsWidget from "@/components/weekly-goals/WeeklyGoalsWidget"
import { useStats, useWeeklyGoals } from "@/lib/api"
import { useUI } from "@/lib/store"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts"

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  Saved: { color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-100 dark:bg-sky-500/20", icon: <Bookmark className="h-3.5 w-3.5" /> },
  Applied: { color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-100 dark:bg-indigo-500/20", icon: <Briefcase className="h-3.5 w-3.5" /> },
  Assessment: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-500/20", icon: <Clock className="h-3.5 w-3.5" /> },
  Interview: { color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-100 dark:bg-violet-500/20", icon: <Target className="h-3.5 w-3.5" /> },
  Rejected: { color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-500/20", icon: <XCircle className="h-3.5 w-3.5" /> },
  Offer: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-500/20", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
}

const PIE_COLORS = ["#6366f1", "#3b82f6", "#f59e0b", "#a855f7", "#ef4444", "#22c55e"]

function DashboardContent() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const formModal = useUI((s) => s.formModal)
  const setFormModal = useUI((s) => s.setFormModal)
  const { data: stats, isLoading } = useStats()
  const { data: weeklyGoals, isLoading: goalsLoading } = useWeeklyGoals()

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/login")
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded || isLoading) return <DashboardSkeleton />
  if (!stats) return null

  const interviewRate = stats.total > 0 ? Math.round(((stats.interview + stats.assessment) / stats.total) * 100) : 0
  const successRate = stats.total > 0 ? Math.round((stats.offer / stats.total) * 100) : 0
  const activePipeline = stats.applied + stats.assessment + stats.interview

  const statusData = [
    { name: "Saved", value: stats.saved },
    { name: "Applied", value: stats.applied },
    { name: "Assessment", value: stats.assessment },
    { name: "Interview", value: stats.interview },
    { name: "Rejected", value: stats.rejected },
    { name: "Offer", value: stats.offer },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-primary/10 to-background p-6 sm:p-8">
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary">Job Search Tracker</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome back!</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              You have <span className="font-semibold text-foreground">{activePipeline}</span> active applications in your pipeline
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/applications"><Briefcase className="h-4 w-4" /> View All</Link>
            </Button>
            <Button size="sm" onClick={() => setFormModal(true)}>
              <Plus className="h-4 w-4" /> Add Job
            </Button>
          </div>
        </div>
      </div>

      {/* Big Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Applications" value={stats.total} icon={<Briefcase className="h-5 w-5" />} gradient="from-indigo-500 to-indigo-600" trend={`+${stats.trend[stats.trend.length - 1]?.count || 0} this month`} />
        <StatCard title="Interview Rate" value={`${interviewRate}%`} icon={<Target className="h-5 w-5" />} gradient="from-amber-500 to-orange-600" ring={interviewRate} />
        <StatCard title="Active Pipeline" value={activePipeline} icon={<TrendingUp className="h-5 w-5" />} gradient="from-violet-500 to-purple-600" trend={`${stats.applied} applied, ${stats.interview + stats.assessment} interviewing`} />
        <StatCard title="Success Rate" value={`${successRate}%`} icon={<CheckCircle2 className="h-5 w-5" />} gradient="from-emerald-500 to-green-600" ring={successRate} />
      </div>

      {/* Status Pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Saved", count: stats.saved, status: "Saved" },
          { label: "Applied", count: stats.applied, status: "Applied" },
          { label: "Assessment", count: stats.assessment, status: "Assessment" },
          { label: "Interview", count: stats.interview, status: "Interview" },
          { label: "Rejected", count: stats.rejected, status: "Rejected" },
          { label: "Offer", count: stats.offer, status: "Offer" },
        ].map((item) => {
          const cfg = STATUS_CONFIG[item.status]
          return (
            <div key={item.status} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
              {cfg.icon}
              {item.label}
              <span className="font-bold">{item.count}</span>
            </div>
          )
        })}
      </div>

      {/* AI Section */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <WeeklyGoalsWidget goals={weeklyGoals?.[0] || null} loading={goalsLoading} />
        </div>
        <div className="md:col-span-2">
          <Card className="overflow-hidden h-full">
            <CardContent className="p-5 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Quick Analyze</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Paste a job description or ask the AI assistant anything.</p>
              <div className="flex gap-2 mt-auto">
                <Input
                  placeholder="Paste a JD or ask a question..."
                  className="flex-1 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                      window.location.href = `/ai-assistant?q=${encodeURIComponent((e.target as HTMLInputElement).value)}`
                    }
                  }}
                />
                <Button size="icon" asChild>
                  <Link href="/ai-assistant">
                    <Send className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <Button variant="outline" size="sm" className="text-xs h-7 gap-1" asChild>
                  <Link href="/ai-assistant"><FileText className="h-3 w-3" /> Scan a JD</Link>
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-7 gap-1" asChild>
                  <Link href="/weekly-goals"><Target className="h-3 w-3" /> Set Goals</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium">Monthly Trend</p>
                <p className="text-xs text-muted-foreground">Applications over time</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.trend}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium">Status Distribution</p>
                <p className="text-xs text-muted-foreground">Breakdown by status</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} strokeWidth={0}>
                    {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {statusData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs text-muted-foreground flex-1 truncate">{item.name}</span>
                    <span className="text-xs font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Source + Recent */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="md:col-span-2 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium">By Source</p>
                <p className="text-xs text-muted-foreground">Where you apply</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.bySource} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="source" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium">Recent Applications</p>
                <p className="text-xs text-muted-foreground">Latest activity</p>
              </div>
              <Link href="/applications" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-1">
              {stats.recent.map((app: { id: string; companyName: string; jobTitle: string; status: string }) => {
                const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.Saved
                return (
                  <div key={app.id} className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-muted/50 transition-colors">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted font-semibold text-xs text-muted-foreground">
                      {app.companyName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{app.jobTitle}</p>
                      <p className="text-xs text-muted-foreground">{app.companyName}</p>
                    </div>
                    <Badge variant="secondary" className={`${cfg.bg} ${cfg.color} border-0 text-[10px] font-medium shrink-0`}>
                      {app.status}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <ApplicationFormModal open={formModal.open} onOpenChange={(open) => setFormModal(open)} applicationId={formModal.editId} onUpdated={() => setFormModal(false)} />
    </div>
  )
}

function StatCard({ title, value, icon, gradient, ring, trend }: {
  title: string; value: string | number; icon: React.ReactNode; gradient: string
  ring?: number; trend?: string
}) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {trend && <p className="text-[10px] text-muted-foreground">{trend}</p>}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform`}>
            {icon}
          </div>
        </div>
        {ring !== undefined && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full bg-gradient-to-r ${gradient}`} style={{ width: `${ring}%` }} />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">{ring}%</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      <div className="flex gap-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}</div>
      <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}</div>
      <div className="grid gap-4 md:grid-cols-5"><Skeleton className="h-72 rounded-xl md:col-span-2" /><Skeleton className="h-72 rounded-xl md:col-span-3" /></div>
    </div>
  )
}

export default function DashboardPage() {
  return <Suspense fallback={<DashboardSkeleton />}><DashboardContent /></Suspense>
}
