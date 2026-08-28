"use client"

import { useState, useRef, useCallback } from "react"
import type { AIMode } from "@/lib/ai/context-builder"
import { createDataStreamParser, type ToolInvocationState } from "@/lib/ai/stream-parser"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  metadata?: Record<string, unknown>
  toolInvocations?: ToolInvocationState[]
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
      toolInvocations: [],
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
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `HTTP ${res.status}: Failed to get response`)
      }

      // Read X-Session-Id from header
      const headerSessionId = res.headers.get("X-Session-Id")
      if (headerSessionId && headerSessionId !== sessionId) {
        setSessionId(headerSessionId)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response stream")

      const decoder = new TextDecoder()
      const parser = createDataStreamParser()

      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          if (value) {
            const chunk = decoder.decode(value, { stream: true })
            const parsed = parser.feed(chunk)
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: parsed.text,
                      toolInvocations: parsed.toolInvocations,
                    }
                  : m
              )
            )
          }
        }
        const finalState = parser.finalize()
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: finalState.text,
                  toolInvocations: finalState.toolInvocations,
                }
              : m
          )
        )
      } finally {
        reader.releaseLock()
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setMessages((prev) =>
          prev.filter(
            (m) =>
              !(
                m.id === assistantId &&
                !m.content.trim() &&
                (!m.toolInvocations || m.toolInvocations.length === 0)
              )
          )
        )
        return
      }
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
        (data.messages || []).map((m: { id: string; role: string; content: string; metadata?: Record<string, unknown> }) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          metadata: m.metadata,
          toolInvocations: (m.metadata as Record<string, unknown> | undefined)?.toolInvocations || [],
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
