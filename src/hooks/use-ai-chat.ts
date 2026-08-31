"use client"

import { useState, useRef, useCallback } from "react"

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

  const sendMessage = useCallback(async (content: string) => {
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
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          sessionId: sessionId || crypto.randomUUID(),
        }),
        signal: abortController.signal,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `HTTP ${res.status}: Failed to get response`)
      }

      const headerSessionId = res.headers.get("X-Session-Id")
      if (headerSessionId && headerSessionId !== sessionId) {
        setSessionId(headerSessionId)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response stream")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        if (value) {
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n\n")
          buffer = lines.pop() || ""

          for (const block of lines) {
            const matchEvent = block.match(/^event:\s*(.+)$/m)
            const matchData = block.match(/^data:\s*(.+)$/m)

            if (matchEvent && matchData) {
              const event = matchEvent[1].trim()
              try {
                const data = JSON.parse(matchData[1])
                if (event === "responder") {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId ? { ...m, content: data.responseContent || m.content } : m
                    )
                  )
                } else if (event === "done") {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: data.state?.responseContent || m.content }
                        : m
                    )
                  )
                }
              } catch {}
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return
      }
      const msg = err instanceof Error ? err.message : "Failed to send message"
      setError(msg)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `Error: ${msg}` }
            : m
        )
      )
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [sessionId])

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
      setIsStreaming(false)
    }
  }, [])

  return {
    messages,
    isStreaming,
    sessionId,
    error,
    sendMessage,
    stop,
    setMessages,
  }
}
