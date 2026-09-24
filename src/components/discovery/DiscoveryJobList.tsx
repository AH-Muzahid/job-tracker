"use client"

import { Briefcase, RefreshCw, Sliders } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DecorIcon } from "@/components/decor-icon"
import { DiscoveryJobCard } from "./DiscoveryJobCard"
import type { ExternalJobOpportunity } from "@/lib/ai/graph/tools/discovery-tools"
import type { UseMutationResult } from "@tanstack/react-query"

interface DiscoveryJobListProps {
  opportunities: ExternalJobOpportunity[]
  isLoading: boolean
  savedJobs: Set<string>
  saveMutation: UseMutationResult<unknown, Error, ExternalJobOpportunity>
  onSave: (job: ExternalJobOpportunity) => void
  onApplyClick?: (job: ExternalJobOpportunity) => void
  onClearAll: () => void
  onRefetch: () => void
  onOpenPreferences?: () => void
  searchQuery: string
  onPackage?: (job: ExternalJobOpportunity) => void
  packagingJobId?: string | null
  stagedJobs?: Set<string>
  stagedAppMap?: Record<string, string>
}

export function DiscoveryJobList({
  opportunities, isLoading, savedJobs, saveMutation,
  onSave, onApplyClick, onClearAll, onRefetch, onOpenPreferences, searchQuery,
  onPackage, packagingJobId, stagedJobs, stagedAppMap
}: DiscoveryJobListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse p-5 border border-border/40 rounded-xl bg-card h-40">
            <div className="flex gap-4">
              <div className="size-12 bg-muted/40 rounded-lg shrink-0" />
              <div className="flex-1 space-y-3 pt-1">
                <div className="h-5 bg-muted/40 rounded-md w-2/3" />
                <div className="h-4 bg-muted/30 rounded-md w-1/3" />
                <div className="flex gap-2 mt-4">
                  <div className="h-6 bg-muted/30 rounded-md w-16" />
                  <div className="h-6 bg-muted/30 rounded-md w-20" />
                  <div className="h-6 bg-muted/30 rounded-md w-24" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (opportunities.length === 0) {
    return (
      <div className="relative rounded-none border border-dashed border-border p-10 sm:p-14 text-center bg-card shadow-xs">
        <DecorIcon position="top-right" />
        <DecorIcon position="bottom-left" />
        <div className="mx-auto size-12 rounded-none bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary">
          <Briefcase className="size-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">No matching opportunities found</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
          {searchQuery ? (
            <>We couldn&apos;t find roles matching <span className="font-semibold text-foreground">&ldquo;{searchQuery}&rdquo;</span>. Try broader keywords or adjust filters.</>
          ) : (
            "No live opportunities returned. Try popular tech categories or refresh the feed."
          )}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto">
          <span className="text-xs text-muted-foreground mr-1">Try searching:</span>
          {["Full Stack", "React", "Backend", "AI Systems", "Go"].map((kw) => (
            <Button key={kw} variant="outline" size="sm" onClick={onClearAll} className="h-7 text-xs px-2.5 rounded-none cursor-pointer">{kw}</Button>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onOpenPreferences && (
            <Button
              variant="default"
              size="sm"
              onClick={onOpenPreferences}
              className="text-xs px-3.5 cursor-pointer rounded-none gap-1.5"
            >
              <Sliders className="size-3.5" />
              Edit Criteria
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClearAll} className="text-xs px-4 cursor-pointer rounded-none">Browse All Roles</Button>
          <Button variant="outline" size="sm" onClick={onRefetch} className="text-xs px-3 cursor-pointer rounded-none">
            <RefreshCw className="size-3.5 mr-1" />Refresh Feed
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {opportunities.map((job) => {
        const isSaved = savedJobs.has(job.id) || Boolean(job.jobId && savedJobs.has(job.jobId))
        const isSaving = saveMutation.isPending && saveMutation.variables?.id === job.id
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
          />
        )
      })}
    </div>
  )
}
