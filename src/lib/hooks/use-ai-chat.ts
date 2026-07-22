"use client"

import { useState, useRef, useCallback } from "react"
import type { AIMode } from "@/lib/ai/context-builder"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  metadata?: Record<string, unknown>
}

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (content: string, mode?: AIMode) => {
    setError(null)
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    }
    setMessages((prev) => [...prev, userMsg])
    setIsStreaming(true)

    const assistantId = crypto.randomUUID()
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
    }
    setMessages((prev) => [...prev, assistantMsg])

    const abortController = new AbortController()
    abortRef.current = abortController

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          sessionId,
          ...(mode ? { mode } : {}),
        }),
        signal: abortController.signal,
      })

      if (!res.ok) {
        const errData = await res.json()
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

      const parsed = JSON.parse(accumulated)
      if (parsed.sessionId) {
        setSessionId(parsed.sessionId)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return
      setError(err instanceof Error ? err.message : "Something went wrong")
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: m.content || "Sorry, I encountered an error. Please try again." }
            : m
        )
      )
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [sessionId])

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }, [])

  const loadSession = useCallback(async (id: string) => {
    setSessionId(id)
    setMessages([])
    setIsStreaming(false)
    setError(null)

    try {
      const res = await fetch(`/api/ai/sessions/${id}`)
      if (!res.ok) throw new Error("Failed to load session")
      const data = await res.json()
      setMessages(
        data.messages.map((m: { id: string; role: string; content: string; metadata?: Record<string, unknown> }) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          metadata: m.metadata,
        }))
      )
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load session")
    }
  }, [])

  const createNewSession = useCallback(() => {
    setSessionId(null)
    setMessages([])
    setIsStreaming(false)
    setError(null)
  }, [])

  return {
    messages,
    isStreaming,
    sessionId,
    error,
    sendMessage,
    stopStreaming,
    loadSession,
    createNewSession,
  }
}
