"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Bot, Plus, MessageSquare, Trash2, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in")
      return
    }
    if (!isLoaded) return
    fetchSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn])

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

  async function createSession() {
    try {
      const res = await fetch("/api/ai/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" }),
      })
      if (res.ok) {
        const session = await res.json()
        setSessions((prev) => [session, ...prev])
        setActiveId(session.id)
        setMobileSessionOpen(false)
      }
    } catch {}
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

  if (!isLoaded || loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
        <div className="hidden md:flex w-64 flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
        </div>
        <div className="flex-1"><Skeleton className="h-full rounded-xl" /></div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 overflow-hidden">
      {/* Mobile session toggle */}
      <button
        className="md:hidden fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        onClick={() => setMobileSessionOpen(!mobileSessionOpen)}
      >
        <MessageSquare className="h-5 w-5" />
      </button>

      {/* Sessions sidebar */}
      <div className={cn(
        "flex flex-col border-r bg-muted/30 w-64 shrink-0",
        "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:bg-background max-md:shadow-xl max-md:transition-transform max-md:duration-200",
        mobileSessionOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"
      )}>
        <div className="flex items-center justify-between border-b px-4 h-14">
          <span className="font-semibold text-sm">Chat History</span>
          <Button variant="ghost" size="icon" onClick={createSession}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">No chats yet</p>
          )}
          {sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors",
                activeId === session.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
              onClick={() => { setActiveId(session.id); setMobileSessionOpen(false) }}
            >
              <Bot className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate flex-1">{session.title}</span>
              <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">{session._count.messages}</span>
              <button
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                onClick={(e) => { e.stopPropagation(); deleteSession(session.id) }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="border-t p-3">
          <Button variant="outline" size="sm" className="w-full gap-2" asChild>
            <a href="/settings"><Settings className="h-3.5 w-3.5" /> Configure AI</a>
          </Button>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeId ? (
          <AIChat key={activeId} sessionId={activeId} />
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <Card className="max-w-md w-full">
              <CardContent className="p-8 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Bot className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold">AI Workflow Assistant</h2>
                <p className="text-sm text-muted-foreground">
                  Paste a job description, ask for cover letter help, track your applications,
                  or get interview prep. I&apos;m here to help you get hired.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button size="sm" variant="outline" onClick={createSession}>
                    <Plus className="h-4 w-4 mr-1" /> New Chat
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setActiveId("new")}>
                    Quick Analyze
                  </Button>
                </div>
                {sessions.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <p className="text-xs text-muted-foreground mb-2">Or select a chat from history</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Mobile overlay */}
      {mobileSessionOpen && (
        <div className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden" onClick={() => setMobileSessionOpen(false)} />
      )}
    </div>
  )
}
