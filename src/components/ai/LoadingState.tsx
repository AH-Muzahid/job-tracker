"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { ToolInvocation } from "./AIChat";

interface LoadingStateProps {
  label?: string;
  reasoning?: string;
  toolInvocations?: ToolInvocation[];
  isFinished?: boolean;
  className?: string;
}

function useElapsed(isFinished?: boolean) {
  const [ds, setDs] = useState(0);
  useEffect(() => {
    if (isFinished) return;
    const t = setInterval(() => setDs((d) => d + 1), 100);
    return () => clearInterval(t);
  }, [isFinished]);
  const total = ds / 10;
  const timeStr = total < 60 ? `${total.toFixed(1)}s` : `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`;
  return { elapsed: timeStr, seconds: total };
}

function getToolLabel(toolName: string): string {
  const labels: Record<string, string> = {
    createApplication: "Saving application",
    updateApplicationStatus: "Updating status",
    deleteApplication: "Deleting application",
    searchExternalJobs: "Searching job boards",
    saveJobOpportunityToTracker: "Saving job opportunity",
    scrapeJobLink: "Scraping job listing",
    researchCompanyIntel: "Researching company",
    draftOutreachEmail: "Drafting email",
    sendOutreachEmailViaResend: "Sending email",
    getPipelineStats: "Calculating stats",
    listUserApplications: "Fetching applications",
    searchApplications: "Searching applications",
    tailorResumeForJob: "Tailoring resume",
    batchImportApplications: "Importing applications",
    queryCareerKnowledgeGraph: "Querying knowledge graph",
    syncCareerKnowledgeGraph: "Syncing knowledge graph",
    saveUserMemory: "Saving memory",
    searchUserMemories: "Searching memories",
    getUserMemories: "Fetching memories",
    createWeeklyGoal: "Setting weekly goal",
  };
  return labels[toolName] || "Processing";
}

function getToolIcon(toolName: string): string {
  const icons: Record<string, string> = {
    createApplication: "+",
    updateApplicationStatus: "~",
    deleteApplication: "-",
    searchExternalJobs: "*",
    saveJobOpportunityToTracker: "+",
    scrapeJobLink: ">",
    researchCompanyIntel: "*",
    draftOutreachEmail: "@",
    sendOutreachEmailViaResend: "@",
    getPipelineStats: "#",
    listUserApplications: ":",
    searchApplications: ":",
    tailorResumeForJob: "%",
    batchImportApplications: "+",
    queryCareerKnowledgeGraph: "?",
    syncCareerKnowledgeGraph: "~",
    saveUserMemory: "^",
    searchUserMemories: "^",
    getUserMemories: "^",
    createWeeklyGoal: "!",
  };
  return icons[toolName] || ".";
}

export default function LoadingState({
  label,
  reasoning,
  toolInvocations = [],
  isFinished = false,
  className = "",
}: LoadingStateProps) {
  const { elapsed } = useElapsed(isFinished);
  const [isThoughtOpen, setIsThoughtOpen] = useState(false);

  const hasToolCalls = toolInvocations.length > 0;

  // If the model streams raw reasoning / thought tokens
  if (reasoning && reasoning.trim()) {
    return (
      <div className={cn("w-full not-prose my-1 text-xs select-none", className)}>
        <button
          type="button"
          onClick={() => setIsThoughtOpen(!isThoughtOpen)}
          className="inline-flex items-center gap-1.5 py-0.5 px-1.5 -ml-1.5 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground cursor-pointer group"
        >
          {isFinished ? (
            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
          ) : (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />
          )}
          <span className="font-medium text-[11px] text-foreground/80">
            {isFinished ? `Thought for ${elapsed}` : `Thinking`}
          </span>
          {isThoughtOpen ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground/50" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
          )}
        </button>

        {isThoughtOpen && (
          <div className="mt-1 ml-1 pl-2 border-l border-border/50 py-1 text-muted-foreground/80 text-[11px] leading-relaxed max-h-[200px] overflow-y-auto">
            <div className="prose prose-xs dark:prose-invert prose-p:my-0.5 max-w-none text-muted-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {reasoning}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Tool calls in progress - show like OpenCode/terminal style
  if (hasToolCalls) {
    return (
      <div className={cn("w-full not-prose my-1 text-[11px] font-mono select-none", className)}>
        {toolInvocations.map((tool, idx) => {
          const isRunning = tool.state === "call";
          const isDone = tool.state === "result";
          const label = getToolLabel(tool.toolName);
          const icon = getToolIcon(tool.toolName);

          return (
            <div key={tool.toolCallId || idx} className="flex items-center gap-1.5 py-0.5 text-muted-foreground/70">
              <span className="text-muted-foreground/40 w-3 text-right shrink-0">
                {isRunning ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin text-amber-500" />
                ) : (
                  <span className="text-emerald-500">✓</span>
                )}
              </span>
              <span className="text-muted-foreground/50 shrink-0">{icon}</span>
              <span className={cn(
                "truncate",
                isRunning && "text-foreground/70",
                isDone && "text-muted-foreground/50"
              )}>
                {label}
              </span>
              {isRunning && (
                <span className="text-muted-foreground/40 tabular-nums shrink-0">{elapsed}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Default thinking state
  return (
    <div role="status" className={cn("flex items-center gap-1.5 py-0.5 select-none", className)}>
      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />
      <span className="text-[11px] font-medium text-foreground/70">
        {label || "Thinking"}
      </span>
      <span className="text-[10px] text-muted-foreground/50 tabular-nums">
        {elapsed}
      </span>
    </div>
  );
}
