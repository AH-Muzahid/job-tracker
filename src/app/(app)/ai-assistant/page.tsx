"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { MessageSquare, Trash2, Settings, PanelLeftClose, PanelLeft, Plus, Bot } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import AIChat from "@/components/ai/AIChat"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface ChatSession {
  id: string
  title: string
  mode: string | null
  updatedAt: string
  _count: { messages: number }
}

export default function AIAssistantPage() {
  const { isLoaded, isSignedIn } = useUser()
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

  function toggleSidebar() {
    const next = !sidebarCollapsed
    setSidebarCollapsed(next)
    localStorage.setItem("ai-sidebar-collapsed", String(next))
  }

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

  if (!isLoaded || loading) {
    return (
      <div className="flex h-[calc(100vh-3rem)] gap-4 p-4">
        <div className="hidden md:flex w-64 flex-col gap-2">
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
      >
        <MessageSquare className="h-5 w-5" />
      </Button>

      {/* Sessions sidebar */}
      <aside
        role="complementary"
        aria-label="Chat History Sidebar"
        className={cn(
          "flex flex-col shrink-0 border-r border-border/50 bg-card/40 backdrop-blur-xl transition-all duration-300",
          sidebarCollapsed ? "w-14" : "w-64",
          "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:bg-background max-md:shadow-xl max-md:transition-transform max-md:duration-200",
          mobileSessionOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center border-b border-border/50",
          sidebarCollapsed ? "flex-col gap-2 py-3 px-1" : "justify-between px-3 h-11"
        )}>
          {!sidebarCollapsed && (
            <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">History</span>
          )}
          <div className={cn("flex", sidebarCollapsed ? "flex-col gap-1" : "items-center gap-1")}>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setActiveId(null); setMobileSessionOpen(false) }}
                  className={cn(
                    "rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors",
                    sidebarCollapsed ? "h-8 w-8" : "h-7 w-7"
                  )}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">New chat</TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className={cn(
                    "hidden md:flex rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors",
                    sidebarCollapsed ? "h-8 w-8" : "h-7 w-7"
                  )}
                >
                  {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {visibleSessions.length === 0 && !sidebarCollapsed && (
            <p className="text-xs text-muted-foreground text-center py-8">No chats yet</p>
          )}
          {visibleSessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                "group flex items-center rounded-lg cursor-pointer transition-all",
                sidebarCollapsed ? "justify-center p-2" : "gap-2 px-2.5 py-2",
                activeId === session.id
                  ? "bg-primary/10 text-primary font-bold border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              onClick={() => { setActiveId(session.id); setMobileSessionOpen(false) }}
              title={sidebarCollapsed ? session.title : undefined}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
              {!sidebarCollapsed && (
                <>
                  <span className="truncate flex-1 text-xs">{session.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-transparent transition-opacity shrink-0"
                    onClick={(e) => { e.stopPropagation(); deleteSession(session.id) }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-border/50 p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/settings")}
            className={cn(
              "flex items-center gap-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer",
              sidebarCollapsed ? "justify-center w-full p-2 h-8" : "w-full justify-start px-2.5 py-1.5 h-8"
            )}
          >
            <Settings className="h-3.5 w-3.5 shrink-0" />
            {!sidebarCollapsed && <span>Configure AI</span>}
          </Button>
        </div>
      </aside>

      {/* Chat area */}
      <main role="main" aria-label="AI Conversation Workspace" className="flex-1 flex flex-col min-w-0 relative overflow-hidden bg-background">
        {/* Top Header */}
        <div className="h-11 border-b border-border/50 px-3 flex items-center justify-between bg-card/40 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMobileSessionOpen(true)}
              className="md:hidden h-7 w-7 rounded-lg border-border text-muted-foreground hover:text-foreground"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-purple-500/10 text-purple-500 border border-purple-500/20">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-md">
                {sessions.find((s) => s.id === activeId)?.title || "New Conversation"}
              </span>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono border-border/60 bg-muted/40 px-2 py-0.5">
            Active Chat
          </Badge>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <AIChat sessionId={activeId} onSessionCreated={handleSessionCreated} />
        </div>
      </main>

      {/* Mobile overlay */}
      {mobileSessionOpen && (
        <div className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden" onClick={() => setMobileSessionOpen(false)} />
      )}
    </div>
  )
}
