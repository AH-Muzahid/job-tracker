"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useCallback } from "react"
import type { AgentPlanStep } from "@/lib/ai/graph/state"

export interface AgentRunState {
  isRunning: boolean
  goal: string
  plan: AgentPlanStep[]
  currentStepIndex: number
  responseContent: string
  interruptData: any | null
  error: string | null
}

export function useAgentGraph() {
  const [state, setState] = useState<AgentRunState>({
    isRunning: false,
    goal: "",
    plan: [],
    currentStepIndex: 0,
    responseContent: "",
    interruptData: null,
    error: null,
  })

  const processSSEStream = useCallback(async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

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

            if (event === "planner") {
              setState((prev) => ({
                ...prev,
                goal: data.goal || prev.goal,
                plan: data.plan || prev.plan,
                currentStepIndex: data.currentStepIndex ?? 0,
              }))
            } else if (event === "executor") {
              setState((prev) => ({
                ...prev,
                plan: data.plan || prev.plan,
                currentStepIndex: data.currentStepIndex ?? prev.currentStepIndex,
              }))
            } else if (event === "reflection" || event === "reflector") {
              setState((prev) => ({
                ...prev,
                currentStepIndex: data.currentStepIndex ?? prev.currentStepIndex,
              }))
            } else if (event === "responder") {
              setState((prev) => ({
                ...prev,
                responseContent: data.responseContent || "",
              }))
            } else if (event === "interrupt") {
              setState((prev) => ({
                ...prev,
                isRunning: false,
                interruptData: data.interrupts?.[0]?.value || data,
              }))
            } else if (event === "done") {
              setState((prev) => ({
                ...prev,
                isRunning: false,
                responseContent: data.state?.responseContent || prev.responseContent,
                plan: data.state?.plan || prev.plan,
              }))
            } else if (event === "error") {
              setState((prev) => ({
                ...prev,
                isRunning: false,
                error: data.error || "An error occurred during execution",
              }))
            }
          } catch {
            // Ignore non-json chunks
          }
        }
      }
    }
  }, [])

  const runAgent = useCallback(async (message: string, sessionId?: string) => {
    setState((prev) => ({
      ...prev,
      isRunning: true,
      goal: message,
      error: null,
      responseContent: "",
      interruptData: null,
    }))

    try {
      const response = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, sessionId }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Request failed" }))
        setState((prev) => ({ ...prev, isRunning: false, error: err.error || "Execution failed" }))
        return
      }

      const reader = response.body?.getReader()
      if (!reader) return

      await processSSEStream(reader)
      setState((prev) => ({ ...prev, isRunning: false }))
    } catch (err: any) {
      setState((prev) => ({ ...prev, isRunning: false, error: err?.message || "Execution error" }))
    }
  }, [processSSEStream])

  const resumeAgent = useCallback(async (action: "APPROVE" | "REJECT", sessionId: string, payload?: any) => {
    setState((prev) => ({ ...prev, isRunning: true, interruptData: null, error: null }))

    try {
      const response = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          resumeAction: action,
          resumePayload: payload,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Resume failed" }))
        setState((prev) => ({ ...prev, isRunning: false, error: err.error || "Resume failed" }))
        return
      }

      const reader = response.body?.getReader()
      if (!reader) return

      await processSSEStream(reader)
      setState((prev) => ({ ...prev, isRunning: false }))
    } catch (err: any) {
      setState((prev) => ({ ...prev, isRunning: false, error: err?.message || "Resume error" }))
    }
  }, [processSSEStream])

  return {
    ...state,
    runAgent,
    resumeAgent,
  }
}
