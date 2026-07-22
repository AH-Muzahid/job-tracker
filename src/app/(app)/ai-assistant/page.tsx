"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { MessageSquare, Trash2, Settings, PanelLeftClose, PanelLeft } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import AIChat from "@/components/ai/AIChat"

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
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileSessionOpen, setMobileSessionOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in")
      return
    }
    if (!isLoaded) return
    fetchSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn])

  useEffect(() => {
    const saved = localStorage.getItem("ai-sidebar-collapsed")
    if (saved === "true") setSidebarCollapsed(true)
  }, [])

  function toggleSidebar() {
    const next = !sidebarCollapsed
    setSidebarCollapsed(next)
    localStorage.setItem("ai-sidebar-collapsed", String(next))
  }

  async function fetchSessions() {
    try {
      const res = await fetch("/api/ai/sessions")
      if (res.ok) {
        const data = await res.json()
        setSessions(data)
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  async function deleteSession(id: string) {
    try {
      const res = await fetch(`/api/ai/sessions/${id}`, { method: "DELETE" })
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id))
        if (activeId === id) setActiveId(null)
      }
    } catch {}
  }

  const handleSessionCreated = useCallback((id: string) => {
    setActiveId(id)
    fetchSessions()
    setMobileSessionOpen(false)
  }, [])

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
      <button
        className="md:hidden fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        onClick={() => setMobileSessionOpen(!mobileSessionOpen)}
      >
        <MessageSquare className="h-5 w-5" />
      </button>

      {/* Sessions sidebar */}
      <div className={cn(
        "flex flex-col shrink-0 border-r border-border/50 bg-background transition-all duration-300",
        sidebarCollapsed ? "w-12" : "w-64",
        "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:bg-background max-md:shadow-xl max-md:transition-transform max-md:duration-200",
        mobileSessionOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"
      )}>
        {/* Header */}
        <div className={cn(
          "flex items-center border-b border-border/50",
          sidebarCollapsed ? "flex-col gap-2 py-3 px-1" : "justify-between px-3 h-11"
        )}>
          {!sidebarCollapsed && (
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">History</span>
          )}
          <div className={cn("flex", sidebarCollapsed ? "flex-col gap-1" : "items-center gap-0.5")}>
            <button
              onClick={() => { setActiveId(null); setMobileSessionOpen(false) }}
              className={cn(
                "flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
                sidebarCollapsed ? "h-8 w-8" : "h-6 w-6"
              )}
              title="New chat"
            >
              <svg className={cn(sidebarCollapsed ? "h-4 w-4" : "h-3.5 w-3.5")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            </button>
            <button
              onClick={toggleSidebar}
              className={cn(
                "hidden md:flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
                sidebarCollapsed ? "h-8 w-8" : "h-6 w-6"
              )}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          {visibleSessions.length === 0 && !sidebarCollapsed && (
            <p className="text-xs text-muted-foreground text-center py-8">No chats yet</p>
          )}
          {visibleSessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                "group flex items-center rounded-lg cursor-pointer transition-colors",
                sidebarCollapsed ? "justify-center p-2" : "gap-2 px-2.5 py-2",
                activeId === session.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              onClick={() => { setActiveId(session.id); setMobileSessionOpen(false) }}
              title={sidebarCollapsed ? session.title : undefined}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
              {!sidebarCollapsed && (
                <>
                  <span className="truncate flex-1 text-sm">{session.title}</span>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
                    onClick={(e) => { e.stopPropagation(); deleteSession(session.id) }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className={cn("border-t border-border/50", sidebarCollapsed ? "p-2" : "p-2")}>
          <button
            onClick={() => router.push("/settings")}
            className={cn(
              "flex items-center gap-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
              sidebarCollapsed ? "justify-center w-full p-2" : "w-full px-2.5 py-1.5"
            )}
            title={sidebarCollapsed ? "Configure AI" : undefined}
          >
            <Settings className="h-3.5 w-3.5" />
            {!sidebarCollapsed && "Configure AI"}
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        <AIChat sessionId={activeId} onSessionCreated={handleSessionCreated} />
      </div>

      {/* Mobile overlay */}
      {mobileSessionOpen && (
        <div className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden" onClick={() => setMobileSessionOpen(false)} />
      )}
    </div>
  )
}
