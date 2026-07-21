"use client"

import { Suspense, useCallback, useMemo, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import DashboardHeader from "@/components/dashboard/DashboardHeader"
import ViewSwitcher from "@/components/dashboard/ViewSwitcher"
import FilterBar from "@/components/dashboard/FilterBar"
import BoardView from "@/components/dashboard/BoardView"
import ListView from "@/components/dashboard/ListView"
import TableView from "@/components/dashboard/TableView"
import StatCards from "@/components/dashboard/StatCards"
import ApplicationDetailModal from "@/components/dashboard/ApplicationDetailModal"
import ApplicationFormModal from "@/components/dashboard/ApplicationFormModal"
import { useSearchParams } from "@/hooks/use-search-params"
import { useApplications } from "@/hooks/use-applications"
import type { ViewMode, SortOption, DashboardFilters } from "@/components/dashboard/types"

function DashboardContent() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const [urlParams, setUrlParams] = useSearchParams()

  const filters: DashboardFilters = useMemo(() => ({
    search: urlParams.search || "",
    status: urlParams.status || "",
    source: urlParams.source || "",
    sort: (urlParams.sort as SortOption) || "newest",
    tag: urlParams.tag || "",
  }), [urlParams.search, urlParams.status, urlParams.source, urlParams.sort, urlParams.tag])

  const view: ViewMode = (urlParams.view as ViewMode) || "board"

  const { applications, total, loading, error, refetch } = useApplications(filters)

  // Modal states
  const [detailModal, setDetailModal] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  })
  const [formModal, setFormModal] = useState(false)

  const updateFilter = useCallback(
    (key: string, value: string) => {
      setUrlParams({ ...urlParams, [key]: value })
    },
    [urlParams, setUrlParams]
  )

  const clearFilters = useCallback(() => {
    setUrlParams({ view: urlParams.view || "board" })
  }, [urlParams.view, setUrlParams])

  const setView = useCallback(
    (v: ViewMode) => setUrlParams({ ...urlParams, view: v }),
    [urlParams, setUrlParams]
  )

  const dateRange = useMemo(() => {
    if (!applications.length) return "No applications yet"
    let min = Infinity
    let max = -Infinity
    for (const app of applications) {
      const t = new Date(app.applicationDate).getTime()
      if (t < min) min = t
      if (t > max) max = t
    }
    return `${new Date(min).toLocaleDateString()} - ${new Date(max).toLocaleDateString()}`
  }, [applications])

  if (!isLoaded) {
    return <DashboardSkeleton />
  }

  if (!isSignedIn) {
    router.push("/login")
    return null
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={refetch}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardHeader dateRange={dateRange} onAddNew={() => setFormModal(true)} />

      <StatCards applications={applications} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewSwitcher current={view} onChange={setView} />
        <FilterBar
          search={filters.search}
          status={filters.status}
          source={filters.source}
          sort={filters.sort}
          onSearchChange={(v) => updateFilter("search", v)}
          onStatusChange={(v) => updateFilter("status", v)}
          onSourceChange={(v) => updateFilter("source", v)}
          onSortChange={(v) => updateFilter("sort", v)}
          onClearAll={clearFilters}
          total={total}
          filteredCount={applications.length}
        />
      </div>

      {loading ? (
        <ViewSkeleton view={view} />
      ) : (
        <>
          {view === "board" && (
            <BoardView
              applications={applications}
              onSelect={(id) => setDetailModal({ open: true, id })}
              onAddNew={() => setFormModal(true)}
            />
          )}
          {view === "list" && (
            <ListView
              applications={applications}
              onSelect={(id) => setDetailModal({ open: true, id })}
            />
          )}
          {view === "table" && (
            <TableView
              applications={applications}
              onSelect={(id) => setDetailModal({ open: true, id })}
            />
          )}
        </>
      )}

      {/* Modals */}
      <ApplicationDetailModal
        applicationId={detailModal.id}
        open={detailModal.open}
        onOpenChange={(open) => setDetailModal({ open, id: detailModal.id })}
        onUpdated={refetch}
        onDeleted={refetch}
      />
      <ApplicationFormModal
        open={formModal}
        onOpenChange={setFormModal}
        onUpdated={refetch}
      />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="grid grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-3 flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-8" />
              <Skeleton className="h-3 w-14" />
            </div>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-2.5 w-2.5 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            {Array.from({ length: 3 }).map((_, j) => (
              <Card key={j} className="p-3 space-y-2">
                <div className="flex gap-2.5">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </Card>
            ))}
          </Card>
        ))}
      </div>
    </div>
  )
}

function ViewSkeleton({ view }: { view: ViewMode }) {
  if (view === "board") {
    return (
      <div className="grid gap-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-2.5 w-2.5 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            {Array.from({ length: 2 }).map((_, j) => (
              <Card key={j} className="p-3 space-y-2">
                <div className="flex gap-2.5">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </Card>
            ))}
          </Card>
        ))}
      </div>
    )
  }

  if (view === "list") {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="flex items-center gap-4 p-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="p-3 border-b bg-muted/50">
        <div className="flex gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 border-b last:border-0">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
