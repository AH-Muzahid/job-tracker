"use client"

import * as React from "react"
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Search,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  X,
  Send,
  Terminal,
  Code,
} from "lucide-react"
import type { AppLogRingItem } from "@/lib/ops/telemetry-ring"

interface AppLogMonitorProps {
  logs: AppLogRingItem[]
  onRefresh: () => void
}

export function AppLogMonitor({ logs, onRefresh }: AppLogMonitorProps) {
  const [filterQuery, setFilterQuery] = React.useState("")
  const [levelFilter, setLevelFilter] = React.useState<"all" | "error" | "warn" | "info">("all")
  const [sourceFilter, setSourceFilter] = React.useState<string>("all")
  const [selectedLog, setSelectedLog] = React.useState<AppLogRingItem | null>(null)
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null)
  const [isSendingProbe, setIsSendingProbe] = React.useState(false)
  const [isClearing, setIsClearing] = React.useState(false)

  const handleCopy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleSendTestLog = async (level: "error" | "warn" | "info") => {
    setIsSendingProbe(true)
    try {
      await fetch("/api/admin/ops/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level,
          source: level === "error" ? "test:error-probe" : level === "warn" ? "test:warn-probe" : "test:event-probe",
          message:
            level === "error"
              ? "Simulated operational error: Database query timeout or 500 downstream failure"
              : level === "warn"
              ? "Simulated warning: Model rate limit approaching threshold"
              : "Simulated milestone: Candidate application package staged successfully",
          error: level === "error" ? "TimeoutError: Request exceeded 10000ms threshold" : undefined,
          metadata: {
            environment: process.env.NODE_ENV || "production",
            probeTime: new Date().toISOString(),
            simulatedId: `probe_${Date.now()}`,
          },
        }),
      })
      onRefresh()
    } catch (err) {
      console.warn("Failed to dispatch test log:", err)
    } finally {
      setIsSendingProbe(false)
    }
  }

  const handleClearLogs = async () => {
    if (!confirm("Are you sure you want to clear the application log ring buffer?")) return
    setIsClearing(true)
    try {
      await fetch("/api/admin/ops/logs", { method: "DELETE" })
      onRefresh()
      setSelectedLog(null)
    } catch (err) {
      console.warn("Failed to clear logs:", err)
    } finally {
      setIsClearing(false)
    }
  }

  const uniqueSources = React.useMemo(() => {
    const set = new Set<string>()
    logs.forEach((l) => {
      if (l.source) set.add(l.source)
    })
    return Array.from(set).sort()
  }, [logs])

  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      const matchesQuery =
        log.message.toLowerCase().includes(filterQuery.toLowerCase()) ||
        log.source.toLowerCase().includes(filterQuery.toLowerCase()) ||
        (log.error && log.error.toLowerCase().includes(filterQuery.toLowerCase())) ||
        (log.userId && log.userId.toLowerCase().includes(filterQuery.toLowerCase()))

      const matchesLevel = levelFilter === "all" || log.level === levelFilter
      const matchesSource = sourceFilter === "all" || log.source === sourceFilter

      return matchesQuery && matchesLevel && matchesSource
    })
  }, [logs, filterQuery, levelFilter, sourceFilter])

  const stats = React.useMemo(() => {
    const errorCount = logs.filter((l) => l.level === "error").length
    const warnCount = logs.filter((l) => l.level === "warn").length
    const infoCount = logs.filter((l) => l.level === "info").length
    return { errorCount, warnCount, infoCount }
  }, [logs])

  return (
    <div className="space-y-4">
      {/* Search & Filter Header Strip */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-2 border-b border-border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search logs, errors, sources, stack..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[4px] bg-muted/40 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Level Filter Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLevelFilter("all")}
              className={`px-2.5 py-1 text-xs rounded-[4px] font-medium transition-colors cursor-pointer ${
                levelFilter === "all"
                  ? "bg-foreground text-background"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted"
              }`}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setLevelFilter("error")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-[4px] font-medium transition-colors cursor-pointer ${
                levelFilter === "error"
                  ? "bg-rose-500 text-white"
                  : "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
              }`}
            >
              <AlertCircle className="size-3" />
              <span>Errors ({stats.errorCount})</span>
            </button>
            <button
              onClick={() => setLevelFilter("warn")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-[4px] font-medium transition-colors cursor-pointer ${
                levelFilter === "warn"
                  ? "bg-amber-500 text-white"
                  : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
              }`}
            >
              <AlertTriangle className="size-3" />
              <span>Warn ({stats.warnCount})</span>
            </button>
            <button
              onClick={() => setLevelFilter("info")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-[4px] font-medium transition-colors cursor-pointer ${
                levelFilter === "info"
                  ? "bg-sky-500 text-white"
                  : "bg-sky-500/10 text-sky-500 hover:bg-sky-500/20"
              }`}
            >
              <Info className="size-3" />
              <span>Info ({stats.infoCount})</span>
            </button>
          </div>

          {/* Source Dropdown Filter */}
          {uniqueSources.length > 0 && (
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="text-xs px-2 py-1 rounded-[4px] bg-muted/40 border border-border text-foreground font-mono cursor-pointer"
            >
              <option value="all">All Sources ({uniqueSources.length})</option>
              {uniqueSources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}

          {/* Action Tools */}
          <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
            <button
              onClick={() => handleSendTestLog("error")}
              disabled={isSendingProbe}
              title="Dispatch a test error to verify ring buffer capture"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-[4px] border border-border bg-card hover:bg-muted text-[11px] text-muted-foreground hover:text-foreground font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Send className="size-3 text-rose-500" />
              <span>Test Error</span>
            </button>

            <button
              onClick={handleClearLogs}
              disabled={isClearing || logs.length === 0}
              title="Clear all recorded application logs"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-[4px] border border-border bg-card hover:bg-muted text-[11px] text-rose-500 hover:text-rose-600 font-medium transition-colors disabled:opacity-30 cursor-pointer"
            >
              <Trash2 className="size-3" />
              <span>Clear</span>
            </button>

            <button
              onClick={onRefresh}
              title="Refresh log stream"
              className="p-1 rounded-[4px] border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <RefreshCw className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Table / List Surface */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground space-y-2">
            <Terminal className="size-8 mx-auto text-muted-foreground/40" />
            <div className="text-sm font-medium">No application logs recorded</div>
            <p className="text-xs max-w-sm mx-auto">
              {filterQuery || levelFilter !== "all" || sourceFilter !== "all"
                ? "No logs match the current filters. Clear your filters to see older records."
                : "Operational failures, unhandled exceptions, and key platform events will stream into this buffer in real time."}
            </p>
            <div className="pt-2">
              <button
                onClick={() => handleSendTestLog("error")}
                disabled={isSendingProbe}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#533AFD] hover:bg-[#4732d8] text-white text-xs font-medium cursor-pointer"
              >
                <Send className="size-3" />
                <span>Emit Test Error Log</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border font-mono text-xs">
            {filteredLogs.map((log) => {
              const isSelected = selectedLog?.id === log.id
              const isError = log.level === "error"
              const isWarn = log.level === "warn"

              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(isSelected ? null : log)}
                  className={`p-3 transition-colors cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-muted/60"
                      : isError
                      ? "bg-rose-500/[0.03] hover:bg-rose-500/[0.06]"
                      : isWarn
                      ? "bg-amber-500/[0.02] hover:bg-amber-500/[0.05]"
                      : "hover:bg-muted/30"
                  }`}
                >
                  {/* Left Column: Level pill + Source + Message */}
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase shrink-0 mt-0.5 ${
                        isError
                          ? "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                          : isWarn
                          ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                          : "bg-sky-500/15 text-sky-500 border border-sky-500/30"
                      }`}
                    >
                      {isError ? (
                        <AlertCircle className="size-2.5" />
                      ) : isWarn ? (
                        <AlertTriangle className="size-2.5" />
                      ) : (
                        <Info className="size-2.5" />
                      )}
                      <span>{log.level}</span>
                    </span>

                    <span className="px-1.5 py-0.5 rounded-[4px] bg-muted/60 border border-border/80 text-[11px] text-foreground font-semibold shrink-0">
                      {log.source}
                    </span>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="font-sans font-medium text-foreground text-xs leading-snug line-clamp-2">
                        {log.message}
                      </div>
                      {log.error && (
                        <div className="text-[11px] text-rose-500 truncate max-w-xl font-mono">
                          ↳ {log.error}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: User ID + Timestamp */}
                  <div className="flex items-center gap-3 shrink-0 text-muted-foreground text-[11px]">
                    {log.userId && (
                      <span className="hidden lg:inline text-muted-foreground/70" title={`User: ${log.userId}`}>
                        usr:{log.userId.slice(0, 8)}...
                      </span>
                    )}

                    <span title={log.timestamp}>
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Log Details Slide-in Drawer */}
      {selectedLog && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] bg-background border-l border-border shadow-2xl p-6 flex flex-col space-y-4 overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase ${
                    selectedLog.level === "error"
                      ? "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                      : selectedLog.level === "warn"
                      ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                      : "bg-sky-500/15 text-sky-500 border border-sky-500/30"
                  }`}
                >
                  {selectedLog.level}
                </span>
                <span className="font-mono text-xs font-semibold text-foreground">
                  {selectedLog.source}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground font-mono mt-1">
                {selectedLog.id} • {new Date(selectedLog.timestamp).toLocaleString()}
              </div>
            </div>

            <button
              onClick={() => setSelectedLog(null)}
              className="p-1 rounded-[4px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Message Section */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-foreground">Message</div>
            <div className="p-3 rounded-[4px] bg-muted/40 border border-border text-xs text-foreground font-sans leading-relaxed break-words">
              {selectedLog.message}
            </div>
          </div>

          {/* Error Details Section (If Present) */}
          {selectedLog.error && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-rose-500">
                <span>Error Details</span>
                <button
                  onClick={() => handleCopy(selectedLog.error || "", "error")}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer font-sans"
                >
                  {copiedKey === "error" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  <span>{copiedKey === "error" ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <pre className="p-3 rounded-[4px] bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-mono whitespace-pre-wrap break-all">
                {selectedLog.error}
              </pre>
            </div>
          )}

          {/* Stack Trace (If Present) */}
          {selectedLog.stack && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span>Stack Trace</span>
                <button
                  onClick={() => handleCopy(selectedLog.stack || "", "stack")}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer font-sans"
                >
                  {copiedKey === "stack" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  <span>{copiedKey === "stack" ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <pre className="p-3 rounded-[4px] bg-muted/60 border border-border text-[11px] text-muted-foreground font-mono max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
                {selectedLog.stack}
              </pre>
            </div>
          )}

          {/* Metadata JSON Section (If Present) */}
          {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span className="flex items-center gap-1.5">
                  <Code className="size-3.5 text-muted-foreground" />
                  <span>Metadata Context</span>
                </span>
                <button
                  onClick={() => handleCopy(JSON.stringify(selectedLog.metadata, null, 2), "meta")}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer font-sans"
                >
                  {copiedKey === "meta" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  <span>{copiedKey === "meta" ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <pre className="p-3 rounded-[4px] bg-muted/40 border border-border text-[11px] text-foreground font-mono max-h-56 overflow-y-auto whitespace-pre-wrap break-all">
                {JSON.stringify(selectedLog.metadata, null, 2)}
              </pre>
            </div>
          )}

          {/* Metadata Footer */}
          <div className="pt-2 border-t border-border mt-auto space-y-1 text-[11px] font-mono text-muted-foreground">
            <div>User ID: {selectedLog.userId || "anonymous / system"}</div>
            <div>Timestamp: {selectedLog.timestamp}</div>
          </div>
        </div>
      )}
    </div>
  )
}
