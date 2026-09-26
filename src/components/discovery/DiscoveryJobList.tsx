"use client"

import { Briefcase, RefreshCw, Sliders, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DecorIcon } from "@/components/decor-icon"
import { DiscoveryJobCard } from "./DiscoveryJobCard"
import type { DiscoveryTab } from "./types"
import type { ExternalJobOpportunity } from "@/lib/ai/graph/tools/discovery-tools"
import type { UseMutationResult } from "@tanstack/react-query"
import type { SaveJobPayload } from "@/hooks/use-job-discovery"

interface DiscoveryJobListProps {
  opportunities: ExternalJobOpportunity[]
  isLoading: boolean
  savedJobs: Set<string>
  saveMutation: UseMutationResult<unknown, Error, SaveJobPayload>
  onSave: (job: ExternalJobOpportunity) => void
  onApplyClick?: (job: ExternalJobOpportunity) => void
  onDismiss?: (job: ExternalJobOpportunity) => void
  onClearAll: () => void
  onRefetch: () => void
  onOpenPreferences?: () => void
  searchQuery: string
  activeTab?: DiscoveryTab
  onPackage?: (job: ExternalJobOpportunity) => void
  packagingJobId?: string | null
  stagedJobs?: Set<string>
  stagedAppMap?: Record<string, string>
}

export function DiscoveryJobList({
  opportunities,
  isLoading,
  savedJobs,
  saveMutation,
  onSave,
  onApplyClick,
  onDismiss,
  onClearAll,
  onRefetch,
  onOpenPreferences,
  searchQuery,
  activeTab = "all",
  onPackage,
  packagingJobId,
  stagedJobs,
  stagedAppMap,
}: DiscoveryJobListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse p-4 sm:p-5 border border-border rounded-[6px] bg-card h-36">
            <div className="flex gap-4">
              <div className="size-11 bg-muted/60 rounded-[6px] shrink-0" />
              <div className="flex-1 space-y-2.5 pt-1">
                <div className="h-5 bg-muted/60 rounded-xs w-1/2" />
                <div className="h-4 bg-muted/40 rounded-xs w-1/4" />
                <div className="flex gap-2 mt-3">
                  <div className="h-5 bg-muted/30 rounded-xs w-16" />
                  <div className="h-5 bg-muted/30 rounded-xs w-20" />
                  <div className="h-5 bg-muted/30 rounded-xs w-24" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (opportunities.length === 0) {
    if (activeTab === "saved") {
      return (
        <div className="relative rounded-[6px] border border-dashed border-border p-10 sm:p-14 text-center bg-card shadow-xs">
          <DecorIcon position="top-right" />
          <DecorIcon position="bottom-left" />
          <div className="mx-auto size-11 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center mb-3 text-primary">
            <Bookmark className="size-5" />
          </div>
          <h3 className="text-base font-bold text-foreground">No saved opportunities yet</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
            Click the bookmark icon on any opportunity card to save it here for later review.
          </p>
          <div className="mt-5 flex justify-center">
            <Button variant="outline" size="sm" onClick={onClearAll} className="text-xs px-4 rounded-sm cursor-pointer">
              Browse All Roles
            </Button>
          </div>
        </div>
      )
    }

    if (activeTab === "hidden") {
      return (
        <div className="relative rounded-[6px] border border-dashed border-border p-10 sm:p-14 text-center bg-card shadow-xs">
          <DecorIcon position="top-right" />
          <DecorIcon position="bottom-left" />
          <h3 className="text-base font-bold text-foreground">No dismissed opportunities</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
            Opportunities you dismiss from the three-dots menu will appear here.
          </p>
        </div>
      )
    }

    return (
      <div className="relative rounded-[6px] border border-dashed border-border p-10 sm:p-14 text-center bg-card shadow-xs">
        <DecorIcon position="top-right" />
        <DecorIcon position="bottom-left" />
        <div className="mx-auto size-11 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center mb-3 text-primary">
          <Briefcase className="size-5" />
        </div>
        <h3 className="text-base font-bold text-foreground">No matching opportunities found</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
          {searchQuery ? (
            <>We couldn&apos;t find roles matching <span className="font-semibold text-foreground">&ldquo;{searchQuery}&rdquo;</span>. Try broader keywords or adjust filters.</>
          ) : (
            "No live opportunities returned for your current filters. Try resetting filters or modifying search keywords."
          )}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto">
          <span className="text-xs text-muted-foreground mr-1">Popular searches:</span>
          {["Software Engineer", "Product Manager", "Remote", "React", "AI"].map((kw) => (
            <Button key={kw} variant="outline" size="sm" onClick={onClearAll} className="h-7 text-xs px-2.5 rounded-sm cursor-pointer">{kw}</Button>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onOpenPreferences && (
            <Button
              variant="default"
              size="sm"
              onClick={onOpenPreferences}
              className="text-xs px-3.5 cursor-pointer rounded-sm gap-1.5"
            >
              <Sliders className="size-3.5" />
              Edit Preferences
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClearAll} className="text-xs px-4 cursor-pointer rounded-sm">Reset Filters</Button>
          <Button variant="outline" size="sm" onClick={onRefetch} className="text-xs px-3 cursor-pointer rounded-sm">
            <RefreshCw className="size-3.5 mr-1" />Refresh Feed
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {opportunities.map((job) => {
        const isSaved = savedJobs.has(job.id) || Boolean(job.jobId && savedJobs.has(job.jobId))
        const savingVars = saveMutation.variables
        const activeSavingId = savingVars
          ? "job" in savingVars
            ? savingVars.job.id
            : savingVars.id
          : null
        const activeSavingJobId = savingVars
          ? "job" in savingVars
            ? savingVars.job.jobId
            : savingVars.jobId
          : null
        const isSaving = Boolean(
          saveMutation.isPending && (
            activeSavingId === job.id ||
            (job.jobId && activeSavingId === job.jobId) ||
            (activeSavingJobId && (activeSavingJobId === job.id || activeSavingJobId === job.jobId))
          )
        )
        const isPackagingItem = packagingJobId === job.id || Boolean(job.jobId && packagingJobId === job.jobId)
        const isStagedItem = Boolean(
          stagedJobs?.has(job.id) ||
          (job.jobId && stagedJobs?.has(job.jobId)) ||
          job.appliedStatus === "STAGED" ||
          job.appliedStatus === "Staged"
        )
        const stagedApplicationId = stagedAppMap?.[job.id] ||
          (job.jobId ? stagedAppMap?.[job.jobId] : null) ||
          job.applicationId ||
          null

        return (
          <DiscoveryJobCard
            key={job.id}
            job={job}
            isSaved={isSaved}
            isSaving={isSaving}
            isPackaging={isPackagingItem}
            isStaged={isStagedItem}
            stagedApplicationId={stagedApplicationId}
            onSave={() => onSave(job)}
            onPackage={onPackage ? () => onPackage(job) : undefined}
            onApplyClick={onApplyClick ? () => onApplyClick(job) : undefined}
            onDismiss={onDismiss ? () => onDismiss(job) : undefined}
          />
        )
      })}
    </div>
  )
}
