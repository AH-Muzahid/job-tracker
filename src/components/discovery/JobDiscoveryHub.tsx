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
  X,
  Compass,
  Layers,
  Globe,
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
  "Full Stack",
  "Frontend",
  "Backend",
  "React",
  "Next.js",
  "TypeScript",
  "Python",
  "Go",
  "AI",
  "Remote",
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
      params.append("limit", "18")

      const res = await fetch(`/api/jobs/discover?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to discover jobs")
      const json = await res.json()
      return json.data as { opportunities: ExternalJobOpportunity[]; count: number; query?: string }
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

  const handleClearSearch = () => {
    setSearchQuery("")
    setSelectedTag(null)
  }

  const getScoreBadgeClass = (score: number) => {
    if (score >= 85) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
    if (score >= 70) return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30"
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
  }

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "remoteok":
        return { label: "RemoteOK", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" }
      case "arbeitnow":
        return { label: "Arbeitnow", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" }
      case "adzuna":
        return { label: "Adzuna", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" }
      default:
        return { label: "Curated Partner", color: "bg-primary/10 text-primary border-primary/20" }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Search Control Strip */}
      <div className="relative rounded-xl border border-border bg-card p-5 sm:p-7 shadow-xs overflow-hidden">
        <DecorIcon position="top-right" />
        <DecorIcon position="bottom-left" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
                <Compass className="size-4" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Autonomous Job Discovery Hub
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Real-time opportunities dynamically aggregated across verified tech boards, scored against your resume, career knowledge graph, and profile strengths.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Multi-Board Live Engine</span>
            </div>
          </div>
        </div>

        {/* Search Input & Action */}
        <form onSubmit={handleSearchSubmit} className="mt-6 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search roles, companies, or tech stack (e.g. Full Stack Developer, Next.js, Go, Python)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 text-xs sm:text-sm h-11 bg-background"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded-full hover:bg-muted"
                title="Clear input"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading || isRefetching} className="h-11 text-xs px-5 gap-1.5 cursor-pointer font-medium">
              <Filter className="size-3.5" />
              <span>Search Roles</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              className="h-11 px-3.5 cursor-pointer"
              title="Refresh job feed"
            >
              <RefreshCw className={cn("size-4", (isLoading || isRefetching) && "animate-spin")} />
            </Button>
          </div>
        </form>

        {/* Skill Pills */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 pt-3 border-t border-border/60">
          <span className="text-[11px] font-semibold text-muted-foreground mr-1 flex items-center gap-1">
            <Layers className="size-3" />
            <span>Quick filters:</span>
          </span>
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
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer border",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border-border/60"
                )}
              >
                {tag}
              </button>
            )
          })}
          {(selectedTag || searchQuery) && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-[11px] text-muted-foreground hover:text-foreground underline ml-1 cursor-pointer font-medium"
            >
              Reset all
            </button>
          )}
        </div>
      </div>

      {/* Results Header Bar */}
      {!isLoading && opportunities.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">
              {opportunities.length} Positions Available
            </span>
            {selectedTag && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-normal">
                Filtered: {selectedTag}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <BrainCircuit className="size-3.5 text-primary" />
            <span>Ranked by AI Fit Score</span>
          </div>
        </div>
      )}

      {/* Opportunities Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="h-60 rounded-xl border border-border bg-card p-5 animate-pulse space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted/60 rounded w-1/3" />
                <div className="h-12 bg-muted/40 rounded w-full mt-3" />
              </div>
              <div className="h-9 bg-muted/50 rounded w-full" />
            </div>
          ))}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="relative rounded-xl border border-dashed border-border p-10 sm:p-14 text-center bg-card shadow-xs">
          <DecorIcon position="top-right" />
          <DecorIcon position="bottom-left" />

          <div className="mx-auto size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary">
            <Briefcase className="size-6" />
          </div>

          <h3 className="text-base font-bold text-foreground">
            No matching opportunities found
          </h3>

          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
            {searchQuery || selectedTag ? (
              <>
                We couldn&apos;t find roles matching{" "}
                <span className="font-semibold text-foreground">
                  &ldquo;{searchQuery || selectedTag}&rdquo;
                </span>
                . Try a broader search keyword or select one of the suggested roles below.
              </>
            ) : (
              "No live opportunities currently returned. Try exploring popular tech categories or refreshing the live feed."
            )}
          </p>

          {/* Quick suggestions */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto">
            <span className="text-xs text-muted-foreground mr-1">Try searching:</span>
            {["Full Stack", "React", "Backend", "AI Systems", "Go"].map((keyword) => (
              <Button
                key={keyword}
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery(keyword)
                  setSelectedTag(null)
                }}
                className="h-7 text-xs px-2.5 rounded-md cursor-pointer"
              >
                {keyword}
              </Button>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <Button
              variant="default"
              size="sm"
              onClick={handleClearSearch}
              className="text-xs px-4 cursor-pointer"
            >
              Browse All Roles
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="text-xs px-3 cursor-pointer"
            >
              <RefreshCw className="size-3.5 mr-1" />
              Refresh Feed
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {opportunities.map((job) => {
            const isSaved = savedJobs.has(job.id)
            const isSaving = saveMutation.isPending && saveMutation.variables?.id === job.id
            const sourceBadge = getSourceBadge(job.sourceBoard)

            return (
              <DashboardCard
                key={job.id}
                className="flex flex-col justify-between p-4 sm:p-5 hover:border-primary/40 transition-all group relative bg-card shadow-xs rounded-xl"
              >
                <div>
                  {/* Top Row: Company & Fit Score Badge */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="size-8 rounded-lg bg-muted flex items-center justify-center font-bold text-xs text-foreground shrink-0 border border-border">
                        {job.company.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-muted-foreground block truncate">
                          {job.company}
                        </span>
                        <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2 mt-0.5 group-hover:text-primary transition-colors">
                          {job.title}
                        </h3>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 border shadow-2xs",
                        getScoreBadgeClass(job.fitScore)
                      )}
                      title="AI Fit Score calculated from your resume and knowledge graph"
                    >
                      <BrainCircuit className="size-3" />
                      <span>{job.fitScore}% Match</span>
                    </div>
                  </div>

                  {/* Metadata Row: Location, Board & Salary */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground mb-3 font-medium">
                    <span className="inline-flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded text-[11px] border border-border/50">
                      <MapPin className="size-3 shrink-0 text-muted-foreground" />
                      <span className="truncate max-w-[110px]">{job.location}</span>
                    </span>

                    <span className={cn("inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-medium border", sourceBadge.color)}>
                      <Globe className="size-2.5" />
                      <span>{sourceBadge.label}</span>
                    </span>

                    {job.salary && (
                      <span className="inline-flex items-center gap-0.5 text-foreground font-mono text-[11px] bg-muted/80 px-2 py-0.5 rounded border border-border/60">
                        <DollarSign className="size-3 shrink-0 text-emerald-500" />
                        <span>{job.salary}</span>
                      </span>
                    )}
                  </div>

                  {/* AI Match Rationale */}
                  <div className="rounded-lg bg-muted/30 p-2.5 border border-border/60 text-[11px] text-muted-foreground mb-3 leading-relaxed">
                    <p className="font-semibold text-foreground line-clamp-1 flex items-center gap-1 mb-0.5">
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
                          className="text-[10px] px-1.5 py-0 font-normal h-4.5 bg-muted/70 hover:bg-muted"
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
                <div className="pt-3 border-t border-border/70 flex items-center justify-between gap-2 mt-auto">
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
                    className="h-8 text-xs gap-1.5 cursor-pointer font-medium"
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

