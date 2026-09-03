"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Search, X, RefreshCw, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { DiscoveryStatRow } from "./DiscoveryStatRow"
import { DiscoveryFilterSidebar } from "./DiscoveryFilterSidebar"
import { DiscoverySortDropdown } from "./DiscoverySortDropdown"
import { DiscoveryJobList } from "./DiscoveryJobList"
import { DiscoveryBatchTimer } from "./DiscoveryBatchTimer"
import { DiscoveryPreferencesModal } from "./DiscoveryPreferencesModal"
import { useUserProfile } from "@/lib/api"
import type { DiscoveryFilters, SortOption, BatchSummary } from "./types"
import type { ExternalJobOpportunity } from "@/lib/ai/graph/tools/discovery-tools"

interface DiscoveryApiResponse {
  count: number
  nextBatchAt: string
  currentBatchStartedAt: string
  batchSummary: BatchSummary
  opportunities: ExternalJobOpportunity[]
}

export function DiscoveryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<DiscoveryFilters>({
    source: "",
    location: "",
    minScore: "",
    batchSlot: "",
    tags: [],
    hideApplied: false,
  })
  const [sortBy, setSortBy] = useState<SortOption>("score-desc")
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set())
  const [dismissedJobIds, setDismissedJobIds] = useState<Set<string>>(new Set())
  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false)
  const queryClient = useQueryClient()

  // Fetch active user profile search preferences
  const { data: userProfile, refetch: refetchProfile } = useUserProfile()

  // Fetch 24-hour rolling window opportunities (instant client-side search without network flooding)
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["discovery", "feed"],
    queryFn: async () => {
      const res = await fetch("/api/jobs/discover?limit=60")
      if (!res.ok) throw new Error("Failed to discover jobs")
      const json = await res.json()
      return json.data as DiscoveryApiResponse
    },
    staleTime: 60_000,
  })

  // Synchronize previously saved jobs from the backend payload
  useEffect(() => {
    if (data?.opportunities) {
      const initialSaved = new Set<string>()
      for (const opp of data.opportunities) {
        if (opp.isSaved) {
          initialSaved.add(opp.id)
        }
      }
      if (initialSaved.size > 0) {
        setSavedJobs((prev) => new Set([...prev, ...initialSaved]))
      }
    }
  }, [data?.opportunities])

  const allOpportunities = useMemo(() => {
    return (data?.opportunities || []).filter((opp) => !dismissedJobIds.has(opp.id))
  }, [data?.opportunities, dismissedJobIds])

  // Sub-millisecond instant in-memory filtering across search query and multi-criteria
  const filteredOpportunities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return allOpportunities.filter((job) => {
      if (filters.hideApplied && job.appliedStatus) return false
      if (q) {
        const target = `${job.title} ${job.company} ${job.location} ${(job.tags || []).join(" ")}`.toLowerCase()
        if (!target.includes(q)) return false
      }
      if (filters.batchSlot && job.batchSlot !== filters.batchSlot) return false
      if (filters.source && job.sourceBoard !== filters.source) return false
      if (filters.location) {
        const loc = job.location.toLowerCase()
        const isRemote = loc.includes("remote") || loc.includes("anywhere")
        const isHybrid = loc.includes("hybrid")
        if (filters.location === "remote" && !isRemote) return false
        if (filters.location === "hybrid" && !isHybrid) return false
        if (filters.location === "onsite" && (isRemote || isHybrid)) return false
      }
      if (filters.minScore) {
        const min = parseInt(filters.minScore)
        if (min === 85 && job.fitScore < 85) return false
        if (min === 70 && (job.fitScore < 70 || job.fitScore >= 85)) return false
        if (min === 0 && job.fitScore >= 70) return false
      }
      if (filters.tags.length > 0) {
        const jobTags = job.tags?.map((t) => t.toLowerCase()) || []
        if (!filters.tags.some((t) => jobTags.includes(t.toLowerCase()))) return false
      }
      return true
    })
  }, [allOpportunities, searchQuery, filters])

  // Memoized sorting
  const sortedOpportunities = useMemo(() => {
    return [...filteredOpportunities].sort((a, b) => {
      switch (sortBy) {
        case "score-desc": return b.fitScore - a.fitScore
        case "score-asc": return a.fitScore - b.fitScore
        case "salary-desc": return parseSalary(b.salary) - parseSalary(a.salary)
        case "salary-asc": return parseSalary(a.salary) - parseSalary(b.salary)
        default: return 0
      }
    })
  }, [filteredOpportunities, sortBy])

  const saveMutation = useMutation({
    mutationFn: async (job: ExternalJobOpportunity) => {
      const isApplied = job.appliedStatus === "Applied"
      const res = await fetch("/api/jobs/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          jobId: job.id,
          companyName: job.company,
          jobTitle: job.title,
          jobUrl: job.url,
          location: job.location,
          salary: job.salary,
          status: isApplied ? "Applied" : "Saved",
          notes: `Fit Score: ${job.fitScore}%\n${job.matchRationale}`,
        }),
      })
      if (!res.ok) throw new Error("Failed to save job to tracker")
      return res.json()
    },
    onSuccess: (_, job) => {
      setSavedJobs((prev) => new Set(prev).add(job.id))
      queryClient.invalidateQueries({ queryKey: ["applications"] })
      queryClient.invalidateQueries({ queryKey: ["discovery"] })
      toast.success(
        job.appliedStatus === "Applied"
          ? `"${job.title}" tracked as Applied!`
          : `"${job.title}" saved to your Tracker!`
      )
    },
    onError: (err: Error) => toast.error(err?.message || "Failed to save"),
  })

  const handleApplyClick = useCallback(
    (job: ExternalJobOpportunity) => {
      if (job.appliedStatus) return
      toast.info(`Opening external application for ${job.company}`, {
        description: "Did you apply? Track this application directly in your Tracker.",
        duration: 9000,
        action: {
          label: "Track as Applied",
          onClick: () => {
            saveMutation.mutate({
              ...job,
              appliedStatus: "Applied",
            } as ExternalJobOpportunity)
          },
        },
      })
    },
    [saveMutation]
  )

  const forceRefreshMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/jobs/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      })
      if (!res.ok) throw new Error("Failed to sync fresh batch")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery"] })
      toast.success("Fresh job batch generated and scored!")
    },
    onError: (err: Error) => toast.error(err?.message || "Failed to sync fresh batch"),
  })

  const dismissMutation = useMutation({
    mutationFn: async (job: ExternalJobOpportunity) => {
      const res = await fetch("/api/jobs/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dismiss",
          jobId: job.id,
          companyName: job.company,
          jobTitle: job.title,
        }),
      })
      if (!res.ok) throw new Error("Failed to dismiss job")
      return res.json()
    },
    onMutate: (job) => {
      setDismissedJobIds((prev) => new Set(prev).add(job.id))
    },
    onSuccess: (_, job) => {
      toast(`"${job.title}" hidden from your feed`, {
        action: {
          label: "Undo",
          onClick: async () => {
            setDismissedJobIds((prev) => {
              const next = new Set(prev)
              next.delete(job.id)
              return next
            })
            await fetch("/api/jobs/discover", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "undismiss",
                jobId: job.id,
                companyName: job.company,
                jobTitle: job.title,
              }),
            }).catch(() => {})
            queryClient.invalidateQueries({ queryKey: ["discovery"] })
          },
        },
      })
    },
    onError: (err: Error, job) => {
      setDismissedJobIds((prev) => {
        const next = new Set(prev)
        next.delete(job.id)
        return next
      })
      toast.error(err?.message || "Failed to dismiss job")
    },
  })

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const activeFiltersCount =
    (filters.source ? 1 : 0) +
    (filters.location ? 1 : 0) +
    (filters.minScore ? 1 : 0) +
    (filters.batchSlot ? 1 : 0) +
    (filters.hideApplied ? 1 : 0) +
    filters.tags.length

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    refetch()
  }

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id))
  }, [])

  return (
    <div className="space-y-4">
      {/* Unified Header, Scheduled Release Countdown & 24-Hour Rolling Window Nav */}
      <DiscoveryBatchTimer
        nextBatchAt={data?.nextBatchAt}
        batchSummary={data?.batchSummary}
        activeSlot={filters.batchSlot || ""}
        onSelectSlot={(slot) => setFilters((prev) => ({ ...prev, batchSlot: slot }))}
        onForceRefresh={() => forceRefreshMutation.mutate()}
        isRefreshing={forceRefreshMutation.isPending || isRefetching}
        preferences={userProfile}
        onOpenPreferences={() => setPreferencesModalOpen(true)}
      />

      {/* Stat Row */}
      <DiscoveryStatRow opportunities={allOpportunities} savedJobs={savedJobs} />

      {/* Search + Sort + Filter Bar */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search roles, companies, or tech stack..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-8 text-xs h-8 bg-background rounded-none"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer">
              <X className="h-3 w-3" />
            </button>
          )}
        </form>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Mobile Filter Trigger Sheet */}
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden h-8 text-xs gap-1.5 rounded-none cursor-pointer border-border"
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
                  Filters &amp; Refine
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

          <Button
            type="button"
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="h-8 px-2.5 cursor-pointer rounded-none"
            title="Refresh"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", (isLoading || isRefetching) && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Two-column: Desktop Sidebar + List */}
      <div className="flex gap-6">
        <DiscoveryFilterSidebar
          filters={filters}
          onFilterChange={setFilters}
          className="hidden lg:block w-60 shrink-0 border-r border-border/60 pr-5"
        />
        <div className="flex-1 min-w-0">
          <DiscoveryJobList
            opportunities={sortedOpportunities}
            isLoading={isLoading}
            expandedRowId={expandedRowId}
            savedJobs={savedJobs}
            saveMutation={saveMutation}
            onToggleExpand={handleToggleExpand}
            onSave={(job) => saveMutation.mutate(job)}
            onDismiss={(job) => dismissMutation.mutate(job)}
            dismissingJobId={dismissMutation.variables?.id || null}
            onApplyClick={handleApplyClick}
            onClearAll={() => {
              setSearchQuery("")
              setFilters({ source: "", location: "", minScore: "", batchSlot: "", tags: [], hideApplied: false })
            }}
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
          refetchProfile()
          forceRefreshMutation.mutate()
        }}
      />
    </div>
  )
}

function parseSalary(s?: string): number {
  if (!s) return 0
  const match = s.replace(/,/g, "").match(/\d+/)
  return match ? parseInt(match[0]) : 0
}
