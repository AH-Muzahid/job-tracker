"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useUserProfile } from "@/lib/api"
import type { DiscoveryFilters, SortOption, BatchSummary } from "@/components/discovery/types"
import type { ExternalJobOpportunity } from "@/lib/ai/graph/tools/discovery-tools"

export interface DiscoveryApiResponse {
  count: number
  nextBatchAt: string
  currentBatchStartedAt: string
  batchSummary: BatchSummary
  opportunities: ExternalJobOpportunity[]
}

export function parseSalary(s?: string): number {
  if (!s) return 0
  const match = s.replace(/,/g, "").match(/\d+/)
  return match ? parseInt(match[0]) : 0
}

export function useJobDiscovery() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<DiscoveryFilters>({
    source: "",
    location: "",
    minScore: "",
    visaSponsorship: "",
    batchSlot: "",
    tags: [],
    hideApplied: false,
  })
  const [sortBy, setSortBy] = useState<SortOption>("score-desc")
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set())
  const [dismissedJobIds, setDismissedJobIds] = useState<Set<string>>(new Set())
  const [dismissModalJob, setDismissModalJob] = useState<ExternalJobOpportunity | null>(null)
  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false)
  const [trackModalJob, setTrackModalJob] = useState<ExternalJobOpportunity | null>(null)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const queryClient = useQueryClient()

  // Fetch active user profile search preferences
  const { data: userProfile, refetch: refetchProfile } = useUserProfile()

  // Fetch 24-hour rolling window opportunities
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["discovery", "feed"],
    queryFn: async () => {
      const res = await fetch("/api/jobs/discover?limit=60")
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error || "Failed to discover jobs")
      }
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
        if (min === 90 && job.fitScore < 90) return false
        if (min === 75 && (job.fitScore < 75 || job.fitScore >= 90)) return false
        if (min === 50 && (job.fitScore < 50 || job.fitScore >= 75)) return false
        if (min === 0 && job.fitScore >= 50) return false
      }
      if (filters.visaSponsorship && job.visaSponsorship !== filters.visaSponsorship) return false
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
        case "newest": {
          const timeA = new Date(a.postedAt || a.publishedAt || 0).getTime()
          const timeB = new Date(b.postedAt || b.publishedAt || 0).getTime()
          return timeB - timeA
        }
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
          jobId: job.jobId || job.id,
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

  const handleApplyClick = useCallback((job: ExternalJobOpportunity) => {
    fetch("/api/jobs/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "track_click",
        jobId: job.jobId || job.id,
        companyName: job.company,
        jobTitle: job.title,
        clickType: "external_link",
      }),
    }).catch(() => {})

    if (job.appliedStatus) return
    setTrackModalJob(job)
  }, [])

  const forceRefreshMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/jobs/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error || "Failed to sync fresh batch")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery"] })
      toast.success("Fresh job batch generated and scored!")
    },
    onError: (err: Error) => toast.error(err?.message || "Failed to sync fresh batch"),
  })

  const dismissMutation = useMutation({
    mutationFn: async ({ job, reason }: { job: ExternalJobOpportunity; reason: string }) => {
      const res = await fetch("/api/jobs/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dismiss",
          jobId: job.jobId || job.id,
          companyName: job.company,
          jobTitle: job.title,
          dismissReason: reason,
        }),
      })
      if (!res.ok) throw new Error("Failed to dismiss job")
      return res.json()
    },
    onMutate: ({ job }) => {
      setDismissedJobIds((prev) => new Set(prev).add(job.id))
    },
    onSuccess: (_, { job }) => {
      toast.success(`"${job.title}" hidden from your feed`, {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: async () => {
            setDismissedJobIds((prev) => {
              const next = new Set(prev)
              next.delete(job.id)
              return next
            })
            try {
              await fetch("/api/jobs/discover", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "undismiss",
                  jobId: job.jobId || job.id,
                  companyName: job.company,
                  jobTitle: job.title,
                }),
              })
              queryClient.invalidateQueries({ queryKey: ["discovery"] })
              toast.success(`"${job.title}" restored to your feed`)
            } catch {
              toast.error("Failed to restore job")
            }
          },
        },
      })
    },
    onError: (err: Error, { job }) => {
      setDismissedJobIds((prev) => {
        const next = new Set(prev)
        next.delete(job.id)
        return next
      })
      toast.error(err?.message || "Failed to dismiss job")
    },
  })

  const activeFiltersCount =
    (filters.source ? 1 : 0) +
    (filters.location ? 1 : 0) +
    (filters.minScore ? 1 : 0) +
    (filters.visaSponsorship ? 1 : 0) +
    (filters.batchSlot ? 1 : 0) +
    (filters.hideApplied ? 1 : 0) +
    filters.tags.length

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    refetch()
  }

  const clearAllFilters = useCallback(() => {
    setSearchQuery("")
    setFilters({ source: "", location: "", minScore: "", batchSlot: "", tags: [], hideApplied: false })
  }, [])

  return {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    savedJobs,
    dismissedJobIds,
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
    data,
    isLoading,
    isRefetching,
    refetch,
    allOpportunities,
    filteredOpportunities,
    sortedOpportunities,
    activeFiltersCount,
    saveMutation,
    forceRefreshMutation,
    dismissMutation,
    handleApplyClick,
    handleSearchSubmit,
    clearAllFilters,
    queryClient,
  }
}
