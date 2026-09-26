"use client"

import { useState } from "react"
import {
  Search, X, SlidersHorizontal
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { DiscoveryFilterSidebar } from "./DiscoveryFilterSidebar"
import { DiscoverySortDropdown } from "./DiscoverySortDropdown"
import { DiscoveryJobList } from "./DiscoveryJobList"
import { DiscoveryPreferencesModal } from "./DiscoveryPreferencesModal"
import { DiscoveryTrackModal } from "./DiscoveryTrackModal"
import { DiscoveryDismissModal } from "./DiscoveryDismissModal"
import { useJobDiscovery } from "@/hooks/use-job-discovery"
import type { DiscoveryTab } from "./types"
import type { ExternalJobOpportunity } from "@/lib/ai/graph/tools/discovery-tools"

export function DiscoveryPage() {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)

  const {
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    facetCounts,
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
    userProfile,
    refetchProfile,
    isLoading,
    refetch,
    sortedOpportunities,
    saveMutation,
    onPackage,
    packagingJobId,
    stagedJobs,
    stagedAppMap,
    forceRefreshMutation,
    dismissMutation,
    handleApplyClick,
    clearAllFilters,
    queryClient,
  } = useJobDiscovery()

  const tabs: { id: DiscoveryTab; label: string; count?: number }[] = [
    { id: "all", label: "All Jobs", count: facetCounts.total },
    { id: "saved", label: "Saved", count: facetCounts.saved },
  ]

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 pb-10 items-start">
        {/* Left Main Stream */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 sm:gap-5 w-full">
          
          {/* ========================================================================= */}
          {/* 1. DESKTOP HEADER (>= md) - Clean Linear / Stripe standard                 */}
          {/* ========================================================================= */}
          <div className="hidden md:flex items-start justify-between gap-4 pt-1">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider font-mono">
                Opportunities
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Find Your Next Opportunity
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                Discover high-quality jobs, get AI insights, and take the next step in your career.
              </p>
            </div>
            
            {/* Header Action: Job Preferences Modal Trigger */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={() => setPreferencesModalOpen(true)}
                className="h-8.5 px-3 text-xs gap-1.5 rounded-sm cursor-pointer border-border font-medium hover:bg-muted transition-colors shadow-none"
              >
                <SlidersHorizontal className="size-3.5 text-muted-foreground" />
                <span>Job Preferences</span>
              </Button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. MOBILE HEADER (< md)                                                   */}
          {/* ========================================================================= */}
          <div className="flex md:hidden flex-col gap-2 pt-1">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Opportunities
              </h1>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreferencesModalOpen(true)}
                  className="size-8.5 rounded-sm border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title="Job Preferences"
                >
                  <SlidersHorizontal className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                  className="size-8.5 rounded-sm border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title="Search opportunities"
                >
                  <Search className="size-4" />
                </button>
              </div>
            </div>

            {/* Expandable Mobile Search Input */}
            {mobileSearchOpen && (
              <div className="relative pt-1 animate-in fade-in duration-150">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search jobs, companies, skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8.5 pl-8.5 pr-8 text-xs bg-muted/30 border border-border rounded-sm text-foreground focus:outline-hidden focus:border-primary"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 3. TABS BAR & CONTROLS ROW - Sticky on scroll                             */}
          {/* ========================================================================= */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3 bg-background/95 backdrop-blur-xs sticky top-14 sm:top-15 z-20 pt-1 -mt-1">
            {/* Tabs Row (Scrollable on both Mobile and Desktop) */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar -mx-1 px-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-sm text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 border border-transparent whitespace-nowrap",
                      isActive
                        ? "bg-primary/10 text-primary border-primary/20 font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <span>{tab.label}</span>
                    {typeof tab.count === "number" && (
                      <span className={cn(
                        "text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-full",
                        isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Mobile Subhead: Count, Filters Sheet & Sort Button */}
            <div className="flex md:hidden items-center justify-between w-full pt-1">
              <span className="text-xs font-mono text-muted-foreground tabular-nums">
                {sortedOpportunities.length} opportunities
              </span>
              <div className="flex items-center gap-2">
                <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
                  <SheetTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-sm border border-border bg-card text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      <SlidersHorizontal className="size-3 text-muted-foreground" />
                      <span>Filters</span>
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl p-4 sm:p-6">
                    <SheetHeader className="pb-3 border-b border-border">
                      <SheetTitle className="text-base font-semibold">Filter Opportunities</SheetTitle>
                    </SheetHeader>
                    <div className="pt-2">
                      <DiscoveryFilterSidebar
                        filters={filters}
                        onFilterChange={setFilters}
                        facetCounts={facetCounts}
                        totalCount={sortedOpportunities.length}
                        onApplyFilters={() => {
                          setMobileFilterOpen(false)
                          refetch()
                        }}
                      />
                    </div>
                  </SheetContent>
                </Sheet>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground font-medium">Sort</span>
                  <DiscoverySortDropdown value={sortBy} onChange={setSortBy} />
                </div>
              </div>
            </div>

            {/* Desktop Right Controls: Sort Dropdown */}
            <div className="hidden md:flex items-center gap-2 shrink-0 ml-auto">
              <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Sort by</span>
              <DiscoverySortDropdown value={sortBy} onChange={setSortBy} />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. OPPORTUNITIES FEED                                                     */}
          {/* ========================================================================= */}
          <div>
            <DiscoveryJobList
              opportunities={sortedOpportunities}
              isLoading={isLoading}
              savedJobs={savedJobs}
              saveMutation={saveMutation}
              onSave={(job) => saveMutation.mutate(job)}
              onApplyClick={handleApplyClick}
              onDismiss={(job) => setDismissModalJob(job)}
              onClearAll={clearAllFilters}
              onRefetch={() => refetch()}
              onOpenPreferences={() => setPreferencesModalOpen(true)}
              searchQuery={searchQuery}
              activeTab={activeTab}
              onPackage={(job) => onPackage(job)}
              packagingJobId={packagingJobId}
              stagedJobs={stagedJobs}
              stagedAppMap={stagedAppMap}
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT SIDEBAR (STRUCTURED FILTERS) - Sticky / Fixed in Viewport           */}
        {/* ========================================================================= */}
        <div className="hidden lg:block w-80 shrink-0 sticky top-18 lg:top-20 self-start max-h-[calc(100vh-5.5rem)] overflow-y-auto no-scrollbar">
          <DiscoveryFilterSidebar
            filters={filters}
            onFilterChange={setFilters}
            facetCounts={facetCounts}
            totalCount={sortedOpportunities.length}
            onApplyFilters={() => refetch()}
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
          saveMutation.mutate({ job, action: "save" })
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
    </>
  )
}
