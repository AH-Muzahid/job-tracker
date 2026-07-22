"use client"

import { Suspense, useCallback, useMemo } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import ViewSwitcher from "@/components/dashboard/ViewSwitcher"
import FilterBar from "@/components/dashboard/FilterBar"
import BoardView from "@/components/dashboard/BoardView"
import ListView from "@/components/dashboard/ListView"
import TableView from "@/components/dashboard/TableView"
import ApplicationDetailModal from "@/components/dashboard/ApplicationDetailModal"
import ApplicationFormModal from "@/components/dashboard/ApplicationFormModal"
import { useSearchParams } from "@/hooks/use-search-params"
import { useApplications, useMoveApplication, useDeleteApplication } from "@/lib/api"
import { useUI } from "@/lib/store"
import type { ViewMode, SortOption, DashboardFilters, Application } from "@/components/dashboard/types"
import type { DropResult } from "@hello-pangea/dnd"

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
  const { data, isLoading, error } = useApplications(filters)
  const applications = useMemo(() => (data?.data ?? []) as Application[], [data])
  const total = data?.total ?? 0

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
    setUrlParams({ view: urlParams.view || "board" })
  }, [urlParams.view, setUrlParams])

  const setView = useCallback((v: ViewMode) => {
    setUrlParams({ ...urlParams, view: v })
  }, [urlParams, setUrlParams])

  const handleMoveTo = useCallback((id: string, status: string) => {
    moveMutation.mutate(
      { id, status },
      { onSuccess: () => toast.success(`Moved to ${status}`), onError: () => toast.error("Failed to move") }
    )
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
      saved: "Saved", applied: "Applied", interviews: "Assessment",
      rejected: "Rejected", offer: "Offer",
    }

    const newStatus = columnMap[destination.droppableId]
    if (!newStatus) return

    const app = applications.find((a) => a.id === draggableId)
    if (!app || app.status === newStatus) return

    handleMoveTo(draggableId, newStatus)
  }, [applications, handleMoveTo])

  if (!isLoaded) return <ApplicationsSkeleton />
  if (!isSignedIn) { router.push("/login"); return null }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-destructive mb-4">Failed to load applications</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-sm text-muted-foreground">{total} total applications</p>
        </div>
        <Button onClick={() => setFormModal(true)}>Add Application</Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewSwitcher current={view} onChange={setView} />
        <FilterBar
          search={filters.search} status={filters.status} source={filters.source} sort={filters.sort}
          onSearchChange={(v) => updateFilter("search", v)} onStatusChange={(v) => updateFilter("status", v)}
          onSourceChange={(v) => updateFilter("source", v)} onSortChange={(v) => updateFilter("sort", v)}
          onClearAll={clearFilters} total={total} filteredCount={applications.length}
        />
      </div>

      {isLoading ? (
        <ViewSkeleton view={view} />
      ) : (
        <>
          {view === "board" && (
            <BoardView applications={applications} onSelect={(id) => setDetailModal(true, id)}
              onAddNew={() => setFormModal(true)} onEdit={(id) => setFormModal(true, id)}
              onDelete={(id) => setDeleteModal(true, id)} onMoveTo={handleMoveTo} onDragEnd={handleDragEnd} />
          )}
          {view === "list" && <ListView applications={applications} onSelect={(id) => setDetailModal(true, id)} />}
          {view === "table" && <TableView applications={applications} onSelect={(id) => setDetailModal(true, id)} />}
        </>
      )}

      <ApplicationDetailModal applicationId={detailModal.id} open={detailModal.open}
        onOpenChange={(open) => setDetailModal(open, detailModal.id)} onUpdated={() => {}} onDeleted={() => setDetailModal(false)} />
      <ApplicationFormModal open={formModal.open} onOpenChange={(open) => setFormModal(open)}
        applicationId={formModal.editId} onUpdated={() => setFormModal(false)} />

      <Dialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal(open, deleteModal.id)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Application</DialogTitle>
            <DialogDescription>Are you sure? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModal(false)} disabled={deleteMutation.isPending}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ApplicationsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><Skeleton className="h-8 w-40" /><Skeleton className="h-10 w-28" /></div>
      <div className="flex gap-3"><Skeleton className="h-8 w-32" /><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-24" /></div>
      <div className="grid gap-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4 space-y-3">
            <Skeleton className="h-4 w-24" />
            {Array.from({ length: 2 }).map((_, j) => <Card key={j} className="p-3 space-y-2"><div className="flex gap-2.5"><Skeleton className="h-9 w-9 rounded-lg" /><div className="space-y-1.5"><Skeleton className="h-3 w-20" /><Skeleton className="h-4 w-32" /></div></div></Card>)}
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
            <Skeleton className="h-4 w-24" />
            {Array.from({ length: 2 }).map((_, j) => <Card key={j} className="p-3 space-y-2"><div className="flex gap-2.5"><Skeleton className="h-9 w-9 rounded-lg" /><div className="space-y-1.5"><Skeleton className="h-3 w-20" /><Skeleton className="h-4 w-32" /></div></div></Card>)}
          </Card>
        ))}
      </div>
    )
  }
  if (view === "list") {
    return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Card key={i} className="flex items-center gap-4 p-3"><Skeleton className="h-10 w-10 rounded-xl" /><div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-28" /></div></Card>)}</div>
  }
  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="p-3 border-b bg-muted/50"><div className="flex gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-4 w-20" />)}</div></div>
      {Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex items-center gap-4 p-3 border-b last:border-0"><Skeleton className="h-8 w-8 rounded-lg" /><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-28" /><Skeleton className="h-5 w-16 rounded-full" /></div>)}
    </div>
  )
}

export default function ApplicationsPage() {
  return <Suspense fallback={<ApplicationsSkeleton />}><ApplicationsContent /></Suspense>
}
