"use client"

import { Search, X, BrainCircuit, FileText, FileEdit, Scale, Briefcase, Target, Sliders } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DiscoveryFilterSidebar } from "./DiscoveryFilterSidebar"
import { DiscoverySortDropdown } from "./DiscoverySortDropdown"
import { DiscoveryJobList } from "./DiscoveryJobList"
import { DiscoveryPreferencesModal } from "./DiscoveryPreferencesModal"
import { DiscoveryTrackModal } from "./DiscoveryTrackModal"
import { DiscoveryDismissModal } from "./DiscoveryDismissModal"
import { useJobDiscovery } from "@/hooks/use-job-discovery"
import { useUI } from "@/lib/store"
import type { ExternalJobOpportunity } from "@/lib/ai/graph/tools/discovery-tools"

export function DiscoveryPage() {
  const setEvaluatorModal = useUI((s) => s.setEvaluatorModal)
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

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column (Header + Tabs + Job List) */}
      <div className="flex-1 min-w-0 flex flex-col gap-6">
        {/* 1. Clean, Minimal Header with Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Opportunities
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Find Your Next Opportunity
            </h1>
            <p className="text-sm text-muted-foreground">
              Discover high-quality jobs, get AI insights, and take the next step in your career.
            </p>
          </div>
          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => setPreferencesModalOpen(true)}
              className="h-9 text-sm gap-2 rounded-md cursor-pointer border-border font-medium"
            >
              <Sliders className="h-4 w-4" />
              <span>Preferences</span>
            </Button>
          </div>
        </div>

        {/* Results Info and Controls Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
          
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-50/80 text-blue-700 border border-blue-100 shadow-sm">
              <Briefcase className="h-3.5 w-3.5" />
              <span className="text-[13px] font-semibold">{sortedOpportunities.length}</span>
              <span className="text-[13px] font-medium opacity-90">Opportunities</span>
            </div>
            
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50/80 text-emerald-700 border border-emerald-100 shadow-sm">
              <Target className="h-3.5 w-3.5" />
              <span className="text-[13px] font-medium">Highly Recommended</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-[13px] text-muted-foreground font-medium">Sort by</span>
            <DiscoverySortDropdown value={sortBy} onChange={setSortBy} />
          </div>
        </div>

        {/* Main Content Area (Job List) */}
        <div>
          <DiscoveryJobList
            opportunities={sortedOpportunities}
            isLoading={isLoading}
            savedJobs={savedJobs}
            saveMutation={saveMutation}
            onSave={(job) => saveMutation.mutate(job)}
            onApplyClick={handleApplyClick}
            onClearAll={clearAllFilters}
            onRefetch={() => refetch()}
            onOpenPreferences={() => setPreferencesModalOpen(true)}
            searchQuery={searchQuery}
            onPackage={(job) => onPackage(job)}
            packagingJobId={packagingJobId}
            stagedJobs={stagedJobs}
            stagedAppMap={stagedAppMap}
          />
        </div>
      </div>

      {/* Right Sidebar Area (AI Copilot + Filters) */}
        <div className="w-full lg:w-80 shrink-0 space-y-6">
          {/* AI Career Copilot Card */}
          <Card className="bg-primary/5 border-primary/10 shadow-none">
            <CardHeader className="pb-3 px-4 pt-4">
              <CardTitle className="text-base flex items-center gap-2 font-bold text-foreground">
                <BrainCircuit className="size-5 text-primary" />
                Your AI Career Copilot
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1.5">
                Get AI-powered insights to find and land the right opportunities.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-1.5">
              <button onClick={() => setEvaluatorModal(true)} className="w-full flex items-center justify-between p-2.5 rounded-md hover:bg-background/80 transition-colors border border-transparent hover:border-border/50 text-left group">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-500/10 text-blue-600 rounded-md p-1.5 mt-0.5">
                    <Search className="size-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Analyze a job description</div>
                    <div className="text-[11px] text-muted-foreground">Get match score and insights</div>
                  </div>
                </div>
                <div className="text-muted-foreground">›</div>
              </button>
              
              <button className="w-full flex items-center justify-between p-2.5 rounded-md hover:bg-background/80 transition-colors border border-transparent hover:border-border/50 text-left group">
                <div className="flex items-start gap-3">
                  <div className="bg-emerald-500/10 text-emerald-600 rounded-md p-1.5 mt-0.5">
                    <FileText className="size-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Improve my resume</div>
                    <div className="text-[11px] text-muted-foreground">Tailor for this role</div>
                  </div>
                </div>
                <div className="text-muted-foreground">›</div>
              </button>
              
              <button className="w-full flex items-center justify-between p-2.5 rounded-md hover:bg-background/80 transition-colors border border-transparent hover:border-border/50 text-left group">
                <div className="flex items-start gap-3">
                  <div className="bg-indigo-500/10 text-indigo-600 rounded-md p-1.5 mt-0.5">
                    <FileEdit className="size-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Generate a cover letter</div>
                    <div className="text-[11px] text-muted-foreground">Create a personalized cover letter</div>
                  </div>
                </div>
                <div className="text-muted-foreground">›</div>
              </button>
              
              <button className="w-full flex items-center justify-between p-2.5 rounded-md hover:bg-background/80 transition-colors border border-transparent hover:border-border/50 text-left group">
                <div className="flex items-start gap-3">
                  <div className="bg-amber-500/10 text-amber-600 rounded-md p-1.5 mt-0.5">
                    <Scale className="size-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Compare opportunities</div>
                    <div className="text-[11px] text-muted-foreground">Find the best fit</div>
                  </div>
                </div>
                <div className="text-muted-foreground">›</div>
              </button>
            </CardContent>
          </Card>

          {/* Filters Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base text-foreground">Filters</h3>
              <button 
                onClick={clearAllFilters}
                className="text-xs text-primary font-medium hover:underline cursor-pointer"
              >
                Reset
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-sm h-9 bg-background border-border"
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
            </div>

            <DiscoveryFilterSidebar
              filters={filters}
              onFilterChange={setFilters}
              hideDecor
            />
          </div>
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
    </>
  )
}

