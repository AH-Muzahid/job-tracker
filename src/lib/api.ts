import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export {
  useApplications,
  useApplication,
  useMoveApplication,
  useDeleteApplication,
  useCreateApplication,
  useUpdateApplication,
  useApplicationAnalysis,
} from "@/features/applications"



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

