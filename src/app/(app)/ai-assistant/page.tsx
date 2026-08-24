"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { MessageSquare, Plus, Bot } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import AIChat from "@/components/ai/AIChat"
import SidebarNav from "@/components/ai/SidebarNav"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface ChatSession {
  id: string
  title: string
  mode: string | null
  updatedAt: string
  _count: { messages: number }
}

export default function AIAssistantPage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [mobileSessionOpen, setMobileSessionOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const { data: sessions = [], isLoading: loading } = useQuery({
    queryKey: ["ai", "sessions"],
    queryFn: async () => {
      const res = await fetch("/api/ai/sessions")
      if (res.ok) return (await res.json()) as ChatSession[]
      return []
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in")
    }
  }, [isLoaded, isSignedIn, router])

  useEffect(() => {
    const saved = localStorage.getItem("ai-sidebar-collapsed")
    if (saved === "true") setSidebarCollapsed(true)

    // Restore active chat from URL or localStorage
    const params = new URLSearchParams(window.location.search)
    const urlId = params.get("id")
    const storedId = localStorage.getItem("last-active-chat")
    if (urlId) {
      setActiveId(urlId)
    } else if (storedId) {
      setActiveId(storedId)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const currentUrlId = params.get("id")

    if (activeId && currentUrlId !== activeId) {
      window.history.replaceState(null, "", `/ai-assistant?id=${activeId}`)
      localStorage.setItem("last-active-chat", activeId)
    } else if (!activeId && currentUrlId) {
      window.history.replaceState(null, "", `/ai-assistant`)
      localStorage.removeItem("last-active-chat")
    }
  }, [activeId])

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/ai/sessions/${id}`, { method: "DELETE" })
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData<ChatSession[]>(["ai", "sessions"], (old = []) =>
        old.filter((s) => s.id !== id)
      )
      if (activeId === id) setActiveId(null)
    },
  })

  function deleteSession(id: string) {
    deleteMutation.mutate(id)
  }

  const handleSessionCreated = useCallback((id: string) => {
    setActiveId(id)
    queryClient.invalidateQueries({ queryKey: ["ai", "sessions"] })
    setMobileSessionOpen(false)
  }, [queryClient])

  const visibleSessions = sessions.filter(
    (s) => s._count.messages > 0 && s.title !== "New Chat"
  )

  const recentsList = visibleSessions.map((s) => ({
    id: s.id,
    label: s.title,
  }))

  const activeSessionTitle = sessions.find((s) => s.id === activeId)?.title ?? null

  const workspaceName = user?.fullName || user?.firstName || "CareerTrack AI"
  const workspaceMonogram = (workspaceName.charAt(0) || "C").toUpperCase()

  if (!isLoaded || loading) {
    return (
      <div className="flex h-[calc(100vh-3rem)] gap-4 p-4">
        <div className="hidden md:flex w-56 flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
        </div>
        <div className="flex-1"><Skeleton className="h-full rounded-xl" /></div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] overflow-hidden">
      {/* Mobile session toggle */}
      <Button
        size="icon"
        className="md:hidden fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg cursor-pointer"
        onClick={() => setMobileSessionOpen(!mobileSessionOpen)}
        aria-label="Open chat history"
      >
        <MessageSquare className="h-5 w-5" />
      </Button>

      {/* Desktop sidebar with custom motion & micro-interactions */}
      <div className="hidden md:flex shrink-0">
        <SidebarNav
          fill={true}
          activeId={activeId}
          activeTitle={activeSessionTitle}
          recents={recentsList}
          onPick={(id) => setActiveId(id)}
          onNewChat={() => setActiveId(null)}
          onDeleteChat={deleteSession}
          collapsed={sidebarCollapsed}
          onToggleCollapse={(val) => {
            setSidebarCollapsed(val)
            localStorage.setItem("ai-sidebar-collapsed", String(val))
          }}
          workspaceName={workspaceName}
          workspaceMonogram={workspaceMonogram}
          footerLabel="Configure AI"
          onFooterClick={() => router.push("/settings")}
        />
      </div>

      {/* Mobile Sidebar Sheet */}
      <div
        className={`fixed inset-y-0 left-0 z-40 md:hidden transition-transform duration-200 ${
          mobileSessionOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarNav
          fill={true}
          className="h-full shadow-2xl"
          activeId={activeId}
          activeTitle={activeSessionTitle}
          recents={recentsList}
          onPick={(id) => {
            setActiveId(id)
            setMobileSessionOpen(false)
          }}
          onNewChat={() => {
            setActiveId(null)
            setMobileSessionOpen(false)
          }}
          onDeleteChat={deleteSession}
          collapsed={false}
          workspaceName={workspaceName}
          workspaceMonogram={workspaceMonogram}
          footerLabel="Configure AI"
          onFooterClick={() => {
            setMobileSessionOpen(false)
            router.push("/settings")
          }}
        />
      </div>

      {/* Main Chat area */}
      <main role="main" aria-label="AI Conversation Workspace" className="flex-1 flex flex-col min-w-0 relative overflow-hidden bg-background">
        {/* Top Header */}
        <div className="h-12 border-b border-border/50 px-3 sm:px-4 flex items-center justify-between bg-card/40 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMobileSessionOpen(true)}
              className="md:hidden h-8 w-8 rounded-lg border-border text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
              title="Chat History"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1 rounded-md bg-purple-500/10 text-purple-500 border border-purple-500/20 shrink-0">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-foreground truncate max-w-[160px] sm:max-w-md">
                {activeSessionTitle || "New Conversation"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setActiveId(null); setMobileSessionOpen(false) }}
                className="h-7 text-xs px-2.5 rounded-lg border-border text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Plus className="h-3 w-3 mr-1" />
                New Chat
              </Button>
            )}
            <Badge variant="outline" className="text-[10px] font-mono border-border/60 bg-muted/40 px-2 py-0.5">
              {activeId ? "Active Chat" : "Ready"}
            </Badge>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <AIChat sessionId={activeId} onSessionCreated={handleSessionCreated} />
        </div>
      </main>

      {/* Mobile overlay */}
      {mobileSessionOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileSessionOpen(false)}
        />
      )}
    </div>
  )
}
