"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { Application, DashboardFilters } from "@/components/dashboard/types"

interface UseApplicationsResult {
  applications: Application[]
  total: number
  loading: boolean
  error: string | null
  refetch: () => void
  silentRefetch: () => void
  optimisticUpdate: (id: string, updates: Partial<Application>) => void
}

export function useApplications(filters: DashboardFilters): UseApplicationsResult {
  const [applications, setApplications] = useState<Application[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchApplications = useCallback(async (silent = false) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    if (!silent) setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    if (filters.search) params.set("search", filters.search)
    if (filters.status) params.set("status", filters.status)
    if (filters.source) params.set("source", filters.source)
    if (filters.sort) params.set("sort", filters.sort)
    if (filters.tag) params.set("tag", filters.tag)
    params.set("pageSize", "500")

    try {
      const res = await fetch(`/api/applications?${params.toString()}`, {
        signal: controller.signal,
      })
      if (!res.ok) throw new Error("Failed to load applications")
      const json = await res.json()

      if (!controller.signal.aborted) {
        setApplications(json.data || [])
        setTotal(json.total || 0)
        setLoading(false)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : "Unknown error")
        setLoading(false)
      }
    }
  }, [filters.search, filters.status, filters.source, filters.sort, filters.tag])

  useEffect(() => {
    fetchApplications()
    return () => abortRef.current?.abort()
  }, [fetchApplications])

  const silentRefetch = useCallback(() => {
    fetchApplications(true)
  }, [fetchApplications])

  const optimisticUpdate = useCallback((id: string, updates: Partial<Application>) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, ...updates } : app))
    )
  }, [])

  return { applications, total, loading, error, refetch: () => fetchApplications(false), silentRefetch, optimisticUpdate }
}
