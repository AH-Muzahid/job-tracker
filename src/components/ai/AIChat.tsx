"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Square, FileText, Briefcase, Target, MessageSquare, ArrowDown, Plus, Sparkles } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import ChatMessage from "./ChatMessage"
import { useUI, type AIMode } from "@/lib/store"
import ModelSelector from "./ModelSelector"

interface Props {
  sessionId: string | null
  onSessionCreated?: (id: string) => void
}

export interface ToolInvocation {
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
  state: "call" | "result"
  result?: unknown
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  metadata?: Record<string, unknown>
  toolInvocations?: ToolInvocation[]
}

const STARTER_PROMPTS = [
  {
    title: "Scan Job Description",
    description: "Extract requirements, calculate match score & detect red flags",
    icon: FileText,
    mode: "jd-scan" as AIMode,
    prompt: "I found a job description I'd like you to analyze. Here it is:\n\n[Paste Job Description Here]",
  },
  {
    title: "Tailored Cover Letter",
    description: "Draft a high-impact, anti-AI letter tailored specifically to the role",
    icon: Briefcase,
    mode: "application" as AIMode,
    prompt: "Please write a tailored, high-impact cover letter for this position highlighting my relevant projects and skills.",
  },
  {
    title: "Mock Interview Prep",
    description: "Practice role-specific technical & behavioral interview questions",
    icon: Target,
    mode: "interview" as AIMode,
    prompt: "Let's conduct an interactive mock interview for my target software engineering role.",
  },
  {
    title: "Track Application",
    description: "Log a new application or update interview & offer status",
    icon: MessageSquare,
    mode: "tracker" as AIMode,
    prompt: "I want to log a new application to my tracker. The company is: ",
  },
]

function MessagesSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
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

interface Props {
  sessionId: string | null
  onSessionCreated?: (id: string) => void
  isSidebar?: boolean
}

export default function AIChat({ sessionId, onSessionCreated, isSidebar }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(!!sessionId)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [activeMode, setActiveMode] = useState<AIMode | undefined>(undefined)
  const [modelOverride, setModelOverride] = useState<string | undefined>(undefined)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const createdSessionIdRef = useRef<string | null>(null)
  
  const { pendingPrompt, setPendingPrompt, aiSidebarOpen } = useUI()

  const hasMessages = messages.length > 0
  const isNewChat = !sessionId

  useEffect(() => {
    if (!sessionId) {
      setLoading(false)
      setMessages([])
      return
    }

    if (createdSessionIdRef.current === sessionId) {
      createdSessionIdRef.current = null
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
        if (!res.ok) throw new Error("Failed to load chat history")
        const session = await res.json()
        if (!cancelled) setMessages(session?.messages || [])
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error loading chat")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [sessionId])

  useEffect(() => {
    // Only consume pendingPrompt if we are the visible instance
    const isVisibleInstance = isSidebar ? aiSidebarOpen : true
    if (pendingPrompt && isVisibleInstance) {
      setInput(pendingPrompt)
      setPendingPrompt(null)
      textareaRef.current?.focus()
    }
  }, [pendingPrompt, setPendingPrompt, isSidebar, aiSidebarOpen])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    if (hasMessages && !loading) {
      scrollToBottom()
    }
  }, [messages, hasMessages, loading, scrollToBottom])

  function handleScroll() {
    const el = containerRef.current
    if (!el) return
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    setShowScrollBtn(!isAtBottom)
  }

  async function createNewSession(firstMsgText: string, modeToUse?: AIMode) {
    const res = await fetch("/api/ai/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: firstMsgText.slice(0, 40),
        mode: modeToUse || activeMode,
      }),
    })
    if (!res.ok) throw new Error("Failed to create session")
    const newSession = await res.json()
    createdSessionIdRef.current = newSession.id
    onSessionCreated?.(newSession.id)
    return newSession.id as string
  }

  async function sendMessage(textToSend: string, modeOverride?: AIMode) {
    const trimmed = textToSend.trim()
    if (!trimmed || isStreaming) return

    const selectedMode = modeOverride || activeMode
    const userMsg: Message = {
      id: "temp-" + Date.now(),
      role: "user",
      content: trimmed,
    }

    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setError(null)
    setIsStreaming(true)

    let currentSessionId = sessionId
    try {
      if (!currentSessionId) {
        currentSessionId = await createNewSession(trimmed, selectedMode)
      }

      const controller = new AbortController()
      abortRef.current = controller

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: currentSessionId,
          message: trimmed,
          mode: selectedMode,
          modelOverride,
        }),
        signal: controller.signal,
      })

      // Reset active mode once dispatched
      setActiveMode(undefined)

      const returnedSessionId = res.headers.get("X-Session-Id")
      if (returnedSessionId && returnedSessionId !== currentSessionId) {
        createdSessionIdRef.current = returnedSessionId
        onSessionCreated?.(returnedSessionId)
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to send message")
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMsg: Message = {
        id: "temp-asst-" + Date.now(),
        role: "assistant",
        content: "",
      }

      setMessages((prev) => [...prev, assistantMsg])

      if (reader) {
        let done = false
        while (!done) {
          const { value, done: doneReading } = await reader.read()
          done = doneReading
          if (value) {
            const chunk = decoder.decode(value, { stream: true })
            assistantMsg = { ...assistantMsg, content: assistantMsg.content + chunk }
            setMessages((prev) => {
              const updated = [...prev]
              updated[updated.length - 1] = assistantMsg
              return updated
            })
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        setError(e.message || "Failed to get response")
        // Remove optimistic user message on failure so state doesn't stay out of sync
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }

  function stopStreaming() {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
      setIsStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const showEmptyState = isNewChat && !hasMessages

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {loading ? (
        <MessagesSkeleton />
      ) : showEmptyState ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto z-10 py-8">
          <div className="w-full max-w-2xl space-y-6">
            {/* Clean Minimal Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-muted text-[11px] font-medium text-muted-foreground border border-border">
                <Sparkles className="h-3 w-3 text-primary" />
                <span>Career AI Assistant</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                How can I assist your career search today?
              </h1>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                Scan job descriptions, draft tailored cover letters, practice mock interviews, or automatically update your pipeline.
              </p>
            </div>

            {/* Clean Minimal Input Dock */}
            <div className="relative">
              <Card className="flex flex-col rounded-xl border border-border bg-card p-3 shadow-xs focus-within:border-foreground/40 transition-colors">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question, paste a job description, or type an update..."
                  className="w-full bg-transparent border-0 outline-none resize-none text-xs placeholder:text-muted-foreground/50 min-h-[64px] max-h-[180px] px-1 py-1 leading-relaxed"
                  rows={Math.min(6, Math.max(2, input.split('\n').length))}
                />
                <div className="flex items-center justify-between pt-2 mt-1 border-t border-border/40">
                  <div className="flex items-center gap-1.5">
                    <Button 
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                      title="Add context"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    {activeMode && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-foreground text-[10px] font-medium border border-border">
                        {activeMode}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <ModelSelector
                      variant="inline"
                      selectedModelOverride={modelOverride}
                      onModelOverrideChange={setModelOverride}
                    />
                    <Button
                      onClick={() => sendMessage(input)}
                      disabled={!input.trim()}
                      size="icon"
                      className="h-7 w-7 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Clean Minimal 2x2 Starter Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-1">
              {STARTER_PROMPTS.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => {
                    setInput(item.prompt)
                    setActiveMode(item.mode)
                    textareaRef.current?.focus()
                  }}
                  className="flex items-start gap-3 p-3 rounded-xl border border-border/80 bg-card/50 hover:bg-muted/50 hover:border-border transition-colors text-left group cursor-pointer"
                >
                  <div className="p-1.5 rounded-md bg-muted text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-0.5">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium text-foreground truncate">
                      {item.title}
                    </span>
                    <span className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mt-0.5">
                      {item.description}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto" ref={containerRef} onScroll={handleScroll}>
            <div className="max-w-3xl mx-auto flex flex-col gap-5 p-4 sm:p-6">
              {messages.map((msg, i) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isLast={i === messages.length - 1}
                  isStreaming={isStreaming && i === messages.length - 1}
                  onSuggestionClick={(prompt) => sendMessage(prompt)}
                />
              ))}
              {error && (
                <div className="text-xs font-medium text-destructive text-center p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  {error}
                </div>
              )}
              <div className="h-28 shrink-0" ref={messagesEndRef} />
            </div>
          </div>

          {showScrollBtn && (
            <Button
              variant="outline"
              size="icon"
              onClick={scrollToBottom}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 h-7 w-7 rounded-md border bg-card shadow-xs hover:bg-muted transition-colors z-10"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Floating Clean Bottom Dock */}
          <div className="absolute bottom-3 left-0 right-0 px-4 pointer-events-none">
            <div className="max-w-3xl mx-auto pointer-events-auto">
              <Card className="relative flex flex-col rounded-xl bg-background/95 backdrop-blur-md border border-border p-2.5 shadow-sm focus-within:border-foreground/40 transition-colors">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question, paste a role, or type an action..."
                  className="w-full bg-transparent border-0 outline-none resize-none text-xs placeholder:text-muted-foreground/50 min-h-[38px] max-h-[160px] px-1 py-0.5 leading-relaxed"
                  rows={Math.min(6, Math.max(1, input.split('\n').length))}
                  disabled={isStreaming}
                />
                <div className="flex items-center justify-between pt-1.5 mt-0.5 border-t border-border/40">
                  <div className="flex items-center gap-1.5">
                    <Button 
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                      title="Add context"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    {activeMode && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-muted text-foreground text-[10px] font-medium border border-border">
                        {activeMode}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <ModelSelector
                      variant="inline"
                      selectedModelOverride={modelOverride}
                      onModelOverrideChange={setModelOverride}
                    />
                    {isStreaming ? (
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={stopStreaming}
                        className="h-6 w-6 rounded-md transition-colors shadow-2xs cursor-pointer"
                      >
                        <Square className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button
                        size="icon"
                        onClick={() => sendMessage(input)}
                        disabled={!input.trim()}
                        className="h-6 w-6 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
