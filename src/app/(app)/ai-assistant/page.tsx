"use client"

import { useEffect, useCallback } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import AIChat from "@/components/ai/AIChat"
import { WorkspaceProvider } from "@/components/ai/WorkspaceContext"
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
  const { activeChatId, setActiveChatId } = useAI()

  const { isLoading: loading } = useQuery({
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
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

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

  if (!isLoaded) {
    return null
  }

  return (
    <WorkspaceProvider>
      <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden">
        {/* Main Chat area */}
        <main role="main" aria-label="AI Conversation Workspace" className="flex-1 flex flex-col min-w-0 relative overflow-hidden bg-background">
          <div className="flex-1 overflow-hidden relative">
            <AIChat sessionId={activeChatId} onSessionCreated={handleSessionCreated} />
          </div>
        </main>
      </div>
    </WorkspaceProvider>
  )
}
