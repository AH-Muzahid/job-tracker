"use client"

import * as React from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  Send,
  X,
  Copy,
  Check,
  Cpu,
  Clock,
  DollarSign,
  Terminal,
} from "lucide-react"
import type { LLMCallRingItem } from "@/lib/ops/telemetry-ring"

interface LLMUsageMonitorProps {
  calls: LLMCallRingItem[]
  onRefresh: () => void
}

export function LLMUsageMonitor({ calls, onRefresh }: LLMUsageMonitorProps) {
  const [filterQuery, setFilterQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<"all" | "success" | "error">("all")
  const [isProbing, setIsProbing] = React.useState(false)
  const [selectedCall, setSelectedCall] = React.useState<LLMCallRingItem | null>(null)
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null)

  const handleCopy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleSendProbe = async () => {
    setIsProbing(true)
    try {
      await fetch("/api/admin/ops/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "probe:ops-telemetry-ping",
          model: "gpt-4o-mini",
          provider: "openai",
          promptTokens: 128,
          completionTokens: 64,
          latencyMs: 195,
        }),
      })
      onRefresh()
    } catch (err) {
      console.warn("Probe dispatch failed:", err)
    } finally {
      setIsProbing(false)
    }
  }

  const filteredCalls = React.useMemo(() => {
    return calls.filter((call) => {
      const matchesQuery =
        call.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
        call.model.toLowerCase().includes(filterQuery.toLowerCase()) ||
        (call.provider && call.provider.toLowerCase().includes(filterQuery.toLowerCase())) ||
        (call.sessionId && call.sessionId.toLowerCase().includes(filterQuery.toLowerCase()))

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
            placeholder="Search action, model, session ID..."
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
              className={`px-2.5 py-1 text-xs rounded-[4px] font-medium transition-colors cursor-pointer ${
                statusFilter === "all"
                  ? "bg-foreground text-background"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted"
              }`}
            >
              All ({calls.length})
            </button>
            <button
              onClick={() => setStatusFilter("success")}
              className={`px-2.5 py-1 text-xs rounded-[4px] font-medium transition-colors cursor-pointer ${
                statusFilter === "success"
                  ? "bg-emerald-600 text-white"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted"
              }`}
            >
              Success ({calls.filter((c) => c.status === "success").length})
            </button>
            <button
              onClick={() => setStatusFilter("error")}
              className={`px-2.5 py-1 text-xs rounded-[4px] font-medium transition-colors cursor-pointer ${
                statusFilter === "error"
                  ? "bg-rose-600 text-white"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted"
              }`}
            >
              Errors ({calls.filter((c) => c.status === "error").length})
            </button>
          </div>

          <button
            onClick={handleSendProbe}
            disabled={isProbing}
            title="Dispatch a test telemetry probe into the ring buffer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-muted/40 hover:bg-muted text-foreground border border-border text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <Send className={`size-3 ${isProbing ? "animate-pulse text-[#533AFD]" : "text-muted-foreground"}`} />
            <span>{isProbing ? "Sending..." : "Send Test Probe"}</span>
          </button>

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
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Cpu className="size-8 text-muted-foreground/40" />
                      <p className="text-xs">No LLM calls recorded in the current observation window.</p>
                      <button
                        onClick={handleSendProbe}
                        className="mt-1 px-3 py-1 rounded-[4px] text-xs font-medium bg-[#533AFD] text-white hover:bg-[#4732d8] cursor-pointer transition-colors"
                      >
                        Send Test Probe Now
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCalls.map((call) => (
                  <tr
                    key={call.id}
                    onClick={() => setSelectedCall(call)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    title="Click to view full trace drawer"
                  >
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
                      <div className="truncate max-w-[200px] group-hover:text-[#533AFD] transition-colors" title={call.name}>
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

      {/* Slide-over Detail Drawer */}
      {selectedCall && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div
            className="fixed inset-0"
            onClick={() => setSelectedCall(null)}
          />

          <div className="relative w-full max-w-xl h-full bg-card border-l border-border shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground uppercase">LLM TELEMETRY TRACE</span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-[2px] font-medium ${
                      selectedCall.status === "success"
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                    }`}
                  >
                    {selectedCall.status === "success" ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />}
                    {selectedCall.status.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-foreground font-mono truncate">
                  {selectedCall.name}
                </h3>
              </div>

              <button
                onClick={() => setSelectedCall(null)}
                className="p-1.5 rounded-[4px] hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Top 4 Quick Stat Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-[4px] bg-muted/30 border border-border/50">
                  <div className="text-muted-foreground text-[10px] flex items-center gap-1">
                    <Clock className="size-3" /> LATENCY
                  </div>
                  <div className="font-semibold text-foreground mt-0.5 tabular-nums">
                    {selectedCall.latencyMs}ms
                  </div>
                </div>

                <div className="p-2.5 rounded-[4px] bg-muted/30 border border-border/50">
                  <div className="text-muted-foreground text-[10px] flex items-center gap-1">
                    <DollarSign className="size-3" /> EST. COST
                  </div>
                  <div className="font-semibold text-emerald-500 mt-0.5 tabular-nums">
                    ${selectedCall.estimatedCostUsd.toFixed(4)}
                  </div>
                </div>

                <div className="p-2.5 rounded-[4px] bg-muted/30 border border-border/50">
                  <div className="text-muted-foreground text-[10px] flex items-center gap-1">
                    <Cpu className="size-3" /> TOTAL TOKENS
                  </div>
                  <div className="font-semibold text-foreground mt-0.5 tabular-nums">
                    {selectedCall.totalTokens.toLocaleString()}
                  </div>
                </div>

                <div className="p-2.5 rounded-[4px] bg-muted/30 border border-border/50">
                  <div className="text-muted-foreground text-[10px]">SPLIT (P / C)</div>
                  <div className="font-semibold text-foreground mt-0.5 text-xs tabular-nums">
                    {selectedCall.promptTokens} / {selectedCall.completionTokens}
                  </div>
                </div>
              </div>

              {/* Identification & Context */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                  EXECUTION ATTRIBUTES
                </div>
                <div className="divide-y divide-border/60 border border-border/60 rounded-[4px] bg-muted/10 text-xs">
                  <div className="flex items-center justify-between p-2.5">
                    <span className="text-muted-foreground">Model Identifier</span>
                    <span className="font-mono font-medium text-foreground">{selectedCall.model}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5">
                    <span className="text-muted-foreground">Provider</span>
                    <span className="font-mono text-foreground capitalize">{selectedCall.provider}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5">
                    <span className="text-muted-foreground">Trace ID</span>
                    <span className="font-mono text-muted-foreground truncate max-w-[260px]">{selectedCall.id}</span>
                  </div>
                  {selectedCall.sessionId && (
                    <div className="flex items-center justify-between p-2.5">
                      <span className="text-muted-foreground">Session ID</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-muted-foreground truncate max-w-[200px]">{selectedCall.sessionId}</span>
                        <button
                          onClick={() => handleCopy(selectedCall.sessionId!, "session")}
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {copiedKey === "session" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                        </button>
                      </div>
                    </div>
                  )}
                  {selectedCall.userId && (
                    <div className="flex items-center justify-between p-2.5">
                      <span className="text-muted-foreground">User ID</span>
                      <span className="font-mono text-muted-foreground truncate max-w-[260px]">{selectedCall.userId}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-2.5">
                    <span className="text-muted-foreground">Recorded Time</span>
                    <span className="font-mono text-muted-foreground">
                      {new Date(selectedCall.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Error Trace (if any) */}
              {selectedCall.error && (
                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5" /> ERROR DETAILS
                  </div>
                  <div className="p-3 rounded-[4px] bg-rose-500/10 border border-rose-500/30 text-rose-500 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                    {selectedCall.error}
                  </div>
                </div>
              )}

              {/* Raw JSON Payload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span className="flex items-center gap-1"><Terminal className="size-3" /> RAW TELEMETRY PAYLOAD</span>
                  <button
                    onClick={() => handleCopy(JSON.stringify(selectedCall, null, 2), "json")}
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
                  {JSON.stringify(selectedCall, null, 2)}
                </pre>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="flex items-center justify-end p-4 border-t border-border bg-muted/20 shrink-0">
              <button
                onClick={() => setSelectedCall(null)}
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
