"use client"

import { useEffect, useState } from "react"
import { X, ExternalLink } from "lucide-react"
import { useUI } from "@/lib/store"
import AIChat from "./AIChat"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default function GlobalAISidebar() {
  const { aiSidebarOpen, setAiSidebarOpen } = useUI()
  const [mounted, setMounted] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    const storedId = localStorage.getItem("last-active-chat")
    if (storedId) setSessionId(storedId)
  }, [])

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem("last-active-chat", sessionId)
    }
  }, [sessionId])

  if (!mounted) return null

  return (
    <>
      {/* Backdrop for mobile */}
      {aiSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm xl:hidden"
          onClick={() => setAiSidebarOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-sm sm:max-w-md flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 ease-in-out sm:w-[400px] xl:relative xl:z-0 xl:translate-x-0 xl:shadow-none",
          aiSidebarOpen ? "translate-x-0" : "translate-x-full xl:hidden"
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-secondary/30">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-wide text-foreground">AI Assistant</h2>
            <Link 
              href="/ai-assistant" 
              onClick={() => setAiSidebarOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              title="Open in full screen"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
          <button
            onClick={() => setAiSidebarOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <AIChat sessionId={sessionId} onSessionCreated={setSessionId} />
        </div>
      </div>
    </>
  )
}
