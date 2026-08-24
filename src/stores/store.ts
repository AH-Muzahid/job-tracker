import { create } from "zustand"

export type AIMode =
  | "profile" | "jd-scan" | "application" | "tracker"
  | "response" | "interview" | "weekly" | "recovery" | "general"

export interface AISession {
  id: string
  mode: string | null
  title: string | null
  createdAt: string
  updatedAt: string
}

interface AIState {
  sessions: AISession[]
  sessionsLoading: boolean
  activeChatId: string | null
  setSessions: (sessions: AISession[]) => void
  setSessionsLoading: (v: boolean) => void
  setActiveChatId: (id: string | null) => void
}

interface UIState {
  // Sidebar
  collapsed: boolean
  mobileOpen: boolean
  toggleCollapsed: () => void
  setMobileOpen: (open: boolean) => void

  // Theme
  dark: boolean
  toggleTheme: () => void
  initTheme: () => void

  // Search
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void

  // AI Sidebar
  aiSidebarOpen: boolean
  setAiSidebarOpen: (open: boolean) => void
  pendingPrompt: string | null
  setPendingPrompt: (prompt: string | null) => void

  // Modals
  detailModal: { open: boolean; id: string | null }
  formModal: { open: boolean; editId?: string }
  deleteModal: { open: boolean; id: string | null }
  setDetailModal: (open: boolean, id?: string | null) => void
  setFormModal: (open: boolean, editId?: string) => void
  setDeleteModal: (open: boolean, id?: string | null) => void
}

export const useUI = create<UIState>((set) => ({
  // Sidebar
  collapsed: false,
  mobileOpen: false,
  toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
  setMobileOpen: (open) => set({ mobileOpen: open }),

  // Theme
  dark: false,
  toggleTheme: () =>
    set((s) => {
      const next = !s.dark
      document.documentElement.classList.toggle("dark", next)
      localStorage.setItem("theme", next ? "dark" : "light")
      return { dark: next }
    }),
  initTheme: () => {
    const stored = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const isDark = stored ? stored === "dark" : prefersDark
    document.documentElement.classList.toggle("dark", isDark)
    set({ dark: isDark })
  },

  // Search
  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),

  // AI Sidebar
  aiSidebarOpen: false,
  setAiSidebarOpen: (open) => set({ aiSidebarOpen: open }),
  pendingPrompt: null,
  setPendingPrompt: (prompt) => set({ pendingPrompt: prompt }),

  // Modals
  detailModal: { open: false, id: null },
  formModal: { open: false },
  deleteModal: { open: false, id: null },
  setDetailModal: (open, id = null) => set({ detailModal: { open, id } }),
  setFormModal: (open, editId) => set({ formModal: open ? { open, editId } : { open: false } }),
  setDeleteModal: (open, id = null) => set({ deleteModal: { open, id } }),
}))

export const useAI = create<AIState>((set) => ({
  sessions: [],
  sessionsLoading: false,
  activeChatId: null,
  setSessions: (sessions) => set({ sessions }),
  setSessionsLoading: (v) => set({ sessionsLoading: v }),
  setActiveChatId: (id) => set({ activeChatId: id }),
}))
