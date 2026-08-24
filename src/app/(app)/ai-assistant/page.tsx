"use client"

import { useEffect, useCallback } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { MessageSquare, Plus, Bot } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSidebar } from "@/components/ui/sidebar"
import AIChat from "@/components/ai/AIChat"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAI } from "@/lib/store"

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
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { setOpenMobile } = useSidebar()
  const { activeChatId, setActiveChatId } = useAI()

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

  // Sync activeChatId with URL param and localStorage on mount
  useEffect(() => {
    const urlId = searchParams.get("id")
    const storedId = localStorage.getItem("last-active-chat")
    if (urlId) {
      setActiveChatId(urlId)
    } else if (storedId) {
      setActiveChatId(storedId)
    }
  }, [searchParams, setActiveChatId])

  // Keep URL and localStorage updated when activeChatId changes
  useEffect(() => {
    if (typeof window === "undefined") return
    const currentUrlId = searchParams.get("id")

    if (activeChatId && currentUrlId !== activeChatId) {
      window.history.replaceState(null, "", `/ai-assistant?id=${activeChatId}`)
      localStorage.setItem("last-active-chat", activeChatId)
    } else if (!activeChatId && currentUrlId) {
      window.history.replaceState(null, "", `/ai-assistant`)
      localStorage.removeItem("last-active-chat")
    }
  }, [activeChatId, searchParams])

  const handleSessionCreated = useCallback((id: string) => {
    setActiveChatId(id)
    queryClient.invalidateQueries({ queryKey: ["ai", "sessions"] })
  }, [queryClient, setActiveChatId])

  const activeSessionTitle = sessions.find((s) => s.id === activeChatId)?.title ?? null

  if (!isLoaded || loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] w-full p-4">
        <Skeleton className="h-full w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden">
      {/* Main Chat area */}
      <main role="main" aria-label="AI Conversation Workspace" className="flex-1 flex flex-col min-w-0 relative overflow-hidden bg-background">
        {/* Top Header */}
        <div className="h-12 border-b border-border/50 px-3 sm:px-4 flex items-center justify-between bg-card/40 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setOpenMobile(true)}
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
            {activeChatId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveChatId(null)}
                className="h-7 text-xs px-2.5 rounded-lg border-border text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Plus className="h-3 w-3 mr-1" />
                New Chat
              </Button>
            )}
            <Badge variant="outline" className="text-[10px] font-mono border-border/60 bg-muted/40 px-2 py-0.5">
              {activeChatId ? "Active Chat" : "Ready"}
            </Badge>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <AIChat sessionId={activeChatId} onSessionCreated={handleSessionCreated} />
        </div>
      </main>
    </div>
  )
}
