import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Application, ApplicationQueryFilters } from "./application.types"

interface ApplicationsResponse {
  data: Application[]
  total: number
}

export function useApplications(filters: ApplicationQueryFilters) {
  return useQuery({
    queryKey: ["applications", filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.search) params.set("search", filters.search)
      if (filters.status) params.set("status", filters.status)
      if (filters.source) params.set("source", filters.source)
      if (filters.sort) params.set("sort", filters.sort)
      if (filters.tag) params.set("tag", filters.tag)
      params.set("pageSize", "100")

      const res = await fetch(`/api/applications?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to load applications")
      const json = await res.json()
      return { data: json.data || [], total: json.total || 0 }
    },
    staleTime: 30_000,
  })
}

export function useApplication(id: string | null) {
  return useQuery({
    queryKey: ["application", id],
    queryFn: async () => {
      const res = await fetch(`/api/applications/${id}`)
      if (!res.ok) throw new Error("Failed to load application")
      return res.json()
    },
    enabled: !!id,
  })
}

export function useMoveApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error("Failed to move")
      return res.json()
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["applications"] })
      const prev = qc.getQueriesData({ queryKey: ["applications"] })
      qc.setQueriesData({ queryKey: ["applications"] }, (old: ApplicationsResponse | undefined) => {
        if (!old?.data) return old
        return { ...old, data: old.data.map((a) => (a.id === id ? { ...a, status } : a)) }
      })
      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        context.prev.forEach(([key, data]) => qc.setQueryData(key, data))
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["applications"] })
      qc.invalidateQueries({ queryKey: ["stats"] })
    },
  })
}

export function useDeleteApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/applications/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["applications"] })
      const prev = qc.getQueriesData({ queryKey: ["applications"] })
      qc.setQueriesData({ queryKey: ["applications"] }, (old: ApplicationsResponse | undefined) => {
        if (!old?.data) return old
        return { ...old, data: old.data.filter((a) => a.id !== id) }
      })
      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        context.prev.forEach(([key, data]) => qc.setQueryData(key, data))
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["applications"] })
      qc.invalidateQueries({ queryKey: ["stats"] })
    },
  })
}

export function useCreateApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to create")
      return res.json()
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["applications"] })
      qc.invalidateQueries({ queryKey: ["stats"] })
    },
  })
}

export function useUpdateApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to update")
      return res.json()
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["applications"] })
      qc.invalidateQueries({ queryKey: ["stats"] })
    },
  })
}

export function useApplicationAnalysis(applicationId: string | null) {
  return useQuery({
    queryKey: ["application-analysis", applicationId],
    queryFn: async () => {
      const res = await fetch(`/api/applications/${applicationId}/analysis`)
      if (!res.ok) throw new Error("Failed to load analysis")
      return res.json()
    },
    enabled: !!applicationId,
    staleTime: 60_000,
  })
}
