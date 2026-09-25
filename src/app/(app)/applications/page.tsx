"use client"

import { Suspense, useCallback, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PageContainer, PageHeader, KPIStrip } from "@/components/primitives"
import ViewSwitcher from "@/components/dashboard/ViewSwitcher"
import FilterBar from "@/components/dashboard/FilterBar"
import ListView from "@/components/dashboard/ListView"
import TableView from "@/components/dashboard/TableView"
import ApplicationDetailModal from "@/components/dashboard/ApplicationDetailModal"
import ApplicationFormModal from "@/components/dashboard/ApplicationFormModal"
import { FollowUpSendDrawer } from "@/components/applications/FollowUpSendDrawer"
import { useSearchParams } from "@/hooks/use-search-params"
import { useApplications, useMoveApplication, useDeleteApplication } from "@/lib/api"
import { useUI } from "@/lib/store"
import type { ViewMode, SortOption, DashboardFilters, Application } from "@/components/dashboard/types"
import type { DropResult } from "@hello-pangea/dnd"

const BoardView = dynamic(
	() => import("@/components/dashboard/BoardView"),
	{ ssr: false, loading: () => <div className="h-[400px] animate-pulse bg-muted/20" /> }
)

function ApplicationsContent() {
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
  const { data, isLoading, error, refetch } = useApplications(filters)
  const [followUpAppId, setFollowUpAppId] = useState<string | null>(null)
  const applications = useMemo(() => (data?.data ?? []) as Application[], [data])
  const total = data?.total ?? 0

  // Derived KPI metrics for the Efferd Top Stat Strip
  const stats = useMemo(() => {
    const active = applications.filter((a) => ["Applied", "Assessment"].includes(a.status)).length
    const advanced = applications.filter((a) => ["Interviewing", "Offer", "Accepted"].includes(a.status)).length
    const offers = applications.filter((a) => ["Offer", "Accepted"].includes(a.status)).length
    const responseRate = total > 0 ? Math.round(((advanced) / total) * 100) : 0
    return { active, advanced, offers, responseRate }
  }, [applications, total])

  const moveMutation = useMoveApplication()
  const deleteMutation = useDeleteApplication()

  const detailModal = useUI((s) => s.detailModal)
  const formModal = useUI((s) => s.formModal)
  const deleteModal = useUI((s) => s.deleteModal)
  const setDetailModal = useUI((s) => s.setDetailModal)
  const setFormModal = useUI((s) => s.setFormModal)
  const setDeleteModal = useUI((s) => s.setDeleteModal)

  const updateFilter = useCallback((key: string, value: string) => {
    setUrlParams({ ...urlParams, [key]: value })
  }, [urlParams, setUrlParams])

  const clearFilters = useCallback(() => {
    setUrlParams(urlParams.view ? { view: urlParams.view } : {})
  }, [urlParams.view, setUrlParams])

  const setView = useCallback((v: ViewMode) => {
    setUrlParams({ ...urlParams, view: v })
  }, [urlParams, setUrlParams])

  const handleMoveTo = useCallback((id: string, status: string) => {
    toast.success(`Moved to ${status}`)
    moveMutation.mutate({ id, status }, {
      onError: () => {
        toast.error("Failed to move")
      },
    })
  }, [moveMutation])

  const handleDelete = useCallback(() => {
    if (!deleteModal.id) return
    deleteMutation.mutate(deleteModal.id, {
      onSuccess: () => { toast.success("Application deleted"); setDeleteModal(false) },
      onError: () => toast.error("Failed to delete"),
    })
  }, [deleteModal.id, deleteMutation, setDeleteModal])

  const handleDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const columnMap: Record<string, string> = {
      staged: "Staged",
      saved: "Saved",
      applied: "Applied",
      interviews: "Assessment",
      rejected: "Rejected",
      offer: "Offer",
    }

    const newStatus = columnMap[destination.droppableId]
    if (!newStatus) return

    const app = applications.find((a) => a.id === draggableId)
    if (!app || app.status === newStatus) return

    handleMoveTo(draggableId, newStatus)
  }, [applications, handleMoveTo])

  if (!isLoaded) return <ApplicationsSkeleton />
  if (!isSignedIn) { router.push("/"); return null }

  if (error) {
    return (
      <div className="text-center py-20 border border-border bg-background p-8">
        <p className="text-destructive mb-4 text-xs font-mono">Failed to load applications pipeline</p>
        <Button size="sm" variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <PageContainer>
      {/* 1. Header Section */}
      <PageHeader
        overline="Workbench"
        title="Applications Pipeline"
        description="Manage, track, and advance your job search applications"
        primaryAction={
          <Button
            size="sm"
            onClick={() => setFormModal(true)}
            className="rounded-sm font-medium text-xs cursor-pointer shrink-0 h-8 sm:h-9 px-3 sm:px-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-none"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Add Application</span>
            <span className="sm:hidden">Add</span>
          </Button>
        }
      />

      {/* 2. Unified KPI Strip */}
      <KPIStrip
        columns={4}
        items={[
          {
            id: "total",
            label: "Total Pipeline",
            value: total,
            delta: total > 0 ? 12 : 0,
            subtext: "all stages",
          },
          {
            id: "active",
            label: "In Progress",
            value: stats.active,
            delta: 8.5,
            subtext: "progress",
          },
          {
            id: "advanced",
            label: "Interviews & Offers",
            value: stats.advanced,
            delta: stats.offers > 0 ? 15 : 4,
            subtext: `${stats.offers} offers`,
          },
          {
            id: "responseRate",
            label: "Response Rate",
            value: `${stats.responseRate}%`,
            delta: stats.responseRate >= 20 ? 5.2 : 0,
            subtext: "rate",
          },
        ]}
      />

      {/* 3. Controls & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
        <ViewSwitcher current={view} onChange={setView} />
        <FilterBar
          search={filters.search} status={filters.status} source={filters.source} sort={filters.sort}
          onSearchChange={(v) => updateFilter("search", v)} onStatusChange={(v) => updateFilter("status", v)}
          onSourceChange={(v) => updateFilter("source", v)} onSortChange={(v) => updateFilter("sort", v)}
          onClearAll={clearFilters} total={total} filteredCount={applications.length}
        />
      </div>

      {/* 4. Active Pipeline View */}
      {isLoading ? (
        <ViewSkeleton view={view} />
      ) : (
        <div>
          {view === "board" && (
            <BoardView
              applications={applications}
              onSelect={(id) => router.push(`/applications/${id}`)}
              onEdit={(id) => setFormModal(true, id)}
              onDelete={(id) => setDeleteModal(true, id)}
              onMoveTo={handleMoveTo}
              onDragEnd={handleDragEnd}
              onOpenFollowUp={(id) => setFollowUpAppId(id)}
            />
          )}
          {view === "list" && (
            <ListView
              applications={applications}
              onSelect={(id) => router.push(`/applications/${id}`)}
            />
          )}
          {view === "table" && (
            <TableView
              applications={applications}
              onSelect={(id) => router.push(`/applications/${id}`)}
            />
          )}
        </div>
      )}

      {/* 5. Modals & Dialogs */}
      <ApplicationDetailModal
        applicationId={detailModal.id}
        open={detailModal.open}
        onOpenChange={(open) => setDetailModal(open, detailModal.id)}
        onUpdated={() => {}}
        onDeleted={() => setDetailModal(false)}
      />
      <ApplicationFormModal
        open={formModal.open}
        onOpenChange={(open) => setFormModal(open)}
        applicationId={formModal.editId}
        onUpdated={() => setFormModal(false)}
      />
      <FollowUpSendDrawer
        applicationId={followUpAppId}
        open={!!followUpAppId}
        onOpenChange={(open) => !open && setFollowUpAppId(null)}
        onFollowUpSent={() => {
          refetch()
        }}
      />

      <Dialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal(open, deleteModal.id)}>
        <DialogContent className="rounded-md border border-border bg-popover">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Delete Application</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure? This application and its associated timeline events will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setDeleteModal(false)} disabled={deleteMutation.isPending}>Cancel</Button>
            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

function ApplicationsSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between"><Skeleton className="h-7 w-48 rounded-md" /><Skeleton className="h-8 w-28 rounded-md" /></div>
      <div className="relative border border-border bg-border">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-6 bg-background space-y-3">
              <Skeleton className="h-4 w-24 rounded-sm" />
              <Skeleton className="h-8 w-16 rounded-sm" />
              <Skeleton className="h-3 w-32 rounded-sm mt-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ViewSkeleton({ view }: { view: ViewMode }) {
  if (view === "board") {
    return (
      <div className="relative border border-border bg-border">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-px bg-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-background min-h-[500px] p-4 space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-border">
                <Skeleton className="h-4 w-20 rounded-sm" />
                <Skeleton className="h-4 w-6 rounded-sm" />
              </div>
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="p-3 border border-border rounded-md bg-card space-y-2">
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3.5 w-28" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (view === "list") {
    return (
      <div className="relative border border-border bg-border">
        <div className="divide-y divide-border bg-background">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="h-9 w-9 rounded-md shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="relative border border-border bg-background">
      <div className="p-3 border-b border-border bg-muted/20">
        <div className="flex gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 w-20" />
          ))}
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 border-b border-border last:border-0">
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export default function ApplicationsPage() {
  return <Suspense fallback={<ApplicationsSkeleton />}><ApplicationsContent /></Suspense>
}
