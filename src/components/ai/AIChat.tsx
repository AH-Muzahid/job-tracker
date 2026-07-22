"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Square, Sparkles, Briefcase, FileText, MessageSquare, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import ChatMessage from "./ChatMessage"
import ModeBadge from "./ModeBadge"
import type { AIMode } from "@/lib/store"

interface Props {
  sessionId: string
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

export default function AIChat({ sessionId }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentMode, setCurrentMode] = useState<AIMode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadMessages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function loadMessages() {
    try {
      const res = await fetch(`/api/ai/sessions/${sessionId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
        if (data.mode) setCurrentMode(data.mode)
      }
    } catch {}
  }

  async function sendMessage(content: string) {
    if (!content.trim() || isStreaming) return
    setError(null)

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsStreaming(true)

    const assistantId = crypto.randomUUID()
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }])

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, sessionId }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Failed")
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No stream")

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
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: "Sorry, I encountered an error." } : m
        )
      )
    } finally {
      setIsStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-4 h-14 shrink-0">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm">AI Assistant</span>
        {currentMode && <ModeBadge mode={currentMode} />}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="py-12 text-center space-y-4">
              <p className="text-sm text-muted-foreground">How can I help you today?</p>
              <div className="flex flex-wrap justify-center gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => sendMessage(action.label)}
                  >
                    <action.icon className="h-3.5 w-3.5" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isLast={i === messages.length - 1}
              isStreaming={isStreaming && i === messages.length - 1}
            />
          ))}
          {error && (
            <div className="text-sm text-destructive text-center p-2 rounded-lg bg-destructive/10">
              {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t p-4 bg-background">
        <div className="max-w-3xl mx-auto flex gap-2">
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste a job description, ask a question..."
              className="min-h-[44px] max-h-32 pr-10 resize-none"
              rows={1}
              disabled={isStreaming}
            />
          </div>
          {isStreaming ? (
            <Button variant="destructive" size="icon" onClick={() => window.location.reload()}>
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
