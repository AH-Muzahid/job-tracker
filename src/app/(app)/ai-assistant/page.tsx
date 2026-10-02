"use client"

import { useEffect, useCallback, useState, Suspense } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import AIChat from "@/components/ai/AIChat"
import { WorkspaceProvider } from "@/components/ai/WorkspaceContext"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAI } from "@/lib/store"
import ChatHistorySidebar from "@/components/ai/ChatHistorySidebar"
import Loading from "./loading"

interface ChatSession {
  id: string
  title: string
  mode: string | null
  updatedAt: string
  _count: { messages: number }
}

function AIAssistantContent() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { activeChatId, setActiveChatId } = useAI()

  // Sidebar visibility states
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useQuery({
    queryKey: ["ai", "sessions"],
    queryFn: async () => {
      const res = await fetch("/api/ai/sessions")
      if (res.ok) return (await res.json()) as ChatSession[]
      return []
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/")
    }
  }, [isLoaded, isSignedIn, router])

  // Sync activeChatId with URL param and localStorage on mount
  useEffect(() => {
    const urlId = searchParams?.get("id")
    const storedId = typeof window !== "undefined" ? localStorage.getItem("last-active-chat") : null
    if (urlId) {
      setActiveChatId(urlId)
    } else if (activeChatId) {
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `/ai-assistant?id=${activeChatId}`)
      }
    } else if (storedId) {
      setActiveChatId(storedId)
    }
  }, [searchParams, setActiveChatId])

  // Keep URL and localStorage updated when activeChatId changes
  useEffect(() => {
    if (typeof window === "undefined") return
    const currentUrlId = searchParams?.get("id")

    if (activeChatId && currentUrlId !== activeChatId) {
      window.history.replaceState(null, "", `/ai-assistant?id=${activeChatId}`)
      localStorage.setItem("last-active-chat", activeChatId)
    } else if (!activeChatId && currentUrlId) {
      window.history.replaceState(null, "", `/ai-assistant`)
      localStorage.removeItem("last-active-chat")
    }
  }, [activeChatId, searchParams])

  // Global keyboard shortcut: Cmd+K / Ctrl+K creates a new chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setActiveChatId(null)
        setMobileSidebarOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [setActiveChatId])

  const handleSessionCreated = useCallback((id: string) => {
    setActiveChatId(id)
    queryClient.invalidateQueries({ queryKey: ["ai", "sessions"] })
  }, [queryClient, setActiveChatId])

  const handleSelectChat = useCallback((id: string) => {
    setActiveChatId(id)
    setMobileSidebarOpen(false)
  }, [setActiveChatId])

  const handleNewChat = useCallback(() => {
    setActiveChatId(null)
    setMobileSidebarOpen(false)
  }, [setActiveChatId])

  if (!isLoaded) {
    return null
  }

  return (
    <WorkspaceProvider>
      <div className="flex h-dvh w-full overflow-hidden bg-background">
        {/* Desktop History Sidebar */}
        <div className="hidden md:flex h-full shrink-0">
          <ChatHistorySidebar
            activeChatId={activeChatId}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
            isOpen={desktopSidebarOpen}
            onToggleOpen={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
          />
        </div>

        {/* Mobile History Drawer */}
        <ChatHistorySidebar
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          isOpen={mobileSidebarOpen}
          onToggleOpen={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          isMobileDrawer={true}
        />

        {/* Main Chat area */}
        <main
          role="main"
          aria-label="AI Conversation Workspace"
          className="flex-1 flex flex-col min-w-0 relative overflow-hidden bg-background"
        >
          <div className="flex-1 overflow-hidden relative">
            <AIChat
              sessionId={activeChatId}
              onSessionCreated={handleSessionCreated}
              onToggleHistory={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            />
          </div>
        </main>
      </div>
    </WorkspaceProvider>
  )
}

export default function AIAssistantPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AIAssistantContent />
    </Suspense>
  )
}
