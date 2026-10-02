"use client"

import * as React from "react"
import {
  Play,
  RefreshCw,
  Terminal,
  ExternalLink,
  X,
  Info,
} from "lucide-react"
import { BlueprintCard, BlueprintCardHeader, BlueprintCardTitle, BlueprintCardContent } from "@/components/primitives/BlueprintCard"
import type { InngestPipelineMetadata } from "@/lib/ops/inngest-catalog"
import type { JobRunRingItem } from "@/lib/ops/telemetry-ring"

interface InngestJobMonitorProps {
  catalog: InngestPipelineMetadata[]
  recentRuns: JobRunRingItem[]
  onRefresh: () => void
}

export function InngestJobMonitor({
  catalog,
  recentRuns,
  onRefresh,
}: InngestJobMonitorProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<string>("All")
  const [triggeringId, setTriggeringId] = React.useState<string | null>(null)
  const [inspectPipeline, setInspectPipeline] = React.useState<InngestPipelineMetadata | null>(null)
  const [triggerStatus, setTriggerStatus] = React.useState<{ id: string; success: boolean; message: string } | null>(null)

  const categories = React.useMemo(() => {
    const set = new Set<string>()
    catalog.forEach((item) => set.add(item.category))
    return ["All", ...Array.from(set)]
  }, [catalog])

  const filteredCatalog = React.useMemo(() => {
    if (selectedCategory === "All") return catalog
    return catalog.filter((item) => item.category === selectedCategory)
  }, [catalog, selectedCategory])

  const handleTrigger = async (pipeline: InngestPipelineMetadata) => {
    setTriggeringId(pipeline.id)
    setTriggerStatus(null)

    try {
      const res = await fetch("/api/admin/ops/jobs/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ functionId: pipeline.id }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setTriggerStatus({
          id: pipeline.id,
          success: true,
          message: `Dispatched event: ${pipeline.triggerEvent} (${data.eventId || "ok"})`,
        })
        onRefresh()
      } else {
        setTriggerStatus({
          id: pipeline.id,
          success: false,
          message: data.error || "Failed to trigger pipeline",
        })
      }
    } catch (err) {
      setTriggerStatus({
        id: pipeline.id,
        success: false,
        message: err instanceof Error ? err.message : "Trigger request failed",
      })
    } finally {
      setTriggeringId(null)
    }
  }

  // Active run for inspected pipeline
  const activeInspectRun = React.useMemo(() => {
    if (!inspectPipeline) return null
    return recentRuns.find((r) => r.functionId === inspectPipeline.id) || null
  }, [inspectPipeline, recentRuns])

  // ESC key listener and body overflow lock for side drawer
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInspectPipeline(null)
    }
    if (inspectPipeline) {
      window.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [inspectPipeline])

  return (
    <div className="space-y-4">
      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border">
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? "bg-foreground text-background"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://app.inngest.com/env/production"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[4px] bg-muted/40 hover:bg-muted text-foreground border border-border transition-colors"
          >
            <ExternalLink className="size-3.5 text-muted-foreground" />
            <span>Open Inngest Cloud Console</span>
          </a>
        </div>
      </div>

      {/* Grid of Pipelines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredCatalog.map((pipeline) => {
          const recentRun = recentRuns.find((r) => r.functionId === pipeline.id)
          const isTriggering = triggeringId === pipeline.id
          const hasStatus = triggerStatus?.id === pipeline.id

          return (
            <BlueprintCard key={pipeline.id} className="flex flex-col justify-between">
              <div>
                <BlueprintCardHeader className="py-3 px-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex size-2 rounded-full bg-emerald-500 shrink-0" />
                    <BlueprintCardTitle className="text-xs sm:text-sm font-semibold truncate">
                      {pipeline.name}
                    </BlueprintCardTitle>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-[2px] bg-muted text-muted-foreground shrink-0">
                    {pipeline.category}
                  </span>
                </BlueprintCardHeader>

                <BlueprintCardContent className="p-4 space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {pipeline.description}
                  </p>

                  <div className="rounded-[4px] bg-muted/30 border border-border/60 p-2.5 space-y-1.5 text-[11px] font-mono">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Trigger Type:</span>
                      <span className="text-foreground font-medium uppercase">{pipeline.triggerType}</span>
                    </div>
                    {pipeline.cronSchedule && (
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Cron Schedule:</span>
                        <span className="text-foreground">{pipeline.cronSchedule}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Event Name:</span>
                      <span className="text-foreground truncate max-w-[180px]">{pipeline.triggerEvent}</span>
                    </div>
                    {recentRun && (
                      <div className="flex items-center justify-between pt-1 border-t border-border/40">
                        <span>Last Status:</span>
                        <span
                          className={`font-semibold ${
                            recentRun.status === "completed"
                              ? "text-emerald-500"
                              : recentRun.status === "failed"
                              ? "text-rose-500"
                              : "text-amber-500"
                          }`}
                        >
                          {recentRun.status.toUpperCase()} ({recentRun.durationMs}ms)
                        </span>
                      </div>
                    )}
                  </div>

                  {hasStatus && (
                    <div
                      className={`text-xs p-2 rounded-[4px] border ${
                        triggerStatus.success
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {triggerStatus.message}
                    </div>
                  )}
                </BlueprintCardContent>
              </div>

              <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setInspectPipeline(pipeline)}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[4px] bg-muted/40 hover:bg-muted text-xs font-medium border border-border text-foreground transition-colors cursor-pointer"
                >
                  <Terminal className="size-3.5 text-muted-foreground" />
                  <span>View Execution Logs</span>
                </button>

                <button
                  onClick={() => handleTrigger(pipeline)}
                  disabled={isTriggering}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[4px] bg-background hover:bg-muted text-xs font-medium border border-border text-foreground transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isTriggering ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <Play className="size-3.5 text-foreground fill-foreground" />
                      <span>Trigger On-Demand</span>
                    </>
                  )}
                </button>
              </div>
            </BlueprintCard>
          )
        })}
      </div>

      {/* Execution Logs & Details Side Drawer */}
      {inspectPipeline && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          {/* Backdrop Click */}
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() => setInspectPipeline(null)}
            aria-label="Close drawer"
          />

          {/* Side Drawer Panel */}
          <div className="relative w-full max-w-xl md:max-w-2xl h-full bg-card border-l border-border shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300 ease-out">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Terminal className="size-4 text-emerald-500 shrink-0" />
                <h3 className="font-semibold text-sm text-foreground truncate">
                  Execution Inspector: {inspectPipeline.name}
                </h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-[2px] bg-muted text-muted-foreground shrink-0">
                  {inspectPipeline.category}
                </span>
              </div>
              <button
                onClick={() => setInspectPipeline(null)}
                className="p-1.5 rounded-[4px] hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title="Close Drawer (Esc)"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Drawer Scrollable Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-5 text-xs">
              {/* Plain Human Readable Explanation */}
              <div className="p-3.5 rounded-[4px] bg-muted/20 border border-border/60 flex items-start gap-2.5">
                <Info className="size-4 text-sky-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-foreground">Why this pipeline exists:</div>
                  <div className="text-muted-foreground leading-relaxed">
                    {inspectPipeline.description}
                  </div>
                </div>
              </div>

              {/* Execution Status Metadata Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                <div className="p-2.5 rounded-[4px] bg-muted/30 border border-border/50">
                  <div className="text-muted-foreground text-[10px]">TRIGGER TYPE</div>
                  <div className="font-semibold text-foreground uppercase mt-0.5">{inspectPipeline.triggerType}</div>
                </div>
                <div className="p-2.5 rounded-[4px] bg-muted/30 border border-border/50">
                  <div className="text-muted-foreground text-[10px]">LAST STATUS</div>
                  <div className="font-semibold mt-0.5">
                    {activeInspectRun ? (
                      <span className={activeInspectRun.status === "completed" ? "text-emerald-500" : activeInspectRun.status === "failed" ? "text-rose-500" : "text-amber-500"}>
                        {activeInspectRun.status.toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">IDLE (Awaiting Cron)</span>
                    )}
                  </div>
                </div>
                <div className="p-2.5 rounded-[4px] bg-muted/30 border border-border/50">
                  <div className="text-muted-foreground text-[10px]">DURATION</div>
                  <div className="font-semibold text-foreground mt-0.5">
                    {activeInspectRun ? `${activeInspectRun.durationMs}ms` : "N/A"}
                  </div>
                </div>
                <div className="p-2.5 rounded-[4px] bg-muted/30 border border-border/50">
                  <div className="text-muted-foreground text-[10px]">EVENT ID</div>
                  <div className="font-semibold text-foreground truncate mt-0.5" title={activeInspectRun?.eventId || "None"}>
                    {activeInspectRun?.eventId || "Scheduled"}
                  </div>
                </div>
              </div>

              {/* Terminal Logs Window */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>LOG OUTPUT & EVENT TRACE</span>
                  <span>RING BUFFER (LAST RUN)</span>
                </div>
                <div className="p-3.5 rounded-[4px] bg-black text-emerald-400 font-mono text-[11px] leading-relaxed border border-border/80 overflow-x-auto min-h-[160px] max-h-[320px]">
                  {activeInspectRun?.logs && activeInspectRun.logs.length > 0 ? (
                    activeInspectRun.logs.map((logLine, idx) => (
                      <div key={idx} className="whitespace-pre-wrap py-0.5">
                        {logLine}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 space-y-1">
                      <div>[INFO] Pipeline configured: {inspectPipeline.name}</div>
                      <div>[INFO] Trigger event name: {inspectPipeline.triggerEvent}</div>
                      {inspectPipeline.cronSchedule && (
                        <div>[INFO] Cron schedule: {inspectPipeline.cronSchedule}</div>
                      )}
                      <div>[INFO] Retries policy: {inspectPipeline.retries} attempts on network/model fault</div>
                      <div>[STATUS] Ready. Click &apos;Trigger Pipeline On-Demand&apos; below to dispatch an immediate test execution.</div>
                    </div>
                  )}

                  {activeInspectRun?.error && (
                    <div className="text-rose-400 font-bold pt-2 border-t border-rose-900/50 mt-2">
                      [ERROR] {activeInspectRun.error}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Sticky Footer */}
            <div className="flex items-center justify-between p-4 border-t border-border bg-muted/20 shrink-0">
              <a
                href="https://app.inngest.com/env/production"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="size-3.5" />
                <span>Open in Inngest Cloud</span>
              </a>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInspectPipeline(null)}
                  className="px-3 py-1.5 rounded-[4px] border border-border text-xs font-medium hover:bg-muted text-foreground cursor-pointer transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleTrigger(inspectPipeline)}
                  disabled={triggeringId === inspectPipeline.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#533AFD] hover:bg-[#4732d8] text-white text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
                >
                  {triggeringId === inspectPipeline.id ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <Play className="size-3.5 fill-white" />
                      <span>Trigger Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
