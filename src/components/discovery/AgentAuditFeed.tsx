"use client"

import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Terminal,
  BrainCircuit,
  ShieldCheck,
  FileText,
  Database,
  Bot,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type {
  OrchestratorExecutionSummary,
  OrchestratorAuditItem,
} from "./audit-feed-types"

function formatRelativeTime(dateInput: string | Date | null): string {
  if (!dateInput) return "Never run"
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000)

  if (diffSec < 60) return "Just now"
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  return `${Math.floor(diffSec / 86400)}d ago`
}

function formatIsoTime(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function getAgentMeta(agent: OrchestratorAuditItem["agent"]) {
  switch (agent) {
    case "discovery":
      return {
        label: "DISCOVERY",
        icon: BrainCircuit,
        colorClass: "text-sky-400 border-sky-500/30 bg-sky-500/10",
        badgeBg: "bg-sky-500/10 text-sky-400 border-sky-500/30",
      }
    case "evaluation":
      return {
        label: "EVALUATION",
        icon: ShieldCheck,
        colorClass: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
        badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      }
    case "early_exit":
      return {
        label: "EARLY EXIT",
        icon: AlertTriangle,
        colorClass: "text-amber-400 border-amber-500/30 bg-amber-500/10",
        badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      }
    case "asset_generator":
      return {
        label: "ASSET GEN",
        icon: FileText,
        colorClass: "text-purple-400 border-purple-500/30 bg-purple-500/10",
        badgeBg: "bg-purple-500/10 text-purple-400 border-purple-500/30",
      }
    case "persistence":
      return {
        label: "PERSISTENCE",
        icon: Database,
        colorClass: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
        badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      }
    case "learning_feedback":
      return {
        label: "LEARNING",
        icon: Bot,
        colorClass: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
        badgeBg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
      }
    default:
      return {
        label: "SYSTEM",
        icon: Terminal,
        colorClass: "text-neutral-400 border-neutral-700 bg-neutral-800",
        badgeBg: "bg-neutral-800 text-neutral-400 border-neutral-700",
      }
  }
}

interface AgentAuditFeedProps {
  className?: string
  defaultExpanded?: boolean
}

export function AgentAuditFeed({
  className,
  defaultExpanded = false,
}: AgentAuditFeedProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const queryClient = useQueryClient()

  const { data, isFetching } = useQuery<OrchestratorExecutionSummary>({
    queryKey: ["discovery", "orchestrator-audit"],
    queryFn: async () => {
      const res = await fetch("/api/jobs/discover/orchestrator")
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || "Failed to retrieve orchestrator summary")
      }
      const json = (await res.json()) as { data: OrchestratorExecutionSummary }
      return json.data
    },
    staleTime: 30_000,
    refetchInterval: isExpanded ? 20_000 : false,
  })

  const triggerMutation = useMutation<OrchestratorExecutionSummary, Error>({
    mutationFn: async () => {
      const res = await fetch("/api/jobs/discover/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || "Failed to execute career orchestrator")
      }
      const json = (await res.json()) as { data: OrchestratorExecutionSummary }
      return json.data
    },
    onSuccess: (newSummary) => {
      queryClient.setQueryData(["discovery", "orchestrator-audit"], newSummary)
      queryClient.invalidateQueries({ queryKey: ["discovery", "feed"] })
      toast.success(
        newSummary.status === "early_exit"
          ? "Orchestrator finished: 0 jobs met the >=80% fit threshold."
          : `Orchestrator finished: ${newSummary.jobsStaged} application package(s) staged.`
      )
      setIsExpanded(true)
    },
    onError: (err) => {
      toast.error(err.message || "Failed to run career orchestrator pipeline")
    },
  })

  const summary = data || {
    lastRunAt: null,
    status: "idle",
    jobsEvaluated: 0,
    jobsStaged: 0,
    assetsCreated: 0,
    durationMs: 0,
    logs: [],
  }

  const isRunning = triggerMutation.isPending || isFetching
  const statusColor =
    summary.status === "completed"
      ? "bg-emerald-500"
      : summary.status === "early_exit"
      ? "bg-amber-500"
      : summary.status === "failed"
      ? "bg-rose-500"
      : "bg-neutral-500"

  return (
    <div
      className={cn(
        "border border-neutral-800/80 bg-neutral-950/80 text-neutral-200 transition-all rounded-none",
        className
      )}
    >
      {/* 1. Compact Collapsible Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-neutral-900/40 border-b border-neutral-800/60">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2.5 text-left cursor-pointer group flex-1 min-w-0"
        >
          {/* Status Indicator Dot */}
          <span className="relative flex size-2 shrink-0">
            {isRunning && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
            )}
            <span
              className={cn(
                "relative inline-flex size-2 rounded-full",
                isRunning ? "bg-sky-400" : statusColor
              )}
            />
          </span>

          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-mono text-xs font-semibold tracking-wider text-neutral-200 flex items-center gap-1.5">
              <Terminal className="size-3.5 text-neutral-400" />
              <span>ORCHESTRATOR</span>
            </span>

            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono border border-neutral-800 bg-neutral-900 text-neutral-400">
              LANGGRAPH
            </span>

            {/* Status Monospace Badge */}
            <span
              className={cn(
                "px-1.5 py-0.5 text-[10px] font-mono font-medium border uppercase tracking-wider",
                summary.status === "completed" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
                summary.status === "early_exit" && "border-amber-500/30 bg-amber-500/10 text-amber-400",
                summary.status === "idle" && "border-neutral-800 bg-neutral-900 text-neutral-400",
                summary.status === "failed" && "border-rose-500/30 bg-rose-500/10 text-rose-400"
              )}
            >
              {isRunning ? "RUNNING" : summary.status}
            </span>

            {/* Quick Metrics (Condensed in header) */}
            <span className="hidden md:inline-flex items-center gap-2 text-xs font-mono text-neutral-400">
              <span>•</span>
              <span>EVAL: <strong className="text-neutral-200">{summary.jobsEvaluated}</strong></span>
              <span>STAGED: <strong className="text-emerald-400">{summary.jobsStaged}</strong></span>
              <span>ASSETS: <strong className="text-purple-400">{summary.assetsCreated}</strong></span>
              {summary.durationMs > 0 && (
                <span>TIME: <strong className="text-neutral-300">{summary.durationMs}ms</strong></span>
              )}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-neutral-400 hidden lg:inline">
              {formatRelativeTime(summary.lastRunAt)}
            </span>
            <div className="p-1 text-neutral-400 group-hover:text-neutral-200 transition-colors">
              {isExpanded ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </div>
          </div>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0 pl-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerMutation.mutate()}
            disabled={isRunning}
            className="h-7 px-2 text-[11px] font-mono gap-1 border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-neutral-100 rounded-none cursor-pointer"
            title="Execute LangGraph deterministic pipeline on demand"
          >
            <RefreshCw
              className={cn("size-3 text-neutral-400", isRunning && "animate-spin text-sky-400")}
            />
            <span className="hidden xs:inline">{isRunning ? "Running..." : "Run Agent"}</span>
          </Button>
        </div>
      </div>

      {/* 2. Expanded Dashboard & Telemetry Log Body */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-5 bg-neutral-950/60 animate-in fade-in duration-200">
          {/* Summary Stat Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="p-2.5 sm:p-3 border border-neutral-800/80 bg-neutral-900/40">
              <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-mono mb-1">
                <BrainCircuit className="size-3.5 text-sky-400" />
                <span>EVALUATED</span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-neutral-100">
                {summary.jobsEvaluated}
              </div>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                Dense vector retrieval candidates
              </p>
            </div>

            <div className="p-2.5 sm:p-3 border border-neutral-800/80 bg-neutral-900/40">
              <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-mono mb-1">
                <ShieldCheck className="size-3.5 text-emerald-400" />
                <span>STAGED</span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
                {summary.jobsStaged}
              </div>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                Passed fit &ge;80% & scam &lt;0.3
              </p>
            </div>

            <div className="p-2.5 sm:p-3 border border-neutral-800/80 bg-neutral-900/40">
              <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-mono mb-1">
                <FileText className="size-3.5 text-purple-400" />
                <span>ASSETS</span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-purple-400">
                {summary.assetsCreated}
              </div>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                Cover letters & tailored pitches
              </p>
            </div>

            <div className="p-2.5 sm:p-3 border border-neutral-800/80 bg-neutral-900/40">
              <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-mono mb-1">
                <Clock className="size-3.5 text-amber-400" />
                <span>DURATION</span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-neutral-200">
                {summary.durationMs}ms
              </div>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                End-to-end graph traversal
              </p>
            </div>
          </div>

          {/* Chronological Step-by-Step Decision Log */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-neutral-800/70">
              <span className="text-xs font-mono font-semibold tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Terminal className="size-3.5 text-neutral-400" />
                <span>EXECUTION AUDIT TRAIL</span>
              </span>
              <span className="text-[11px] font-mono text-neutral-400">
                {summary.logs.length} Node Transition{summary.logs.length === 1 ? "" : "s"}
              </span>
            </div>

            {summary.logs.length === 0 ? (
              <div className="py-6 px-4 text-center border border-dashed border-neutral-800 bg-neutral-900/20">
                <Bot className="size-6 text-neutral-400 mx-auto mb-2" />
                <p className="text-xs text-neutral-300 font-medium">
                  Pipeline Standing By
                </p>
                <p className="text-[11px] text-neutral-400 mt-1 max-w-sm mx-auto">
                  The Career Orchestrator executes deterministically on schedule or on demand.
                  Click &ldquo;Run Agent&rdquo; above to trigger a fresh LangGraph run.
                </p>
              </div>
            ) : (
              <div className="relative pl-6 sm:pl-7 border-l border-neutral-800/90 space-y-4 pt-1 ml-3 sm:ml-3.5">
                {summary.logs.map((log) => {
                  const meta = getAgentMeta(log.agent)
                  const Icon = meta.icon

                  return (
                    <div key={log.id} className="relative group">
                      {/* Timeline Node Icon Pin */}
                      <span
                        className={cn(
                          "absolute -left-[31px] sm:-left-[35px] top-0.5 size-5 sm:size-6 flex items-center justify-center border bg-neutral-950 rounded-none",
                          meta.colorClass
                        )}
                        title={meta.label}
                      >
                        <Icon className="size-3 sm:size-3.5" />
                      </span>

                      {/* Log Card */}
                      <div className="border border-neutral-800/70 bg-neutral-900/50 p-3 hover:border-neutral-700/80 transition-colors">
                        {/* Top row: Agent badge + Action Code + Time */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={cn(
                                "px-1.5 py-0.5 text-[10px] font-mono font-medium border rounded-none tracking-wider",
                                meta.badgeBg
                              )}
                            >
                              {meta.label}
                            </span>
                            <span className="font-mono text-xs font-semibold text-neutral-200">
                              {log.action}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-neutral-400">
                            {formatIsoTime(log.timestamp)}
                          </span>
                        </div>

                        {/* Rationale Text */}
                        <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                          {log.rationale}
                        </p>

                        {/* Optional Metadata Chips */}
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div className="mt-2 pt-2 border-t border-neutral-800/50 flex flex-wrap items-center gap-1.5">
                            {log.metadata.totalEvaluated !== undefined && (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-neutral-800/60 border border-neutral-700/60 text-neutral-300">
                                Total: {log.metadata.totalEvaluated}
                              </span>
                            )}
                            {log.metadata.approvedCount !== undefined && (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-emerald-950/40 border border-emerald-800/60 text-emerald-400">
                                Approved: {log.metadata.approvedCount}
                              </span>
                            )}
                            {log.metadata.disqualifiedCount !== undefined && (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-amber-950/40 border border-amber-800/60 text-amber-400">
                                Disqualified: {log.metadata.disqualifiedCount}
                              </span>
                            )}
                            {log.metadata.averageFitScore !== undefined && (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-sky-950/40 border border-sky-800/60 text-sky-400">
                                Avg Fit: {log.metadata.averageFitScore}%
                              </span>
                            )}
                            {log.metadata.assetsGenerated !== undefined && (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-purple-950/40 border border-purple-800/60 text-purple-400">
                                Packages: {log.metadata.assetsGenerated}
                              </span>
                            )}
                            {log.metadata.latencyMs !== undefined && (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-neutral-800/60 border border-neutral-700/60 text-neutral-400">
                                Latency: {log.metadata.latencyMs}ms
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
