"use client"

import React, { useState, useEffect, useRef } from "react"
import { Cpu, Clock, Layers, Coins } from "lucide-react"
import { useWorkspace } from "./WorkspaceContext"
import AgenticProcessViewer from "./AgenticProcessViewer"
import { DecorIcon } from "@/components/decor-icon"

export default function TerminalTab() {
  const { toolInvocations, isStreaming } = useWorkspace()
  const [modelInfo, setModelInfo] = useState<{ model: string; provider: string }>({
    model: "gemini-2.0-flash",
    provider: "google",
  })

  const [latency, setLatency] = useState<number>(0)
  const startTimeRef = useRef<number | null>(null)

  // Fetch configured AI provider and model
  useEffect(() => {
    async function fetchModel() {
      try {
        const res = await fetch("/api/ai/models")
        if (res.ok) {
          const data = await res.json()
          if (data.activeModel) {
            setModelInfo({
              model: data.activeModel,
              provider: data.providerType || "google",
            })
          }
        }
      } catch {
        // Fall back to defaults on failure
      }
    }
    fetchModel()
  }, [])

  // Keep track of real-time latency while streaming, or mock for history
  useEffect(() => {
    if (isStreaming) {
      const start = Date.now()
      startTimeRef.current = start
      setLatency(0)
      const interval = setInterval(() => {
        setLatency((Date.now() - start) / 1000)
      }, 100)
      return () => clearInterval(interval)
    } else {
      if (startTimeRef.current) {
        setLatency((Date.now() - startTimeRef.current) / 1000)
      } else if (toolInvocations.length > 0) {
        // Model latency: 1.2s base overhead plus ~0.85s per background action
        setLatency(1.2 + toolInvocations.length * 0.85)
      } else {
        setLatency(0)
      }
    }
  }, [isStreaming, toolInvocations.length])

  // Get active pricing rates
  const rates = React.useMemo(() => {
    const prov = modelInfo.provider.toLowerCase()
    const modelId = modelInfo.model.toLowerCase()

    if (prov === "google") {
      return { input: 0.075, output: 0.30 }
    } else if (prov === "anthropic") {
      return { input: 3.00, output: 15.00 }
    } else {
      if (modelId.includes("mini")) {
        return { input: 0.15, output: 0.60 }
      }
      return { input: 2.50, output: 10.00 }
    }
  }, [modelInfo])

  // Estimate total input/output tokens and cost
  const tokenMetrics = React.useMemo(() => {
    if (toolInvocations.length === 0) {
      return { inputs: 0, outputs: 0, cost: "0.00000" }
    }
    const inputs = toolInvocations.length * 1500 + 4000
    const outputs = toolInvocations.length * 500 + 500
    const cost = (inputs * rates.input) / 1_000_000 + (outputs * rates.output) / 1_000_000
    return { inputs, outputs, cost: cost.toFixed(5) }
  }, [toolInvocations, rates])

  return (
    <div className="space-y-4 font-mono text-xs text-foreground select-none">
      {/* Blueprint style telemetry banner */}
      <div className="relative border border-border bg-muted/40 p-4 font-mono">
        <DecorIcon className="size-3 text-muted-foreground/30" position="top-left" />
        <DecorIcon className="size-3 text-muted-foreground/30" position="top-right" />
        <DecorIcon className="size-3 text-muted-foreground/30" position="bottom-left" />
        <DecorIcon className="size-3 text-muted-foreground/30" position="bottom-right" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground font-sans font-semibold tracking-wider flex items-center gap-1.5">
              <Cpu className="h-3 w-3 text-primary shrink-0" />
              <span>PROVIDER ROUTE</span>
            </div>
            <div className="text-sm font-semibold truncate capitalize text-foreground">
              {modelInfo.provider}: {modelInfo.model}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground font-sans font-semibold tracking-wider flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-primary shrink-0" />
              <span>LATENCY</span>
            </div>
            <div className="text-sm font-semibold text-foreground">
              {latency.toFixed(2)}s
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground font-sans font-semibold tracking-wider flex items-center gap-1.5">
              <Layers className="h-3 w-3 text-primary shrink-0" />
              <span>TOKEN USAGE</span>
            </div>
            <div className="text-sm font-semibold text-foreground">
              {tokenMetrics.inputs} <span className="text-[10px] font-normal text-muted-foreground">in</span> / {tokenMetrics.outputs} <span className="text-[10px] font-normal text-muted-foreground">out</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground font-sans font-semibold tracking-wider flex items-center gap-1.5">
              <Coins className="h-3 w-3 text-primary shrink-0" />
              <span>ESTIMATED COST</span>
            </div>
            <div className="text-sm font-semibold text-emerald-500 dark:text-emerald-400">
              ${tokenMetrics.cost}
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Agent Stream output panel */}
      <div className="border border-border p-4 bg-card min-h-[300px] relative">
        <DecorIcon className="size-3 text-muted-foreground/30" position="top-left" />
        <DecorIcon className="size-3 text-muted-foreground/30" position="top-right" />
        <DecorIcon className="size-3 text-muted-foreground/30" position="bottom-left" />
        <DecorIcon className="size-3 text-muted-foreground/30" position="bottom-right" />

        <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 font-sans font-bold flex items-center gap-1.5 border-b border-border pb-1.5">
          <span>Agent Execution Stream</span>
        </h4>
        
        {toolInvocations.length > 0 ? (
          <AgenticProcessViewer toolInvocations={toolInvocations} isStreaming={isStreaming} />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/75 font-sans">
            <p>No agent actions recorded for the active run.</p>
          </div>
        )}
      </div>
    </div>
  )
}
