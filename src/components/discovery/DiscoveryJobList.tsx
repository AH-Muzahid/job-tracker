"use client"

import { Briefcase, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DecorIcon } from "@/components/decor-icon"
import { DiscoveryJobRow } from "./DiscoveryJobRow"
import type { ExternalJobOpportunity } from "@/lib/ai/graph/tools/discovery-tools"
import type { UseMutationResult } from "@tanstack/react-query"

interface DiscoveryJobListProps {
  opportunities: ExternalJobOpportunity[]
  isLoading: boolean
  expandedRowId: string | null
  savedJobs: Set<string>
  saveMutation: UseMutationResult<unknown, Error, ExternalJobOpportunity>
  onToggleExpand: (id: string) => void
  onSave: (job: ExternalJobOpportunity) => void
  onDismiss?: (job: ExternalJobOpportunity) => void
  dismissingJobId?: string | null
  onClearAll: () => void
  onRefetch: () => void
  searchQuery: string
}

export function DiscoveryJobList({
  opportunities, isLoading, expandedRowId, savedJobs, saveMutation,
  onToggleExpand, onSave, onDismiss, dismissingJobId, onClearAll, onRefetch, searchQuery,
}: DiscoveryJobListProps) {
  if (isLoading) {
    return (
      <div className="space-y-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="animate-pulse py-3 px-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="size-8 bg-muted/40 rounded-none" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 bg-muted/40 rounded-none w-2/5" />
                <div className="h-3 bg-muted/30 rounded-none w-1/6" />
              </div>
              <div className="h-6 bg-muted/40 rounded-none w-16" />
            </div>
            <div className="flex gap-1 mt-2 ml-11">
              <div className="h-3 bg-muted/30 rounded-none w-12" />
              <div className="h-3 bg-muted/30 rounded-none w-16" />
              <div className="h-3 bg-muted/30 rounded-none w-10" />
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
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="default" size="sm" onClick={onClearAll} className="text-xs px-4 cursor-pointer rounded-none">Browse All Roles</Button>
          <Button variant="outline" size="sm" onClick={onRefetch} className="text-xs px-3 cursor-pointer rounded-none">
            <RefreshCw className="size-3.5 mr-1" />Refresh Feed
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-semibold text-foreground">{opportunities.length} Positions Available</span>
      </div>
      <div>
        {opportunities.map((job) => (
          <DiscoveryJobRow
            key={job.id}
            job={job}
            isExpanded={expandedRowId === job.id}
            isSaved={savedJobs.has(job.id)}
            isSaving={saveMutation.isPending && saveMutation.variables?.id === job.id}
            isDismissing={dismissingJobId === job.id}
            onToggle={() => onToggleExpand(job.id)}
            onSave={() => onSave(job)}
            onDismiss={onDismiss ? () => onDismiss(job) : undefined}
          />
        ))}
      </div>
    </div>
  )
}
