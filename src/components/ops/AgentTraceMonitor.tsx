"use client"

import * as React from "react"
import { CheckCircle2, AlertTriangle, Terminal, Search, RefreshCw } from "lucide-react"
import type { AgentStepRingItem } from "@/lib/ops/telemetry-ring"

interface AgentTraceMonitorProps {
  steps: AgentStepRingItem[]
  onRefresh: () => void
}

export function AgentTraceMonitor({ steps, onRefresh }: AgentTraceMonitorProps) {
  const [filterQuery, setFilterQuery] = React.useState("")
  const [selectedNode, setSelectedNode] = React.useState<string>("all")

  const nodes = React.useMemo(() => {
    const set = new Set<string>()
    steps.forEach((s) => set.add(s.nodeName))
    return ["all", ...Array.from(set)]
  }, [steps])

  const filteredSteps = React.useMemo(() => {
    return steps.filter((step) => {
      const matchesQuery =
        step.nodeName.toLowerCase().includes(filterQuery.toLowerCase()) ||
        step.sessionId.toLowerCase().includes(filterQuery.toLowerCase())

      const matchesNode = selectedNode === "all" || step.nodeName === selectedNode

      return matchesQuery && matchesNode
    })
  }, [steps, filterQuery, selectedNode])

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-2 border-b border-border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by node name or session ID..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[4px] bg-muted/40 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {nodes.map((node) => (
            <button
              key={node}
              onClick={() => setSelectedNode(node)}
              className={`px-2.5 py-1 text-xs rounded-[4px] font-medium transition-colors ${
                selectedNode === node
                  ? "bg-foreground text-background"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted"
              }`}
            >
              {node === "all" ? "All Nodes" : node}
            </button>
          ))}

          <button
            onClick={onRefresh}
            title="Refresh agent steps"
            className="p-1.5 rounded-[4px] bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer ml-1"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Agent Trace Table */}
      <div className="border border-border rounded-[6px] overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Graph Node</th>
                <th className="py-2.5 px-3">Session ID</th>
                <th className="py-2.5 px-3 text-right">Tokens Consumed</th>
                <th className="py-2.5 px-3 text-right">Step Duration</th>
                <th className="py-2.5 px-3 text-right">Recorded Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredSteps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No active agent trace steps in the current observation ring.
                  </td>
                </tr>
              ) : (
                filteredSteps.map((step) => (
                  <tr key={step.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {step.status === "success" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500">
                          <CheckCircle2 className="size-3" />
                          PASS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-500">
                          <AlertTriangle className="size-3" />
                          FAIL
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-foreground">
                      <div className="inline-flex items-center gap-1.5">
                        <Terminal className="size-3 text-muted-foreground" />
                        <span className="font-mono text-xs">{step.nodeName}</span>
                      </div>
                      {step.error && (
                        <div className="text-[10px] text-rose-500 font-mono mt-0.5 truncate max-w-[280px]" title={step.error}>
                          {step.error}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground truncate max-w-[140px]" title={step.sessionId}>
                      {step.sessionId}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-foreground whitespace-nowrap">
                      {step.tokens.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-foreground whitespace-nowrap">
                      {step.durationMs}ms
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-muted-foreground text-[11px] whitespace-nowrap">
                      {new Date(step.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
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
