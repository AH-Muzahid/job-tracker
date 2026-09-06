"use client"

import { Search, X, RefreshCw, Filter, Sliders } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { DiscoveryFilterSidebar } from "./DiscoveryFilterSidebar"
import { DiscoverySortDropdown } from "./DiscoverySortDropdown"
import { DiscoveryJobList } from "./DiscoveryJobList"
import { DiscoveryPreferencesModal } from "./DiscoveryPreferencesModal"
import { DiscoveryTrackModal } from "./DiscoveryTrackModal"
import { DiscoveryDismissModal } from "./DiscoveryDismissModal"
import { AgentAuditFeed } from "./AgentAuditFeed"
import { useJobDiscovery } from "@/hooks/use-job-discovery"
import type { ExternalJobOpportunity } from "@/lib/ai/graph/tools/discovery-tools"

export function DiscoveryPage() {
  const {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    savedJobs,
    dismissModalJob,
    setDismissModalJob,
    preferencesModalOpen,
    setPreferencesModalOpen,
    trackModalJob,
    setTrackModalJob,
    mobileFiltersOpen,
    setMobileFiltersOpen,
    userProfile,
    refetchProfile,
    isLoading,
    isRefetching,
    refetch,
    allOpportunities,
    sortedOpportunities,
    activeFiltersCount,
    saveMutation,
    forceRefreshMutation,
    dismissMutation,
    handleApplyClick,
    handleSearchSubmit,
    clearAllFilters,
    queryClient,
  } = useJobDiscovery()

  return (
    <div className="space-y-6">
      {/* 1. Clean, Minimal Header with Title, Active Criteria & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/70">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Job Discovery
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono font-medium border border-border bg-muted/40 text-muted-foreground rounded-none">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Live Feed ({allOpportunities.length})
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Curated opportunities matched directly against your target skills and career preferences.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreferencesModalOpen(true)}
            className="h-8 text-xs gap-1.5 rounded-none cursor-pointer border-border font-medium"
          >
            <Sliders className="size-3.5" />
            <span>Preferences</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => forceRefreshMutation.mutate()}
            disabled={forceRefreshMutation.isPending || isRefetching}
            className="h-8 text-xs gap-1.5 rounded-none cursor-pointer border-border"
            title="Sync latest postings from Greenhouse, Lever & partner boards"
          >
            <RefreshCw className={cn("size-3.5", (forceRefreshMutation.isPending || isRefetching) && "animate-spin")} />
            <span>{forceRefreshMutation.isPending ? "Syncing..." : "Refresh"}</span>
          </Button>
        </div>
      </div>

      {/* Search + Sort + Filter Bar */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80 md:w-96 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search roles, companies, tech stack..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 text-sm h-9 bg-background rounded-none border-border/70"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Mobile Filter Trigger Sheet */}
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden h-9 text-xs gap-1.5 rounded-none cursor-pointer border-border"
              >
                <Filter className="size-3.5" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-80 p-5 overflow-y-auto">
              <SheetHeader className="mb-4">
                <SheetTitle className="text-sm font-semibold flex items-center gap-2">
                  <Filter className="size-4 text-primary" />
                  Filters & Refine
                </SheetTitle>
              </SheetHeader>
              <DiscoveryFilterSidebar
                filters={filters}
                onFilterChange={setFilters}
                hideDecor
              />
            </SheetContent>
          </Sheet>

          <DiscoverySortDropdown value={sortBy} onChange={setSortBy} />
        </div>
      </div>

      {/* LangGraph Career Orchestrator Activity & Audit Feed */}
      <AgentAuditFeed defaultExpanded={false} />

      {/* Two-column: Desktop Sidebar + List */}
      <div className="flex gap-6">
        <DiscoveryFilterSidebar
          filters={filters}
          onFilterChange={setFilters}
          className="hidden lg:block w-64 shrink-0 border-r border-border/60 pr-5"
        />
        <div className="flex-1 min-w-0">
          <DiscoveryJobList
            opportunities={sortedOpportunities}
            isLoading={isLoading}
            savedJobs={savedJobs}
            saveMutation={saveMutation}
            onSave={(job) => saveMutation.mutate(job)}
            onDismiss={(job) => setDismissModalJob(job)}
            dismissingJobId={dismissMutation.isPending ? dismissMutation.variables?.job.id : null}
            onApplyClick={handleApplyClick}
            onClearAll={clearAllFilters}
            onRefetch={() => refetch()}
            onOpenPreferences={() => setPreferencesModalOpen(true)}
            searchQuery={searchQuery}
          />
        </div>
      </div>

      {/* 1-Click Search Intent & Preferences Modal */}
      <DiscoveryPreferencesModal
        open={preferencesModalOpen}
        onOpenChange={setPreferencesModalOpen}
        currentPreferences={userProfile}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["user-profile"] })
          refetchProfile()
          forceRefreshMutation.mutate()
        }}
      />

      {/* External Application Follow-up & Track Modal */}
      <DiscoveryTrackModal
        job={trackModalJob}
        open={Boolean(trackModalJob)}
        onOpenChange={(open) => {
          if (!open) setTrackModalJob(null)
        }}
        onTrackApplied={(job) => {
          fetch("/api/jobs/discover", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "track_click",
              jobId: job.jobId || job.id,
              companyName: job.company,
              jobTitle: job.title,
              clickType: "apply",
            }),
          }).catch(() => {})
          saveMutation.mutate({
            ...job,
            appliedStatus: "Applied",
          } as ExternalJobOpportunity)
        }}
        onSaveToTracker={(job) => {
          saveMutation.mutate(job)
        }}
        isSubmitting={saveMutation.isPending}
      />

      {/* Interactive 1-Click Dismissal Modal */}
      <DiscoveryDismissModal
        job={dismissModalJob}
        open={Boolean(dismissModalJob)}
        onOpenChange={(open) => {
          if (!open) setDismissModalJob(null)
        }}
        onDismiss={(job, reason) => {
          dismissMutation.mutate({ job, reason })
        }}
      />
    </div>
  )
}
