import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Application, DashboardFilters } from "@/components/dashboard/types"

interface ApplicationsResponse {
  data: Application[]
  total: number
}

// ==================== Applications ====================

export function useApplications(filters: DashboardFilters) {
  return useQuery({
    queryKey: ["applications", filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.search) params.set("search", filters.search)
      if (filters.status) params.set("status", filters.status)
      if (filters.source) params.set("source", filters.source)
      if (filters.sort) params.set("sort", filters.sort)
      if (filters.tag) params.set("tag", filters.tag)
      params.set("pageSize", "500")

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
        return { ...old, data: old.data.map((a) => a.id === id ? { ...a, status } : a) }
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

// ==================== Stats ====================

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats")
      if (!res.ok) throw new Error("Failed to load stats")
      return res.json()
    },
    staleTime: 30_000,
  })
}

// ==================== Companies ====================

export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await fetch("/api/companies")
      if (!res.ok) throw new Error("Failed to load companies")
      return res.json()
    },
    staleTime: 60_000,
  })
}

export function useCreateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; industry?: string; website?: string }) => {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to create company")
      return res.json()
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  })
}

export function useDeleteCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/companies/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  })
}

// ==================== Prep Questions ====================

export function usePrepQuestions() {
  return useQuery({
    queryKey: ["prep-questions"],
    queryFn: async () => {
      const res = await fetch("/api/prep-questions")
      if (!res.ok) throw new Error("Failed to load questions")
      return res.json()
    },
    staleTime: 60_000,
  })
}

export function usePrepNotes() {
  return useQuery({
    queryKey: ["prep-notes"],
    queryFn: async (): Promise<unknown[]> => {
      const res = await fetch("/api/prep-notes")
      if (!res.ok) throw new Error("Failed to load notes")
      return res.json()
    },
    staleTime: 60_000,
  })
}

// ==================== Resumes ====================

export function useResumes() {
  return useQuery({
    queryKey: ["resumes"],
    queryFn: async () => {
      const res = await fetch("/api/resumes")
      if (!res.ok) throw new Error("Failed to load resumes")
      return res.json()
    },
    staleTime: 60_000,
  })
}

// ==================== AI Sessions ====================

export function useAISessions() {
  return useQuery({
    queryKey: ["ai-sessions"],
    queryFn: async () => {
      const res = await fetch("/api/ai/sessions")
      if (!res.ok) throw new Error("Failed to load sessions")
      return res.json()
    },
    staleTime: 10_000,
  })
}

export function useCreateAISession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data?: { mode?: string; title?: string }) => {
      const res = await fetch("/api/ai/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data || {}),
      })
      if (!res.ok) throw new Error("Failed to create session")
      return res.json()
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["ai-sessions"] }),
  })
}

export function useDeleteAISession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ai/sessions/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete session")
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["ai-sessions"] }),
  })
}

// ==================== User Profile ====================

export function useUserProfile() {
  return useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile")
      if (!res.ok) throw new Error("Failed to load profile")
      return res.json()
    },
    staleTime: 30_000,
  })
}

export function useUpdateUserProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to update profile")
      return res.json()
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["user-profile"] }),
  })
}

// ==================== Weekly Goals ====================

export function useWeeklyGoals() {
  return useQuery({
    queryKey: ["weekly-goals"],
    queryFn: async () => {
      const res = await fetch("/api/weekly-goals")
      if (!res.ok) throw new Error("Failed to load goals")
      return res.json()
    },
    staleTime: 30_000,
  })
}

export function useCreateWeeklyGoals() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/weekly-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to save goals")
      return res.json()
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["weekly-goals"] }),
  })
}

export function useUpdateWeeklyGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/weekly-goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to update goal")
      return res.json()
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["weekly-goals"] }),
  })
}

export function useDeleteWeeklyGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/weekly-goals/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete goal")
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["weekly-goals"] }),
  })
}

// ==================== Application Analysis ====================

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
