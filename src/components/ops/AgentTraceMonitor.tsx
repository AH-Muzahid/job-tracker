"use client"

import * as React from "react"
import {
  CheckCircle2,
  AlertTriangle,
  Terminal,
  Search,
  RefreshCw,
  Send,
  X,
  Copy,
  Check,
  Clock,
  Cpu,
} from "lucide-react"
import type { AgentStepRingItem } from "@/lib/ops/telemetry-ring"

interface AgentTraceMonitorProps {
  steps: AgentStepRingItem[]
  onRefresh: () => void
}

export function AgentTraceMonitor({ steps, onRefresh }: AgentTraceMonitorProps) {
  const [filterQuery, setFilterQuery] = React.useState("")
  const [selectedNode, setSelectedNode] = React.useState<string>("all")
  const [isProbing, setIsProbing] = React.useState(false)
  const [selectedStep, setSelectedStep] = React.useState<AgentStepRingItem | null>(null)
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null)

  const handleCopy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleSendStepProbe = async () => {
    setIsProbing(true)
    try {
      await fetch("/api/admin/ops/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeName: "planner",
          tokens: 184,
          durationMs: 310,
        }),
      })
      onRefresh()
    } catch (err) {
      console.warn("Agent step probe failed:", err)
    } finally {
      setIsProbing(false)
    }
  }

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
              className={`px-2.5 py-1 text-xs rounded-[4px] font-medium transition-colors cursor-pointer ${
                selectedNode === node
                  ? "bg-foreground text-background"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted"
              }`}
            >
              {node === "all" ? "All Nodes" : node}
            </button>
          ))}

          <button
            onClick={handleSendStepProbe}
            disabled={isProbing}
            title="Dispatch a test agent node execution into ring buffer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-muted/40 hover:bg-muted text-foreground border border-border text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ml-1"
          >
            <Send className={`size-3 ${isProbing ? "animate-pulse text-[#533AFD]" : "text-muted-foreground"}`} />
            <span>{isProbing ? "Probing..." : "Test Node Step"}</span>
          </button>

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
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Terminal className="size-8 text-muted-foreground/40" />
                      <p className="text-xs">No active agent trace steps in the current observation ring.</p>
                      <button
                        onClick={handleSendStepProbe}
                        className="mt-1 px-3 py-1 rounded-[4px] text-xs font-medium bg-[#533AFD] text-white hover:bg-[#4732d8] cursor-pointer transition-colors"
                      >
                        Send Test Node Step Now
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSteps.map((step) => (
                  <tr
                    key={step.id}
                    onClick={() => setSelectedStep(step)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    title="Click to view node step details"
                  >
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
                      <div className="inline-flex items-center gap-1.5 group-hover:text-[#533AFD] transition-colors">
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

      {/* Slide-over Detail Drawer */}
      {selectedStep && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div
            className="fixed inset-0"
            onClick={() => setSelectedStep(null)}
          />

          <div className="relative w-full max-w-xl h-full bg-card border-l border-border shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground uppercase">GRAPH NODE EXECUTION</span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-[2px] font-medium ${
                      selectedStep.status === "success"
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                    }`}
                  >
                    {selectedStep.status === "success" ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />}
                    {selectedStep.status.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-foreground font-mono truncate">
                  Node: {selectedStep.nodeName}
                </h3>
              </div>

              <button
                onClick={() => setSelectedStep(null)}
                className="p-1.5 rounded-[4px] hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Quick Stat Tiles */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-[4px] bg-muted/30 border border-border/50">
                  <div className="text-muted-foreground text-[10px] flex items-center gap-1">
                    <Clock className="size-3" /> STEP DURATION
                  </div>
                  <div className="text-lg font-semibold text-foreground mt-0.5 tabular-nums">
                    {selectedStep.durationMs}ms
                  </div>
                </div>

                <div className="p-3 rounded-[4px] bg-muted/30 border border-border/50">
                  <div className="text-muted-foreground text-[10px] flex items-center gap-1">
                    <Cpu className="size-3" /> TOKENS CONSUMED
                  </div>
                  <div className="text-lg font-semibold text-foreground mt-0.5 tabular-nums">
                    {selectedStep.tokens.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Node Attributes */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                  GRAPH NODE ATTRIBUTES
                </div>
                <div className="divide-y divide-border/60 border border-border/60 rounded-[4px] bg-muted/10 text-xs">
                  <div className="flex items-center justify-between p-2.5">
                    <span className="text-muted-foreground">Node Identifier</span>
                    <span className="font-mono font-medium text-foreground">{selectedStep.nodeName}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5">
                    <span className="text-muted-foreground">Session ID</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-muted-foreground truncate max-w-[220px]">{selectedStep.sessionId}</span>
                      <button
                        onClick={() => handleCopy(selectedStep.sessionId, "session")}
                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {copiedKey === "session" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                      </button>
                    </div>
                  </div>
                  {selectedStep.userId && (
                    <div className="flex items-center justify-between p-2.5">
                      <span className="text-muted-foreground">User ID</span>
                      <span className="font-mono text-muted-foreground truncate max-w-[240px]">{selectedStep.userId}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-2.5">
                    <span className="text-muted-foreground">Recorded Time</span>
                    <span className="font-mono text-muted-foreground">
                      {new Date(selectedStep.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Error Trace (if any) */}
              {selectedStep.error && (
                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5" /> ERROR DETAILS
                  </div>
                  <div className="p-3 rounded-[4px] bg-rose-500/10 border border-rose-500/30 text-rose-500 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                    {selectedStep.error}
                  </div>
                </div>
              )}

              {/* Raw JSON Payload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span className="flex items-center gap-1"><Terminal className="size-3" /> RAW STEP PAYLOAD</span>
                  <button
                    onClick={() => handleCopy(JSON.stringify(selectedStep, null, 2), "json")}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {copiedKey === "json" ? (
                      <>
                        <Check className="size-3 text-emerald-500" />
                        <span className="text-emerald-500">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3.5 rounded-[4px] bg-black text-emerald-400 font-mono text-[11px] leading-relaxed border border-border/80 overflow-x-auto max-h-[220px]">
                  {JSON.stringify(selectedStep, null, 2)}
                </pre>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="flex items-center justify-end p-4 border-t border-border bg-muted/20 shrink-0">
              <button
                onClick={() => setSelectedStep(null)}
                className="px-3.5 py-1.5 rounded-[4px] bg-[#533AFD] hover:bg-[#4732d8] text-white text-xs font-medium cursor-pointer transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
