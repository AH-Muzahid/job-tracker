"use client"

import * as React from "react"
import { AlertTriangle, CheckCircle2, Search, RefreshCw } from "lucide-react"
import type { LLMCallRingItem } from "@/lib/ops/telemetry-ring"

interface LLMUsageMonitorProps {
  calls: LLMCallRingItem[]
  onRefresh: () => void
}

export function LLMUsageMonitor({ calls, onRefresh }: LLMUsageMonitorProps) {
  const [filterQuery, setFilterQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<"all" | "success" | "error">("all")

  const filteredCalls = React.useMemo(() => {
    return calls.filter((call) => {
      const matchesQuery =
        call.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
        call.model.toLowerCase().includes(filterQuery.toLowerCase()) ||
        (call.provider && call.provider.toLowerCase().includes(filterQuery.toLowerCase()))

      const matchesStatus =
        statusFilter === "all" || call.status === statusFilter

      return matchesQuery && matchesStatus
    })
  }, [calls, filterQuery, statusFilter])

  const totalCost = React.useMemo(() => {
    return calls.reduce((acc, c) => acc + (c.estimatedCostUsd || 0), 0)
  }, [calls])

  const totalTokens = React.useMemo(() => {
    return calls.reduce((acc, c) => acc + c.totalTokens, 0)
  }, [calls])

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-2 border-b border-border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by action, model, or provider..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[4px] bg-muted/40 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground px-2 py-1 rounded-[4px] bg-muted/20 border border-border/50">
            <span>Tokens: <strong className="text-foreground">{totalTokens.toLocaleString()}</strong></span>
            <span>•</span>
            <span>Cost: <strong className="text-emerald-500">${totalCost.toFixed(4)}</strong></span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 text-xs rounded-[4px] font-medium transition-colors ${
                statusFilter === "all"
                  ? "bg-foreground text-background"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted"
              }`}
            >
              All ({calls.length})
            </button>
            <button
              onClick={() => setStatusFilter("success")}
              className={`px-2.5 py-1 text-xs rounded-[4px] font-medium transition-colors ${
                statusFilter === "success"
                  ? "bg-emerald-600 text-white"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted"
              }`}
            >
              Success ({calls.filter((c) => c.status === "success").length})
            </button>
            <button
              onClick={() => setStatusFilter("error")}
              className={`px-2.5 py-1 text-xs rounded-[4px] font-medium transition-colors ${
                statusFilter === "error"
                  ? "bg-rose-600 text-white"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted"
              }`}
            >
              Errors ({calls.filter((c) => c.status === "error").length})
            </button>
          </div>

          <button
            onClick={onRefresh}
            title="Refresh LLM calls"
            className="p-1.5 rounded-[4px] bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      </div>

      {/* LLM Calls Table */}
      <div className="border border-border rounded-[6px] overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Action / Endpoint</th>
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3 text-right">Tokens (Prompt / Comp)</th>
                <th className="py-2.5 px-3 text-right">Latency</th>
                <th className="py-2.5 px-3 text-right">Est. Cost</th>
                <th className="py-2.5 px-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    No LLM calls recorded in the current observation window.
                  </td>
                </tr>
              ) : (
                filteredCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {call.status === "success" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500">
                          <CheckCircle2 className="size-3" />
                          OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-500">
                          <AlertTriangle className="size-3" />
                          ERR
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-foreground">
                      <div className="truncate max-w-[200px]" title={call.name}>
                        {call.name}
                      </div>
                      {call.error && (
                        <div className="text-[10px] text-rose-500 truncate max-w-[220px]" title={call.error}>
                          {call.error}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded-[2px] bg-muted text-foreground border border-border/50">
                        {call.model}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-foreground whitespace-nowrap">
                      <span className="font-semibold">{call.totalTokens.toLocaleString()}</span>
                      <span className="text-muted-foreground text-[10px] ml-1">
                        ({call.promptTokens.toLocaleString()} / {call.completionTokens.toLocaleString()})
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-foreground whitespace-nowrap">
                      {call.latencyMs}ms
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-500 font-medium whitespace-nowrap">
                      ${call.estimatedCostUsd.toFixed(4)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-muted-foreground text-[11px] whitespace-nowrap">
                      {new Date(call.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
