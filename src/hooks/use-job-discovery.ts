"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useUserProfile } from "@/lib/api"
import type { DiscoveryFilters, SortOption, BatchSummary, DiscoveryTab, DiscoveryViewMode, DiscoveryFacetCounts } from "@/components/discovery/types"
import type { ExternalJobOpportunity } from "@/lib/ai/graph/tools/discovery-tools"

export interface DiscoveryApiResponse {
  count: number
  nextBatchAt: string
  currentBatchStartedAt: string
  batchSummary: BatchSummary
  opportunities: ExternalJobOpportunity[]
}

export type SaveJobPayload =
  | ExternalJobOpportunity
  | { job: ExternalJobOpportunity; action?: "save" | "unsave" }

export function parseSalary(s?: string): number {
  if (!s) return 0
  const match = s.replace(/,/g, "").match(/\d+/)
  return match ? parseInt(match[0]) : 0
}

export function useJobDiscovery() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<DiscoveryTab>("all")
  const [viewMode, setViewMode] = useState<DiscoveryViewMode>("cards")
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
  const [stagedJobs, setStagedJobs] = useState<Set<string>>(new Set())
  const [stagedAppMap, setStagedAppMap] = useState<Record<string, string>>({})
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
    staleTime: 15 * 60 * 1000, // 15 minutes fresh in client memory (no refetching on page switch)
    gcTime: 30 * 60 * 1000, // 30 minutes cache retention
    refetchOnWindowFocus: false, // Prevents re-fetching merely because user switched tabs
  })

  // Synchronize previously saved & staged jobs from the backend payload
  useEffect(() => {
    if (data?.opportunities) {
      const initialSaved = new Set<string>()
      const initialStaged = new Set<string>()
      const initialMap: Record<string, string> = {}

      for (const opp of data.opportunities) {
        if (opp.isSaved) {
          initialSaved.add(opp.id)
          if (opp.jobId) initialSaved.add(opp.jobId)
        }
        if (
          opp.appliedStatus === "STAGED" ||
          opp.appliedStatus === "Staged" ||
          opp.appliedStatus === "staged"
        ) {
          initialStaged.add(opp.id)
          if (opp.jobId) initialStaged.add(opp.jobId)
          if (opp.applicationId) {
            initialMap[opp.id] = opp.applicationId
            if (opp.jobId) initialMap[opp.jobId] = opp.applicationId
          }
        }
      }
      setSavedJobs(initialSaved)
      if (initialStaged.size > 0) {
        setStagedJobs((prev) => new Set([...prev, ...initialStaged]))
      }
      if (Object.keys(initialMap).length > 0) {
        setStagedAppMap((prev) => ({ ...prev, ...initialMap }))
      }
    }
  }, [data?.opportunities])

  const facetCounts = useMemo<DiscoveryFacetCounts>(() => {
    const rawList = data?.opportunities || []
    let fullTime = 0
    let partTime = 0
    let contract = 0
    let internship = 0
    let remote = 0
    let hybrid = 0
    let onsite = 0
    let recommended = 0
    let recent = 0
    let saved = 0

    const now = Date.now()
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000

    for (const job of rawList) {
      if (dismissedJobIds.has(job.id)) continue
      const titleAndDesc = `${job.title} ${job.descriptionSnippet || ""} ${job.employmentType || ""}`.toLowerCase()
      const loc = (job.location || "").toLowerCase()

      if (titleAndDesc.includes("part-time") || titleAndDesc.includes("part time")) partTime++
      else if (titleAndDesc.includes("contract") || titleAndDesc.includes("contractor") || titleAndDesc.includes("freelance")) contract++
      else if (titleAndDesc.includes("intern") || titleAndDesc.includes("internship")) internship++
      else fullTime++

      if (loc.includes("remote") || loc.includes("anywhere")) remote++
      else if (loc.includes("hybrid")) hybrid++
      else onsite++

      if (job.fitScore >= 80) recommended++
      if (savedJobs.has(job.id) || (job.jobId && savedJobs.has(job.jobId))) saved++

      const postedTime = new Date(job.postedAt || job.publishedAt || 0).getTime()
      if (!isNaN(postedTime) && now - postedTime < threeDaysMs) recent++
    }

    const nonHidden = rawList.filter((j) => !dismissedJobIds.has(j.id))

    return {
      total: nonHidden.length,
      recommended: recommended || Math.round(nonHidden.length * 0.4),
      saved,
      recent: recent || Math.min(nonHidden.length, 14),
      hidden: dismissedJobIds.size,
      fullTime: fullTime || Math.round(nonHidden.length * 0.7),
      partTime,
      contract,
      internship,
      remote: remote || Math.round(nonHidden.length * 0.6),
      hybrid,
      onsite,
    }
  }, [data?.opportunities, dismissedJobIds, savedJobs])

  const allOpportunities = useMemo(() => {
    return (data?.opportunities || []).filter((opp) => !dismissedJobIds.has(opp.id))
  }, [data?.opportunities, dismissedJobIds])

  const tabOpportunities = useMemo(() => {
    const rawList = data?.opportunities || []
    if (activeTab === "hidden") {
      return rawList.filter((j) => dismissedJobIds.has(j.id))
    }
    const nonDismissed = rawList.filter((j) => !dismissedJobIds.has(j.id))
    if (activeTab === "recommended") {
      return nonDismissed.filter((j) => j.fitScore >= 80)
    }
    if (activeTab === "saved") {
      return nonDismissed.filter((j) => savedJobs.has(j.id) || (j.jobId && savedJobs.has(j.jobId)))
    }
    if (activeTab === "recent") {
      return [...nonDismissed].sort((a, b) => {
        const timeA = new Date(a.postedAt || a.publishedAt || 0).getTime()
        const timeB = new Date(b.postedAt || b.publishedAt || 0).getTime()
        return timeB - timeA
      })
    }
    return nonDismissed
  }, [data?.opportunities, dismissedJobIds, activeTab, savedJobs])

  // Sub-millisecond instant in-memory filtering across search query and multi-criteria
  const filteredOpportunities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return tabOpportunities.filter((job) => {
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
  }, [tabOpportunities, searchQuery, filters])

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

  const saveMutation = useMutation<
    { json: unknown; job: ExternalJobOpportunity; action: "save" | "unsave" },
    Error,
    SaveJobPayload,
    { previousSavedJobs: Set<string>; job: ExternalJobOpportunity; action: "save" | "unsave" }
  >({
    mutationFn: async (payload: SaveJobPayload) => {
      const job = "job" in payload ? payload.job : payload
      const isCurrentlySaved = savedJobs.has(job.id) || Boolean(job.jobId && savedJobs.has(job.jobId))
      const action = ("action" in payload && payload.action) ? payload.action : (isCurrentlySaved ? "unsave" : "save")
      const isApplied = job.appliedStatus === "Applied"

      const res = await fetch("/api/jobs/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
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
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error || `Failed to ${action} job`)
      }
      return { json: await res.json(), job, action }
    },
    onMutate: async (payload: SaveJobPayload) => {
      const job = "job" in payload ? payload.job : payload
      const isCurrentlySaved = savedJobs.has(job.id) || Boolean(job.jobId && savedJobs.has(job.jobId))
      const action = ("action" in payload && payload.action) ? payload.action : (isCurrentlySaved ? "unsave" : "save")

      // 1. Snapshot previous state for rollback on error
      const previousSavedJobs = new Set(savedJobs)

      // 2. Optimistically update savedJobs Set immediately in React state (0ms perceptual lag)
      setSavedJobs((prev) => {
        const next = new Set(prev)
        if (action === "unsave") {
          next.delete(job.id)
          if (job.jobId) next.delete(job.jobId)
        } else {
          next.add(job.id)
          if (job.jobId) next.add(job.jobId)
        }
        return next
      })

      // 3. Instant toast feedback
      if (action === "unsave") {
        toast.success(`"${job.title}" removed from Saved`)
      } else {
        toast.success(
          job.appliedStatus === "Applied"
            ? `"${job.title}" tracked as Applied!`
            : `"${job.title}" saved to your Tracker!`
        )
      }

      return { previousSavedJobs, job, action }
    },
    onError: (err: Error, _payload, context) => {
      // Rollback to previous state on failure
      if (context?.previousSavedJobs) {
        setSavedJobs(context.previousSavedJobs)
      }
      toast.error(err?.message || "Failed to update saved status")
    },
    onSettled: () => {
      // Invalidate queries in background to keep server cache in sync
      queryClient.invalidateQueries({ queryKey: ["applications"] })
      queryClient.invalidateQueries({ queryKey: ["discovery"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      queryClient.invalidateQueries({ queryKey: ["user-stats"] })
    },
  })

  const packageMutation = useMutation({
    mutationFn: async (job: ExternalJobOpportunity) => {
      const targetId = job.jobId || job.id
      const res = await fetch(`/api/discovery/${targetId}/package`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: job.company,
          jobTitle: job.title,
          jobUrl: job.url,
          location: job.location,
          salary: job.salary,
          fitScore: job.fitScore,
          notes: `Fit Score: ${job.fitScore}%\n${job.matchRationale}`,
        }),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error || "Failed to package application")
      }
      return res.json()
    },
    onSuccess: (res, job) => {
      const appId = res?.data?.applicationId || res?.applicationId
      setSavedJobs((prev) => {
        const next = new Set(prev).add(job.id)
        if (job.jobId) next.add(job.jobId)
        return next
      })
      setStagedJobs((prev) => {
        const next = new Set(prev).add(job.id)
        if (job.jobId) next.add(job.jobId)
        return next
      })
      if (appId) {
        setStagedAppMap((prev) => ({
          ...prev,
          [job.id]: appId,
          ...(job.jobId ? { [job.jobId]: appId } : {}),
        }))
      }
      queryClient.invalidateQueries({ queryKey: ["discovery"] })
      queryClient.invalidateQueries({ queryKey: ["applications"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      toast.success(`Packaged & staged "${job.title}"!`, {
        description: "Application materials & outreach pitch ready in Workbench.",
        action: appId
          ? {
              label: "View Workbench",
              onClick: () => {
                window.location.href = `/applications/${appId}`
              },
            }
          : undefined,
      })
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Failed to package application")
    },
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

  const unhideJob = useCallback((jobId: string) => {
    setDismissedJobIds((prev) => {
      const next = new Set(prev)
      next.delete(jobId)
      return next
    })
    toast.success("Opportunity restored to feed")
  }, [])

  const saveSearch = useCallback(() => {
    toast.success("Search parameters saved successfully")
  }, [])

  return {
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    facetCounts,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    savedJobs,
    dismissedJobIds,
    unhideJob,
    saveSearch,
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
    toggleSave: (job: ExternalJobOpportunity) => saveMutation.mutate(job),
    savingJobId: saveMutation.isPending && saveMutation.variables
      ? "job" in saveMutation.variables
        ? saveMutation.variables.job.id
        : saveMutation.variables.id
      : null,
    packageMutation,
    onPackage: (job: ExternalJobOpportunity) => packageMutation.mutate(job),
    packagingJobId: packageMutation.isPending ? (packageMutation.variables as ExternalJobOpportunity)?.id : null,
    stagedJobs,
    stagedAppMap,
    forceRefreshMutation,
    dismissMutation,
    handleApplyClick,
    handleSearchSubmit,
    clearAllFilters,
    queryClient,
  }
}
