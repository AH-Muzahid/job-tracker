"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Square, FileText, Briefcase, Target, MessageSquare, ArrowDown, Paperclip } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import ChatMessage from "./ChatMessage"
import type { AIMode } from "@/lib/store"

interface Props {
  sessionId: string | null
  onSessionCreated?: (id: string) => void
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  metadata?: Record<string, unknown>
}

const QUICK_ACTIONS = [
  { label: "Paste a JD", icon: FileText, mode: "jd-scan" as AIMode },
  { label: "Cover Letter", icon: Briefcase, mode: "application" as AIMode },
  { label: "I applied to...", icon: Target, mode: "tracker" as AIMode },
  { label: "Analyze message", icon: MessageSquare, mode: "response" as AIMode },
]

const PROMPTS: Record<string, string> = {
  "Paste a JD": "I found a job description I'd like you to analyze. Here it is:",
  "Cover Letter": "I need help writing a cover letter for a position I'm applying to.",
  "I applied to...": "I just submitted an application and want to update my tracker.",
  "Analyze message": "I received a message from a recruiter and need help responding.",
}

function MessagesSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AIChat({ sessionId, onSessionCreated }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(!!sessionId)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const hasMessages = messages.length > 0
  const isNewChat = !sessionId

  useEffect(() => {
    if (!sessionId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setMessages([])
    setError(null)
    setShowScrollBtn(false)

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/ai/sessions/${sessionId}`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) {
            setMessages(data?.messages || [])
          }
        }
      } catch {} finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [sessionId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px"
    }
  }, [input])

  function handleScroll() {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200)
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return
    setError(null)

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsStreaming(true)

    const assistantId = crypto.randomUUID()
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }])

    const abortController = new AbortController()
    abortRef.current = abortController

    try {
      let activeSessionId = sessionId

      if (!activeSessionId) {
        const sessionRes = await fetch("/api/ai/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: content.slice(0, 80) }),
        })
        if (!sessionRes.ok) throw new Error("Failed to create session")
        const session = await sessionRes.json()
        activeSessionId = session.id
        onSessionCreated?.(session.id)
      }

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, sessionId: activeSessionId }),
        signal: abortController.signal,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to get response")
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response stream")

      const decoder = new TextDecoder()
      let done = false
      let accumulated = ""

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        if (value) {
          const chunk = decoder.decode(value, { stream: !done })
          accumulated += chunk
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
          )
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [sessionId, isStreaming, onSessionCreated])

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  function handleQuickAction(label: string) {
    const prompt = PROMPTS[label] || label
    setInput(prompt + "\n\n")
    textareaRef.current?.focus()
  }

  const showEmptyState = isNewChat && !hasMessages

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Main content */}
      {loading ? (
        <div className="flex-1 overflow-hidden">
          <MessagesSkeleton />
        </div>
      ) : showEmptyState ? (
        /* Empty state - centered */
        <div className="flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto">
          <div className="w-full max-w-2xl space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold">How can I help you today?</h1>
              <p className="text-muted-foreground">
                Paste a job description, write cover letters, track applications, and more.
              </p>
            </div>

            <div className="relative">
              <div className="flex items-end gap-2 rounded-2xl border bg-card px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:shadow-md transition-all">
                <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  <Paperclip className="h-4 w-4" />
                </button>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything..."
                  className="flex-1 bg-transparent border-0 outline-none resize-none text-sm placeholder:text-muted-foreground/50 min-h-[24px] max-h-[160px]"
                  rows={1}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.label)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Messages view */
        <>
          <div
            ref={containerRef}
            className="flex-1 overflow-y-auto scroll-smooth"
            onScroll={handleScroll}
          >
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
              {messages.map((msg, i) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isLast={i === messages.length - 1}
                  isStreaming={isStreaming && i === messages.length - 1}
                />
              ))}
              {error && (
                <div className="text-sm text-destructive text-center p-3 rounded-lg bg-destructive/10">
                  {error}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {showScrollBtn && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow-md hover:bg-accent transition-colors z-10"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          )}

          <div className="border-t border-border/50 bg-background">
            <div className="max-w-3xl mx-auto px-4 py-3">
              <div className="relative flex items-end gap-2 rounded-2xl border bg-card px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:shadow-md transition-all">
                <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  <Paperclip className="h-4 w-4" />
                </button>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message AI Assistant..."
                  className="flex-1 bg-transparent border-0 outline-none resize-none text-sm placeholder:text-muted-foreground/50 min-h-[24px] max-h-[160px]"
                  rows={1}
                  disabled={isStreaming}
                />
                {isStreaming ? (
                  <button
                    onClick={stopStreaming}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                  >
                    <Square className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim()}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-center text-muted-foreground/40 mt-2">
                AI responses are generated. Verify important information.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
