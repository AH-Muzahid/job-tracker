"use client"

import * as React from "react"
import { Play, Clock, CheckCircle2, AlertCircle, RefreshCw, Layers, ShieldCheck } from "lucide-react"
import { BlueprintCard, BlueprintCardHeader, BlueprintCardTitle, BlueprintCardContent } from "@/components/primitives/BlueprintCard"
import type { InngestPipelineMetadata, PipelineCategory } from "@/lib/ops/inngest-catalog"
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

  return (
    <div className="space-y-4">
      {/* Category Filter Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-border">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors ${
              selectedCategory === cat
                ? "bg-foreground text-background"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
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

              <div className="p-4 pt-0">
                <button
                  onClick={() => handleTrigger(pipeline)}
                  disabled={isTriggering}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[4px] bg-background hover:bg-muted text-xs font-medium border border-border text-foreground transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isTriggering ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      <span>Dispatching Event...</span>
                    </>
                  ) : (
                    <>
                      <Play className="size-3.5 text-foreground fill-foreground" />
                      <span>Trigger Pipeline On-Demand</span>
                    </>
                  )}
                </button>
              </div>
            </BlueprintCard>
          )
        })}
      </div>
    </div>
  )
}
