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
import { PageContainer, PageHeader } from "@/components/primitives"
import { PipelineFunnelStrip } from "@/components/dashboard/PipelineFunnelStrip"
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
import { isFollowUpDue } from "@/lib/applications/follow-up-utils"
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
  const [followUpOnly, setFollowUpOnly] = useState(false)

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

  const followUpCount = useMemo(() => {
    return applications.filter((app) => isFollowUpDue(app)).length
  }, [applications])

  const displayedApplications = useMemo(() => {
    if (!followUpOnly) return applications
    return applications.filter((app) => isFollowUpDue(app))
  }, [applications, followUpOnly])

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
    setFollowUpOnly(false)
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
        title={
          <span className="flex items-center gap-2.5">
            <span>Applications Pipeline</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border border-border bg-muted/50 text-[11px] font-mono font-medium text-muted-foreground select-none">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {total} {total === 1 ? "Role" : "Roles"} Active
            </span>
          </span>
        }
        description="Air traffic control for active job applications, interview stages, and follow-ups"
        primaryAction={
          <Button
            size="sm"
            onClick={() => setFormModal(true)}
            className="rounded-[4px] font-medium text-xs cursor-pointer shrink-0 h-8 sm:h-9 px-3 sm:px-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-none active:scale-[0.98] transition-all"
          >
            <Plus className="size-3.5 mr-1" />
            <span className="hidden sm:inline">Add Application</span>
            <span className="sm:hidden">Add</span>
          </Button>
        }
      />

      {/* 2. Sleek Architectural Pipeline Funnel & Stage Deck */}
      <PipelineFunnelStrip
        applications={applications}
        total={total}
        selectedStage={filters.status}
        onSelectStage={(stage) => updateFilter("status", stage)}
        followUpOnly={followUpOnly}
        onToggleFollowUpOnly={() => setFollowUpOnly((v) => !v)}
      />

      {/* 3. Controls & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
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
          filteredCount={displayedApplications.length}
          followUpOnly={followUpOnly}
          onToggleFollowUpOnly={() => setFollowUpOnly((v) => !v)}
          followUpCount={followUpCount}
        />
      </div>

      {/* 4. Active Pipeline View */}
      {isLoading ? (
        <ViewSkeleton view={view} />
      ) : (
        <div>
          {view === "board" && (
            <BoardView
              applications={displayedApplications}
              onSelect={(id) => router.push(`/applications/${id}`)}
              onEdit={(id) => setFormModal(true, id)}
              onDelete={(id) => setDeleteModal(true, id)}
              onMoveTo={handleMoveTo}
              onDragEnd={handleDragEnd}
              onOpenFollowUp={(id) => setFollowUpAppId(id)}
              onQuickAdd={() => setFormModal(true)}
            />
          )}
          {view === "list" && (
            <ListView
              applications={displayedApplications}
              onSelect={(id) => router.push(`/applications/${id}`)}
            />
          )}
          {view === "table" && (
            <TableView
              applications={displayedApplications}
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
        <DialogContent className="rounded-[8px] border border-border bg-popover">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Delete Application</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure? This application and its associated timeline events will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setDeleteModal(false)} disabled={deleteMutation.isPending} className="rounded-[4px] font-medium text-xs">Cancel</Button>
            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending} className="rounded-[4px] font-medium text-xs">
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
    <PageContainer>
      <div className="flex items-center justify-between pt-1 pb-1">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-20 rounded-[4px]" />
          <Skeleton className="h-8 w-64 rounded-[4px]" />
          <Skeleton className="h-4 w-96 max-w-full rounded-[4px]" />
        </div>
        <Skeleton className="h-9 w-32 rounded-[4px]" />
      </div>
      <div className="h-14 rounded-[6px] border border-border bg-card animate-pulse" />
      <div className="flex items-center justify-between gap-3 pt-1">
        <Skeleton className="h-8 w-44 rounded-[4px]" />
        <Skeleton className="h-8 w-72 rounded-[4px]" />
      </div>
      <ViewSkeleton view="board" />
    </PageContainer>
  )
}

function ViewSkeleton({ view }: { view: ViewMode }) {
  if (view === "board") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 w-full items-start">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col h-full bg-card/40 rounded-[6px] border border-border p-1.5 min-w-0 min-h-[400px] space-y-2">
            <div className="flex justify-between items-center px-1.5 py-1 mb-1 border-b border-border/40 pb-1.5">
              <Skeleton className="h-3 w-16 rounded-[3px]" />
              <Skeleton className="h-3 w-4 rounded-[3px]" />
            </div>
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="p-2 sm:p-2.5 rounded-[5px] border border-border bg-card space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="size-5 rounded-[3px]" />
                  <Skeleton className="h-3 w-20 rounded-[3px]" />
                  <Skeleton className="h-2.5 w-10 ml-auto rounded-[3px]" />
                </div>
                <Skeleton className="h-3.5 w-full rounded-[3px]" />
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }
  if (view === "list") {
    return (
      <div className="relative border border-border bg-border rounded-[6px] overflow-hidden">
        <div className="divide-y divide-border bg-background">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="h-9 w-9 rounded-[4px] shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-40 rounded-[4px]" />
                <Skeleton className="h-3 w-28 rounded-[4px]" />
              </div>
              <Skeleton className="h-5 w-20 rounded-[4px]" />
              <Skeleton className="h-3 w-20 rounded-[4px]" />
            </div>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="relative border border-border bg-background rounded-[6px] overflow-hidden">
      <div className="p-3 border-b border-border bg-muted/20">
        <div className="flex gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 w-20 rounded-[4px]" />
          ))}
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 border-b border-border last:border-0">
          <Skeleton className="h-7 w-7 rounded-[4px]" />
          <Skeleton className="h-3.5 w-32 rounded-[4px]" />
          <Skeleton className="h-3.5 w-28 rounded-[4px]" />
          <Skeleton className="h-4 w-16 rounded-[4px]" />
        </div>
      ))}
    </div>
  )
}

export default function ApplicationsPage() {
  return <Suspense fallback={<ApplicationsSkeleton />}><ApplicationsContent /></Suspense>
}
