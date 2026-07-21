"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import StatusBadge from "@/components/StatusBadge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  CircleCheck,
  Clock3,
  ExternalLink,
  LayoutGrid,
  List,
  MoreHorizontal,
  Plus,
  TableIcon,
  TrendingUp,
  XCircle,
} from "lucide-react"

const boardColumns = [
  {
    key: "saved",
    title: "Saved Jobs",
    statuses: ["Saved"],
    icon: Bookmark,
    accent: "from-sky-50 to-white dark:from-sky-500/10 dark:to-card",
    iconBg: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  {
    key: "applied",
    title: "Applied Jobs",
    statuses: ["Applied"],
    icon: BriefcaseBusiness,
    accent: "from-indigo-50 to-white dark:from-indigo-500/10 dark:to-card",
    iconBg: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
    dot: "bg-indigo-500",
  },
  {
    key: "interviews",
    title: "Interviews",
    statuses: ["Assessment", "Interview"],
    icon: Clock3,
    accent: "from-amber-50 to-white dark:from-amber-500/10 dark:to-card",
    iconBg: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  {
    key: "rejected",
    title: "Rejected Jobs",
    statuses: ["Rejected"],
    icon: XCircle,
    accent: "from-rose-50 to-white dark:from-rose-500/10 dark:to-card",
    iconBg: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  {
    key: "offer",
    title: "Offered Jobs",
    statuses: ["Offer"],
    icon: CircleCheck,
    accent: "from-emerald-50 to-white dark:from-emerald-500/10 dark:to-card",
    iconBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
] as const

type ViewMode = "board" | "list" | "table"

type Application = {
  id: string
  companyName: string
  jobTitle: string
  jobUrl: string | null
  source: string
  status: string
  applicationDate: string
  createdAt: string
}

interface Stats {
  total: number
  saved: number
  applied: number
  assessment: number
  interview: number
  rejected: number
  offer: number
  recent: Array<{
    id: string
    companyName: string
    jobTitle: string
    status: string
    createdAt: string
  }>
  trend: Array<{ month: string; count: number }>
}

const companyColors = [
  "bg-blue-500", "bg-purple-500", "bg-rose-500", "bg-amber-500",
  "bg-emerald-500", "bg-cyan-500", "bg-indigo-500", "bg-pink-500",
]

function getCompanyColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return companyColors[Math.abs(hash) % companyColors.length]
}

export default function DashboardPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>("board")

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      router.push("/login")
      return
    }

    Promise.all([
      fetch("/api/dashboard/stats"),
      fetch("/api/applications?page=1&pageSize=500&sort=newest"),
    ])
      .then(async ([statsRes, applicationsRes]) => {
        if (!statsRes.ok) throw new Error("Failed to load dashboard stats")
        if (!applicationsRes.ok) throw new Error("Failed to load applications")

        const [statsJson, applicationsJson] = await Promise.all([
          statsRes.json(),
          applicationsRes.json(),
        ])

        setStats(statsJson)
        setApplications(applicationsJson.data || [])
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [isLoaded, isSignedIn, router])

  const board = useMemo(() => {
    return boardColumns.map((column) => ({
      ...column,
      items: applications.filter((application) =>
        (column.statuses as readonly string[]).includes(application.status)
      ),
    }))
  }, [applications])

  const dateRange = useMemo(() => {
    if (!applications.length) {
      return "No applications yet"
    }

    const ordered = [...applications].sort(
      (left, right) => new Date(right.applicationDate).getTime() - new Date(left.applicationDate).getTime()
    )
    const latest = new Date(ordered[0].applicationDate)
    const oldest = new Date(ordered[ordered.length - 1].applicationDate)

    return `${oldest.toLocaleDateString()} - ${latest.toLocaleDateString()}`
  }, [applications])

  if (!isLoaded || loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid gap-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-[520px] rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  if (!stats) return null

  function renderBoardCard(application: Application) {
    const initials =
      application.companyName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "J"

    const colorClass = getCompanyColor(application.companyName)

    return (
      <Link
        key={application.id}
        href={`/applications/${application.id}`}
        className="group block"
      >
        <Card className="p-3 transition-all hover:shadow-md hover:ring-1 hover:ring-primary/20">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2.5">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${colorClass}`}>
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{application.companyName}</p>
                <p className="truncate text-sm font-semibold leading-tight">{application.jobTitle}</p>
              </div>
            </div>
            <MoreHorizontal className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              REMOTE
            </span>
            <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
              FULL TIME
            </span>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>{new Date(application.applicationDate).toLocaleDateString()}</span>
            {application.jobUrl && (
              <a
                href={application.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </Card>
      </Link>
    )
  }

  function renderListItem(application: Application) {
    const initials =
      application.companyName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "J"

    const colorClass = getCompanyColor(application.companyName)

    return (
      <Link
        key={application.id}
        href={`/applications/${application.id}`}
        className="group flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50"
      >
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${colorClass}`}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{application.jobTitle}</p>
          <p className="truncate text-xs text-muted-foreground">{application.companyName}</p>
        </div>
        <StatusBadge status={application.status} />
        <Badge variant="secondary">{application.source}</Badge>
        <span className="shrink-0 text-xs text-muted-foreground">
          {new Date(application.applicationDate).toLocaleDateString()}
        </span>
        {application.jobUrl && (
          <a
            href={application.jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </Link>
    )
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              Job pipeline overview
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Keep track of your applied jobs all in one place.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>{dateRange}</span>
            </div>
            <Button asChild>
              <Link href="/applications/new">Add Job</Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1">
            <button
              onClick={() => setView("board")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "board"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Board
            </button>
            <button
              onClick={() => setView("list")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-4 w-4" />
              List
            </button>
            <button
              onClick={() => setView("table")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "table"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TableIcon className="h-4 w-4" />
              Table
            </button>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <button className="inline-flex items-center gap-1.5 hover:text-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Filter
            </button>
            <button className="inline-flex items-center gap-1.5 hover:text-foreground">
              Group by
            </button>
            <button className="inline-flex items-center gap-1.5 hover:text-foreground">
              Sort by
            </button>
          </div>
        </div>

        {view === "board" && (
          <div className="grid gap-4 xl:grid-cols-5">
            {board.map((column) => {
              const Icon = column.icon

              return (
                <Card key={column.key} className="flex flex-col">
                  <div className="flex items-center justify-between border-b p-4">
                    <div className="flex items-center gap-2.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} />
                      <h2 className="text-sm font-semibold">{column.title}</h2>
                      <Badge variant="secondary" className="text-xs">
                        {column.items.length}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1 text-muted-foreground">
                      <button className="rounded-md p-1 hover:bg-muted">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      <button className="rounded-md p-1 hover:bg-muted">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 p-3">
                    {column.items.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No jobs here yet.
                      </div>
                    ) : (
                      column.items.map((application) => renderBoardCard(application))
                    )}
                  </div>
                </Card>
              )
            })}

            <Card className="flex items-start justify-center p-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/applications/new" aria-label="Add job">
                  <Plus className="h-4 w-4" />
                </Link>
              </Button>
            </Card>
          </div>
        )}

        {view === "list" && (
          <div className="space-y-2">
            {applications.length === 0 ? (
              <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
                <p className="mb-2">No applications yet.</p>
                <Button asChild variant="outline">
                  <Link href="/applications/new">Add your first application</Link>
                </Button>
              </div>
            ) : (
              applications.map((application) => renderListItem(application))
            )}
          </div>
        )}

        {view === "table" && (
          <div className="rounded-lg border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Company</th>
                    <th className="px-4 py-3 text-left font-medium">Job Title</th>
                    <th className="px-4 py-3 text-left font-medium">Source</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((application) => {
                    const initials =
                      application.companyName
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase())
                        .join("") || "J"
                    const colorClass = getCompanyColor(application.companyName)

                    return (
                      <tr
                        key={application.id}
                        className="cursor-pointer border-b transition-colors hover:bg-muted/50"
                        onClick={() => router.push(`/applications/${application.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white ${colorClass}`}>
                              {initials}
                            </div>
                            <span className="font-medium">{application.companyName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{application.jobTitle}</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{application.source}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(application.applicationDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={application.status} />
                        </td>
                        <td className="px-4 py-3">
                          {application.jobUrl && (
                            <a
                              href={application.jobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
