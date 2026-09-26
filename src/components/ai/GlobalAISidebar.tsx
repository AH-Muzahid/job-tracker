"use client"

import { useEffect, useState } from "react"
import { X, ExternalLink, Bot } from "lucide-react"
import { useUI } from "@/lib/store"
import AIChat from "./AIChat"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default function GlobalAISidebar() {
  const { aiSidebarOpen, setAiSidebarOpen } = useUI()
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    const storedId = localStorage.getItem("last-active-chat")
    if (storedId) setSessionId(storedId)
  }, [])

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem("last-active-chat", sessionId)
    }
  }, [sessionId])

  return (
    <>
      {/* Backdrop for mobile & tablet (< xl) */}
      {aiSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-xs xl:hidden"
          onClick={() => setAiSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        aria-label="Career Copilot"
        className={cn(
          // Mobile & Tablet: Fixed right drawer, pinned to dvh
          "fixed inset-y-0 right-0 z-50 flex h-dvh max-h-dvh w-full max-w-[calc(100vw-1.5rem)] sm:max-w-[400px] flex-col border-l border-border bg-background shadow-2xl transition-transform duration-200 ease-in-out",
          // Desktop (xl+): Sticky column pinned to viewport height, in flex flow with dashboard
          "xl:sticky xl:top-0 xl:h-dvh xl:max-h-dvh xl:self-start xl:shrink-0 xl:z-30 xl:w-[380px] 2xl:w-[420px] xl:shadow-none",
          aiSidebarOpen ? "translate-x-0" : "translate-x-full xl:hidden"
        )}
      >
        <div className="flex h-14 sm:h-15 items-center justify-between border-b border-border px-3.5 bg-background shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex size-7 items-center justify-center rounded-sm bg-primary/10 text-primary shrink-0">
              <Bot className="size-4" />
            </div>
            <h2 className="text-xs sm:text-sm font-semibold tracking-tight text-foreground truncate">
              Career Copilot
            </h2>
            <Link 
              href="/ai-assistant" 
              onClick={() => setAiSidebarOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 shrink-0 rounded-sm hover:bg-muted"
              title="Open full workspace"
              aria-label="Open full workspace"
            >
              <ExternalLink className="size-3.5" />
            </Link>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setAiSidebarOpen(false)}
              className="flex size-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              title="Close Copilot"
              aria-label="Close Copilot"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden relative">
          <AIChat sessionId={sessionId} onSessionCreated={setSessionId} isSidebar={true} />
        </div>
      </aside>
    </>
  )
}
