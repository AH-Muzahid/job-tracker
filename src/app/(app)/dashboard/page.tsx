"use client"

import { useEffect, useMemo, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import DashboardHeader from "@/components/dashboard/DashboardHeader"
import ViewSwitcher from "@/components/dashboard/ViewSwitcher"
import FilterBar from "@/components/dashboard/FilterBar"
import BoardView from "@/components/dashboard/BoardView"
import ListView from "@/components/dashboard/ListView"
import TableView from "@/components/dashboard/TableView"
import type { Application, Stats, ViewMode } from "@/components/dashboard/types"

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

  const dateRange = useMemo(() => {
    if (!applications.length) return "No applications yet"
    const ordered = [...applications].sort(
      (a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime()
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

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <DashboardHeader dateRange={dateRange} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <ViewSwitcher current={view} onChange={setView} />
          <FilterBar />
        </div>

        {view === "board" && <BoardView applications={applications} />}
        {view === "list" && <ListView applications={applications} />}
        {view === "table" && <TableView applications={applications} />}
      </section>
    </div>
  )
}
