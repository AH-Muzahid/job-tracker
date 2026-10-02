"use client"

import * as React from "react"
import {
  Cpu,
  RefreshCw,
  Layers,
  Terminal,
  ShieldAlert,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { PageContainer } from "@/components/primitives/PageContainer"
import { PageHeader } from "@/components/primitives/PageHeader"
import { KPIStrip, type KPIItem } from "@/components/primitives/KPIStrip"
import { InngestJobMonitor } from "@/components/ops/InngestJobMonitor"
import { LLMUsageMonitor } from "@/components/ops/LLMUsageMonitor"
import { AgentTraceMonitor } from "@/components/ops/AgentTraceMonitor"
import { AppLogMonitor } from "@/components/ops/AppLogMonitor"
import type { OpsMetricsSummary, LLMCallRingItem, AgentStepRingItem, JobRunRingItem, AppLogRingItem } from "@/lib/ops/telemetry-ring"
import type { InngestPipelineMetadata } from "@/lib/ops/inngest-catalog"

export default function AdminOpsPage() {
  const [activeTab, setActiveTab] = React.useState<"jobs" | "llm" | "agents" | "logs">("jobs")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [metrics, setMetrics] = React.useState<OpsMetricsSummary>({
    totalLLMCalls: 0,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalCostUsd: 0,
    avgLatencyMs: 0,
    errorCount: 0,
    successRate: 100,
    activePipelinesCount: 14,
    recentJobsCount: 0,
    jobSuccessRate: 100,
  })

  const [catalog, setCatalog] = React.useState<InngestPipelineMetadata[]>([])
  const [recentRuns, setRecentRuns] = React.useState<JobRunRingItem[]>([])
  const [llmCalls, setLlmCalls] = React.useState<LLMCallRingItem[]>([])
  const [agentSteps, setAgentSteps] = React.useState<AgentStepRingItem[]>([])
  const [appLogs, setAppLogs] = React.useState<AppLogRingItem[]>([])

  const [autoRefresh, setAutoRefresh] = React.useState(true)
  const refreshIntervalSec = 6

  // Full refresh: fetches all 5 endpoints (used on initial mount and manual Refresh button)
  const fetchAllData = React.useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true)
    setIsRefreshing(true)
    setError(null)

    try {
      const [resMetrics, resJobs, resLLM, resAgents, resLogs] = await Promise.all([
        fetch("/api/admin/ops/metrics"),
        fetch("/api/admin/ops/jobs"),
        fetch("/api/admin/ops/llm"),
        fetch("/api/admin/ops/agents"),
        fetch("/api/admin/ops/logs"),
      ])

      if (resMetrics.status === 403 || resJobs.status === 403) {
        setError("Access restricted. You must have admin privileges to access the Ops & Observability platform.")
        setIsLoading(false)
        setIsRefreshing(false)
        return
      }

      if (resMetrics.ok) {
        const d = await resMetrics.json()
        if (d.metrics) setMetrics(d.metrics)
      }

      if (resJobs.ok) {
        const d = await resJobs.json()
        if (d.catalog) setCatalog(d.catalog)
        if (d.recentRuns) setRecentRuns(d.recentRuns)
      }

      if (resLLM.ok) {
        const d = await resLLM.json()
        if (d.calls) setLlmCalls(d.calls)
      }

      if (resAgents.ok) {
        const d = await resAgents.json()
        if (d.steps) setAgentSteps(d.steps)
      }

      if (resLogs.ok) {
        const d = await resLogs.json()
        if (d.logs) setAppLogs(d.logs)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ops telemetry")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // Targeted silent polling: only fetches global metrics and the active tab's endpoint.
  // This reduces request volume by ~65%, saving Redis commands and preventing rate limits.
  const fetchActiveTabData = React.useCallback(
    async (tab: typeof activeTab) => {
      // Auto-pause if browser tab is hidden/minimized
      if (typeof document !== "undefined" && document.hidden) return

      try {
        const [resMetrics, resTab] = await Promise.all([
          fetch("/api/admin/ops/metrics"),
          fetch(`/api/admin/ops/${tab}`),
        ])

        if (resMetrics.ok) {
          const d = await resMetrics.json()
          if (d.metrics) setMetrics(d.metrics)
        }

        if (resTab.ok) {
          const d = await resTab.json()
          if (tab === "jobs") {
            if (d.catalog) setCatalog(d.catalog)
            if (d.recentRuns) setRecentRuns(d.recentRuns)
          } else if (tab === "llm") {
            if (d.calls) setLlmCalls(d.calls)
          } else if (tab === "agents") {
            if (d.steps) setAgentSteps(d.steps)
          } else if (tab === "logs") {
            if (d.logs) setAppLogs(d.logs)
          }
        }
      } catch {
        // Silent fail during background polling to prevent disruption
      }
    },
    []
  )

  // Initial load
  React.useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  // When user switches tabs, immediately fetch the newly active tab's data
  React.useEffect(() => {
    void fetchActiveTabData(activeTab)
  }, [activeTab, fetchActiveTabData])

  // Visibility-aware smart polling: auto-pauses when tab is hidden, resumes on return
  React.useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      void fetchActiveTabData(activeTab)
    }, refreshIntervalSec * 1000)

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden && autoRefresh) {
        // Immediate refresh when admin returns to tab
        void fetchActiveTabData(activeTab)
      }
    }

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange)
    }

    return () => {
      clearInterval(interval)
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange)
      }
    }
  }, [autoRefresh, refreshIntervalSec, activeTab, fetchActiveTabData])

  const kpiItems: KPIItem[] = [
    {
      id: "cost",
      label: "24h Model Spend",
      value: `$${metrics.totalCostUsd.toFixed(3)}`,
      subtext: `${metrics.totalTokens.toLocaleString()} tokens accounted`,
      icon: DollarSign,
    },
    {
      id: "latency",
      label: "Average Latency",
      value: `${metrics.avgLatencyMs}ms`,
      subtext: `${metrics.totalLLMCalls} total invocations`,
      icon: Clock,
    },
    {
      id: "jobs",
      label: "Pipeline Success",
      value: `${metrics.jobSuccessRate}%`,
      subtext: `${metrics.recentJobsCount} executions recorded`,
      icon: CheckCircle2,
    },
    {
      id: "active_pipelines",
      label: "Registered Workers",
      value: `${metrics.activePipelinesCount}`,
      subtext: "Inngest crons & background workers",
      icon: Layers,
    },
  ]

  if (error) {
    return (
      <PageContainer maxWidth="default" className="py-8">
        <PageHeader
          overline="Admin Security"
          title="Ops & Observability Access Denied"
          description="Unauthorized access detected."
        />
        <div className="mt-8 p-6 rounded-[6px] border border-rose-500/30 bg-rose-500/10 text-rose-500 max-w-xl flex items-start gap-3">
          <ShieldAlert className="size-6 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <h4 className="font-semibold text-foreground">Admin Privileges Required</h4>
            <p className="text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground pt-2">
              To grant access, add your Clerk User ID or email to the <code className="font-mono bg-muted px-1 py-0.5 rounded">ADMIN_USER_IDS</code> environment variable or assign the <code className="font-mono bg-muted px-1 py-0.5 rounded">&apos;admin&apos;</code> role in Clerk metadata.
            </p>
          </div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer maxWidth="default" className="py-6 space-y-6">
      <PageHeader
        overline="CareerTrack Platform Engineering"
        title="Ops & Observability Console"
        description="Real-time telemetry for autonomous agent loops, Inngest background workers, and model accounting."
        primaryAction={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] border text-xs font-mono transition-colors cursor-pointer ${
                autoRefresh
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20"
                  : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
              }`}
              title={autoRefresh ? `Live polling every ${refreshIntervalSec}s is active (auto-pauses when tab is hidden). Click to pause.` : "Live polling is paused. Click to resume."}
            >
              <span className={`size-2 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
              <span>{autoRefresh ? `Live (${refreshIntervalSec}s)` : "Paused"}</span>
            </button>

            <button
              onClick={() => fetchAllData(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#533AFD] hover:bg-[#4732d8] text-white text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
            </button>
          </div>
        }
      />

      {/* KPI Stat Strip */}
      <KPIStrip items={kpiItems} isLoading={isLoading} columns={4} />

      {/* Console Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("jobs")}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "jobs"
              ? "border-[#533AFD] text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="size-3.5" />
          <span>Background Pipelines ({catalog.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("llm")}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "llm"
              ? "border-[#533AFD] text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Cpu className="size-3.5" />
          <span>Frontier Models & Token Cost ({llmCalls.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("agents")}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "agents"
              ? "border-[#533AFD] text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Terminal className="size-3.5" />
          <span>Agent Execution Traces ({agentSteps.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "logs"
              ? "border-[#533AFD] text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <AlertCircle className="size-3.5" />
          <span>App Logs & Errors ({appLogs.length})</span>
        </button>
      </div>

      {/* Active Tab Content */}
      <div className="pt-1">
        {activeTab === "jobs" && (
          <InngestJobMonitor
            catalog={catalog}
            recentRuns={recentRuns}
            onRefresh={() => fetchAllData(true)}
          />
        )}

        {activeTab === "llm" && (
          <LLMUsageMonitor
            calls={llmCalls}
            onRefresh={() => fetchAllData(true)}
          />
        )}

        {activeTab === "agents" && (
          <AgentTraceMonitor
            steps={agentSteps}
            onRefresh={() => fetchAllData(true)}
          />
        )}

        {activeTab === "logs" && (
          <AppLogMonitor
            logs={appLogs}
            onRefresh={() => fetchAllData(true)}
          />
        )}
      </div>
    </PageContainer>
  )
}
