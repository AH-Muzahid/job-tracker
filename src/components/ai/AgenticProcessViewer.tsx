"use client"

import React, { useState } from "react"
import { ChevronDown, ChevronRight, Loader2, CheckCircle2, Terminal, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { ToolInvocation } from "./AIChat"

interface AgenticProcessViewerProps {
  toolInvocations?: ToolInvocation[]
  isStreaming?: boolean
  className?: string
}

interface StepMeta {
  verb: string
  techBadge: { text: string; color: string }
  target: string
  detail: string
  diff?: { add?: number; del?: number }
}

function getStepMetadata(inv: ToolInvocation): StepMeta {
  const { toolName, args, result, state } = inv
  const isExecuting = state === "call"

  switch (toolName) {
    case "createApplication": {
      const company = String(args?.companyName || args?.company || "Company")
      const title = String(args?.jobTitle || args?.title || "Role")
      const status = String(args?.status || "Saved")
      return {
        verb: isExecuting ? "Creating" : "Created",
        techBadge: { text: "DB", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
        target: `${company} • ${title}`,
        detail: isExecuting ? "saving record..." : `+1 record in ${status}`,
        diff: { add: 1 },
      }
    }
    case "updateApplicationStatus": {
      const target = String(args?.companyOrTitle || args?.company || "Application")
      const newStatus = String(args?.newStatus || args?.status || "Updated")
      return {
        verb: isExecuting ? "Updating" : "Updated",
        techBadge: { text: "DB", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
        target: `${target}`,
        detail: isExecuting ? "updating status..." : `Status → ${newStatus}`,
      }
    }
    case "deleteApplication": {
      const target = String(args?.companyOrTitle || "Application")
      return {
        verb: isExecuting ? "Deleting" : "Deleted",
        techBadge: { text: "DB", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
        target: `${target}`,
        detail: isExecuting ? "removing..." : "−1 record",
        diff: { del: 1 },
      }
    }
    case "scrapeJobLink": {
      const url = String(args?.url || "")
      const domain = url.replace(/^https?:\/\//, "").split("/")[0] || "job page"
      return {
        verb: isExecuting ? "Scraping" : "Analyzed",
        techBadge: { text: "WEB", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
        target: domain,
        detail: isExecuting ? "extracting JD..." : "extracted requirements",
      }
    }
    case "draftOutreachEmail":
    case "sendOutreachEmailViaResend": {
      const company = String(args?.company || args?.companyName || "Recruiter")
      return {
        verb: isExecuting ? "Drafting" : "Generated",
        techBadge: { text: "✉️", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
        target: `Outreach • ${company}`,
        detail: isExecuting ? "synthesizing email..." : "high-conversion template",
      }
    }
    case "queryCareerKnowledgeGraph":
    case "syncCareerKnowledgeGraph": {
      return {
        verb: isExecuting ? "Querying" : "Queried",
        techBadge: { text: "GRAPH", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
        target: "Career Knowledge Graph",
        detail: isExecuting ? "indexing skills..." : "verified skill relationships",
      }
    }
    case "tailorResumeForJob": {
      return {
        verb: isExecuting ? "Tailoring" : "Tailored",
        techBadge: { text: "📄", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
        target: "Resume Alignment",
        detail: isExecuting ? "optimizing bullet points..." : "+ATS impact metrics",
      }
    }
    case "saveUserMemory": {
      const key = String(args?.key || "memory")
      return {
        verb: isExecuting ? "Memorizing" : "Memorized",
        techBadge: { text: "MEM", color: "text-teal-400 bg-teal-500/10 border-teal-500/20" },
        target: `User Context • ${key}`,
        detail: isExecuting ? "saving preference..." : "stored across sessions",
      }
    }
    case "batchImportApplications": {
      const count = Array.isArray(args?.applications) ? args.applications.length : 1
      return {
        verb: isExecuting ? "Importing" : "Imported",
        techBadge: { text: "BULK", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
        target: `${count} Applications`,
        detail: isExecuting ? "bulk processing..." : `+${count} records`,
        diff: { add: count },
      }
    }
    default: {
      return {
        verb: isExecuting ? "Executing" : "Executed",
        techBadge: { text: "TOOL", color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20" },
        target: toolName,
        detail: isExecuting ? "running..." : "completed",
      }
    }
  }
}

export default function AgenticProcessViewer({
  toolInvocations,
  isStreaming,
  className,
}: AgenticProcessViewerProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set())

  if (!toolInvocations || toolInvocations.length === 0) {
    return null
  }

  const toggleStep = (idx: number) => {
    setExpandedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const hasRunningTools = toolInvocations.some((t) => t.state === "call")

  return (
    <div className={cn("w-full not-prose mb-3 text-xs", className)}>
      {/* Top Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 py-1 px-2 -ml-2 rounded-md hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground cursor-pointer select-none group"
      >
        <span className="font-mono text-[11px] font-medium flex items-center gap-1.5 text-foreground/80">
          {hasRunningTools ? (
            <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
          ) : (
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          )}
          <span>
            {hasRunningTools ? "Executing Actions" : "Actions Completed"} ({toolInvocations.length})
          </span>
        </span>
        {isOpen ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground/60 transition-transform group-hover:text-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground/60 transition-transform group-hover:text-foreground" />
        )}
      </button>

      {/* Process Stream Steps (Antigravity Terminal Style) */}
      {isOpen && (
        <div className="mt-1.5 pl-2.5 border-l border-border/60 space-y-1.5 transition-all duration-200">
          {toolInvocations.map((inv, idx) => {
            const meta = getStepMetadata(inv)
            const isExpanded = expandedIndices.has(idx)
            const isExecuting = inv.state === "call"

            return (
              <div key={inv.toolCallId || idx} className="space-y-1">
                <div
                  onClick={() => toggleStep(idx)}
                  className="flex items-center gap-2 py-0.5 text-xs font-mono group cursor-pointer hover:text-foreground select-none"
                >
                  {/* Action Verb */}
                  <span className="text-muted-foreground font-normal min-w-[58px]">
                    {meta.verb}
                  </span>

                  {/* Tech/Entity Badge */}
                  <span
                    className={cn(
                      "px-1 py-0.2 rounded border text-[10px] font-medium leading-none shrink-0",
                      meta.techBadge.color
                    )}
                  >
                    {meta.techBadge.text}
                  </span>

                  {/* Target Entity */}
                  <span className="font-medium text-foreground/90 truncate max-w-[220px] sm:max-w-none">
                    {meta.target}
                  </span>

                  {/* Detail / Diff */}
                  <span className="text-[11px] text-muted-foreground/70 shrink-0 font-normal">
                    {meta.detail}
                  </span>

                  {/* Diff Badge if applicable */}
                  {meta.diff?.add && (
                    <span className="text-emerald-500 font-semibold text-[11px]">
                      +{meta.diff.add}
                    </span>
                  )}
                  {meta.diff?.del && (
                    <span className="text-rose-500 font-semibold text-[11px]">
                      −{meta.diff.del}
                    </span>
                  )}

                  {/* Running state indicator or expand chevron */}
                  <span className="ml-auto pr-1">
                    {isExecuting ? (
                      <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                    ) : (
                      <ChevronRight
                        className={cn(
                          "h-3 w-3 text-muted-foreground/40 transition-transform group-hover:text-foreground",
                          isExpanded && "rotate-90 text-foreground"
                        )}
                      />
                    )}
                  </span>
                </div>

                {/* Expanded Payload & Result Box */}
                {isExpanded && (
                  <div className="ml-2 my-1.5 p-2.5 rounded-lg border border-border/70 bg-muted/40 font-mono text-[11px] space-y-2">
                    {/* Tool Input Arguments */}
                    {inv.args && Object.keys(inv.args).length > 0 && (
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1 mb-1">
                          <Terminal className="h-3 w-3" /> Input Parameters
                        </span>
                        <pre className="p-2 rounded bg-background/80 border border-border/50 overflow-x-auto text-[10.5px] text-foreground/90 whitespace-pre-wrap">
                          {JSON.stringify(inv.args, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Tool Output Result */}
                    {inv.result ? (
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1 mb-1">
                          ✓ Execution Output
                        </span>
                        <pre className="p-2 rounded bg-background/80 border border-border/50 overflow-x-auto text-[10.5px] text-emerald-400 dark:text-emerald-300 whitespace-pre-wrap">
                          {typeof inv.result === "string"
                            ? inv.result
                            : JSON.stringify(inv.result, null, 2)}
                        </pre>
                      </div>
                    ) : isExecuting ? (
                      <div className="flex items-center gap-1.5 text-amber-500 text-[11px] py-0.5">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Awaiting backend tool execution response...</span>
                      </div>
                    ) : null}

                    {/* Quick navigation link for application changes */}
                    {(inv.toolName === "createApplication" || inv.toolName === "updateApplicationStatus") && (
                      <div className="pt-1 border-t border-border/40 flex justify-end">
                        <Link
                          href="/applications"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                        >
                          View in Applications Tracker <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
