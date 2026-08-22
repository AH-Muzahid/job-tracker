"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Square, FileText, Briefcase, Target, MessageSquare, ArrowDown, Plus } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
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
  const [modelOverride, setModelOverride] = useState<string | undefined>(undefined)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const createdSessionIdRef = useRef<string | null>(null)
  
  const { pendingPrompt, setPendingPrompt } = useUI()

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
        if (res.ok) {
          const session = await res.json()
          if (!cancelled) {
            setMessages(session?.messages || [])
          }
        }
      } catch {
        if (!cancelled) setError("Failed to load chat history")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [sessionId])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    if (isStreaming) {
      scrollToBottom()
    }
  }, [messages, isStreaming, scrollToBottom])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px"
    }
  }, [input])

  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    setShowScrollBtn(!isNearBottom && scrollHeight > clientHeight)
  }

  const sendMessage = useCallback(async (text: string) => {
    const content = text.trim()
    if (!content || isStreaming) return
    
    setInput("")
    setError(null)

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content }
    const assistantId = crypto.randomUUID()
    const assistantMessage: Message = { id: assistantId, role: "assistant", content: "" }
    
    setMessages((prev) => [...prev, userMessage, assistantMessage])
    setIsStreaming(true)

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
        createdSessionIdRef.current = session.id
        onSessionCreated?.(session.id)
      }

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          sessionId: activeSessionId,
          model: modelOverride,
        }),
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
      let buffer = ""
      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        if (value) {
          const chunk = decoder.decode(value, { stream: !done })
          
          // Check if stream is SSE formatted
          if (chunk.startsWith("data: ") || chunk.startsWith("0:") || buffer.startsWith("data: ")) {
            buffer += chunk
            const lines = buffer.split('\n')
            buffer = lines.pop() || ""
            
            for (const line of lines) {
              const trimLine = line.trim()
              if (!trimLine) continue

              if (trimLine.startsWith('0:')) {
                try {
                  accumulated += JSON.parse(trimLine.slice(2))
                } catch {
                  accumulated += trimLine.slice(2)
                }
                continue
              }

              if (trimLine.startsWith('data: ')) {
                const payload = trimLine.slice(6).trim()
                if (payload === '[DONE]') continue
                try {
                  const data = JSON.parse(payload)
                  if (data.type === 'text-delta') {
                    accumulated += data.textDelta || data.delta || data.text || ""
                  } else if (typeof data === 'string') {
                    accumulated += data
                  }
                } catch {
                  accumulated += payload
                }
              }
            }
          } else {
            // Direct plain text streaming
            accumulated += chunk
          }
          
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
          )
        }
      }

      if (!accumulated.trim()) {
        accumulated = "⚠️ The selected AI model did not return a response (or timed out). Please switch to an active model (such as Gemini 2.5 Flash) using the model selector below."
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
        )
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [sessionId, isStreaming, onSessionCreated, modelOverride])

  // Listen for pending prompts from global state (e.g., from BentoCommandZone)
  useEffect(() => {
    if (pendingPrompt && !isStreaming) {
      const promptToSend = pendingPrompt
      setPendingPrompt(null)
      // Slight delay ensures state updates correctly before sending
      setTimeout(() => sendMessage(promptToSend), 100)
    }
  }, [pendingPrompt, isStreaming, sendMessage, setPendingPrompt])

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
              {input.includes("\n") || input.length > 90 ? (
                <div className="flex flex-col rounded-2xl sm:rounded-3xl border border-border/60 bg-card/95 backdrop-blur-md p-3 shadow-md focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/60 transition-all">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything or paste a job description..."
                    className="w-full bg-transparent border-0 outline-none resize-none text-sm placeholder:text-muted-foreground/50 min-h-[50px] max-h-[180px] px-1 py-1 leading-relaxed"
                    rows={Math.min(6, Math.max(2, input.split('\n').length))}
                  />
                  <div className="flex items-center justify-between pt-2 mt-1 border-t border-border/40">
                    <button 
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Add context"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-2">
                      <ModelSelector
                        variant="inline"
                        selectedModelOverride={modelOverride}
                        onModelOverrideChange={setModelOverride}
                      />
                      <button
                        onClick={() => sendMessage(input)}
                        disabled={!input.trim()}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/95 backdrop-blur-md px-3.5 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                  <button 
                    type="button"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Add context"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything or paste a job description..."
                    className="flex-1 bg-transparent border-0 outline-none resize-none text-sm placeholder:text-muted-foreground/50 h-[22px] py-0.5 leading-normal"
                    rows={1}
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <ModelSelector
                      variant="inline"
                      selectedModelOverride={modelOverride}
                      onModelOverrideChange={setModelOverride}
                    />
                    <button
                      onClick={() => sendMessage(input)}
                      disabled={!input.trim()}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
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
          <div className="flex-1 overflow-y-auto" ref={containerRef} onScroll={handleScroll}>
            <div className="max-w-3xl mx-auto flex flex-col gap-6 p-4 sm:p-6">
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
              {/* Spacer to ensure messages scroll above the floating input without excessive margin */}
              <div className="h-28 shrink-0" ref={messagesEndRef} />
            </div>
          </div>

          {showScrollBtn && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-28 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow-md hover:bg-accent transition-colors z-10"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          )}

          <div className="absolute bottom-4 left-0 right-0 px-4 pointer-events-none">
            <div className="max-w-3xl mx-auto pointer-events-auto">
              {input.includes("\n") || input.length > 90 ? (
                <div className="relative flex flex-col rounded-2xl sm:rounded-3xl bg-card/95 backdrop-blur-md border border-border/80 p-3 shadow-xl focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message AI Assistant..."
                    className="w-full bg-transparent border-0 outline-none resize-none text-sm placeholder:text-muted-foreground/50 min-h-[50px] max-h-[180px] px-1 py-1 leading-relaxed"
                    rows={Math.min(6, Math.max(2, input.split('\n').length))}
                    disabled={isStreaming}
                  />
                  <div className="flex items-center justify-between pt-2 mt-1 border-t border-border/40">
                    <button 
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Add context"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-2">
                      <ModelSelector
                        variant="inline"
                        selectedModelOverride={modelOverride}
                        onModelOverrideChange={setModelOverride}
                      />
                      {isStreaming ? (
                        <button
                          onClick={stopStreaming}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-xs"
                        >
                          <Square className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => sendMessage(input)}
                          disabled={!input.trim()}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative flex items-center gap-2 rounded-full bg-card/95 backdrop-blur-md border border-border/80 px-3.5 py-1.5 shadow-lg focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <button 
                    type="button"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Add context"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message AI Assistant..."
                    className="flex-1 bg-transparent border-0 outline-none resize-none text-sm placeholder:text-muted-foreground/50 h-[22px] py-0.5 leading-normal"
                    rows={1}
                    disabled={isStreaming}
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <ModelSelector
                      variant="inline"
                      selectedModelOverride={modelOverride}
                      onModelOverrideChange={setModelOverride}
                    />
                    {isStreaming ? (
                      <button
                        onClick={stopStreaming}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-xs"
                      >
                        <Square className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => sendMessage(input)}
                        disabled={!input.trim()}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
              <p className="text-[11px] text-center text-muted-foreground/70 mt-2">
                Gemini-style Assistant. AI can make mistakes. Check important info.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
