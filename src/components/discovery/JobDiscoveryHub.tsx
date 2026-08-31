"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search,
  BrainCircuit,
  BookmarkPlus,
  Check,
  ExternalLink,
  MapPin,
  DollarSign,
  Briefcase,
  Zap,
  Filter,
  RefreshCw,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DashboardCard } from "@/components/dashboard-card"
import { DecorIcon } from "@/components/decor-icon"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { ExternalJobOpportunity } from "@/lib/ai/graph/tools/discovery-tools"

const QUICK_TAGS = [
  "Remote",
  "React",
  "Go",
  "TypeScript",
  "Next.js",
  "Python",
  "Full Stack",
  "Backend",
]

export function JobDiscoveryHub() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()

  // Query jobs
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["jobs", "discover", searchQuery, selectedTag],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchQuery.trim()) params.append("query", searchQuery.trim())
      if (selectedTag) params.append("tags", selectedTag)
      params.append("limit", "12")

      const res = await fetch(`/api/jobs/discover?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to discover jobs")
      const json = await res.json()
      return json.data as { opportunities: ExternalJobOpportunity[]; count: number }
    },
    staleTime: 60 * 1000,
  })

  const opportunities = data?.opportunities || []

  // 1-Click Save mutation
  const saveMutation = useMutation({
    mutationFn: async (job: ExternalJobOpportunity) => {
      const res = await fetch("/api/jobs/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          companyName: job.company,
          jobTitle: job.title,
          jobUrl: job.url,
          location: job.location,
          salary: job.salary,
          notes: `Fit Score: ${job.fitScore}%\n${job.matchRationale}`,
        }),
      })
      if (!res.ok) throw new Error("Failed to save job to tracker")
      return res.json()
    },
    onSuccess: (_, job) => {
      setSavedJobs((prev) => new Set(prev).add(job.id))
      queryClient.invalidateQueries({ queryKey: ["applications"] })
      toast.success(`"${job.title}" saved to your Tracker (Saved column)!`)
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save application")
    },
  })

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    refetch()
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
    if (score >= 70) return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30"
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
  }

  return (
    <div className="space-y-6">
      {/* Header & Search Control Strip */}
      <div className="relative rounded-xl border border-border bg-card p-4 sm:p-6 shadow-xs">
        <DecorIcon position="top-right" />
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
              <Zap className="size-4" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Autonomous Job Discovery Hub
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Real-time tech opportunities dynamically scored against your resume, career knowledge graph, and profile strengths.
          </p>
        </div>

        {/* Search Input & Action */}
        <form onSubmit={handleSearchSubmit} className="mt-5 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by role, company, or stack (e.g. Senior React Engineer, Go microservices)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs sm:text-sm h-10 bg-background"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading || isRefetching} className="h-10 text-xs px-4 gap-1.5 cursor-pointer">
              <Filter className="size-3.5" />
              <span>Filter Roles</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              className="h-10 px-3 cursor-pointer"
              title="Refresh feed"
            >
              <RefreshCw className={cn("size-3.5", (isLoading || isRefetching) && "animate-spin")} />
            </Button>
          </div>
        </form>

        {/* Skill Pills */}
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground mr-1">Quick tags:</span>
          {QUICK_TAGS.map((tag) => {
            const isSelected = selectedTag === tag
            return (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setSelectedTag(isSelected ? null : tag)
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer border",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border-border/60"
                )}
              >
                {tag}
              </button>
            )
          })}
          {selectedTag && (
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className="text-[11px] text-muted-foreground hover:text-foreground underline ml-1 cursor-pointer"
            >
              Clear tag
            </button>
          )}
        </div>
      </div>

      {/* Opportunities Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="h-56 rounded-xl border border-border bg-card p-4 animate-pulse space-y-3"
            >
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-3 bg-muted/60 rounded w-1/3" />
              <div className="h-12 bg-muted/40 rounded w-full" />
              <div className="h-8 bg-muted/50 rounded w-full mt-auto" />
            </div>
          ))}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center bg-muted/5">
          <div className="mx-auto size-10 rounded-full bg-muted flex items-center justify-center mb-3 text-muted-foreground">
            <Briefcase className="size-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">No matching opportunities found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Try adjusting your search keywords or removing active tags to discover more positions.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("")
              setSelectedTag(null)
            }}
            className="mt-4 text-xs cursor-pointer"
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {opportunities.map((job) => {
            const isSaved = savedJobs.has(job.id)
            const isSaving = saveMutation.isPending && saveMutation.variables?.id === job.id

            return (
              <DashboardCard
                key={job.id}
                className="flex flex-col justify-between p-4 sm:p-5 hover:border-primary/40 transition-all group relative bg-card shadow-xs"
              >
                <div>
                  {/* Top Row: Company & Fit Score Badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-muted-foreground block truncate">
                        {job.company}
                      </span>
                      <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2 mt-0.5 group-hover:text-primary transition-colors">
                        {job.title}
                      </h3>
                    </div>

                    <div
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 border",
                        getScoreColor(job.fitScore)
                      )}
                      title={`AI Fit Score calculated from your resume and knowledge graph`}
                    >
                      <BrainCircuit className="size-3" />
                      <span>{job.fitScore}% Match</span>
                    </div>
                  </div>

                  {/* Metadata Row: Location & Salary */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-3 font-medium">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3 shrink-0 text-muted-foreground/70" />
                      <span className="truncate max-w-[120px]">{job.location}</span>
                    </span>
                    {job.salary && (
                      <span className="flex items-center gap-0.5 text-foreground font-mono text-[11px] bg-muted/60 px-1.5 py-0.2 rounded">
                        <DollarSign className="size-3 shrink-0" />
                        <span>{job.salary}</span>
                      </span>
                    )}
                  </div>

                  {/* AI Match Rationale */}
                  <div className="rounded-md bg-muted/40 p-2.5 border border-border/50 text-[11px] text-muted-foreground mb-3 leading-relaxed">
                    <p className="font-medium text-foreground line-clamp-1 flex items-center gap-1 mb-0.5">
                      <Zap className="size-3 text-primary shrink-0" />
                      <span>AI Rationale:</span>
                    </p>
                    <p className="line-clamp-2">{job.matchRationale}</p>
                  </div>

                  {/* Tags */}
                  {job.tags && job.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {job.tags.slice(0, 4).map((t) => (
                        <Badge
                          key={t}
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 font-normal h-4.5 bg-muted/70"
                        >
                          {t}
                        </Badge>
                      ))}
                      {job.tags.length > 4 && (
                        <span className="text-[10px] text-muted-foreground self-center">
                          +{job.tags.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-border flex items-center justify-between gap-2 mt-auto">
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                  >
                    <span>View Role</span>
                    <ExternalLink className="size-3" />
                  </a>

                  <Button
                    size="sm"
                    variant={isSaved ? "secondary" : "default"}
                    disabled={isSaved || isSaving}
                    onClick={() => saveMutation.mutate(job)}
                    className="h-8 text-xs gap-1.5 cursor-pointer"
                  >
                    {isSaved ? (
                      <>
                        <Check className="size-3.5 text-emerald-500" />
                        <span>Saved</span>
                      </>
                    ) : isSaving ? (
                      <>
                        <RefreshCw className="size-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="size-3.5" />
                        <span>Save to Tracker</span>
                      </>
                    )}
                  </Button>
                </div>
              </DashboardCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
