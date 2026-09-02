"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { type ToolInvocation } from "./AIChat";

/* ─────────────────────────────────────────────────────────
 * TOOL CHIPS
 * An agent run as compact rows: tool calls with inline
 * chips, then file-diff chips summarizing the edits.
 * Hover a row to reveal its chevron; every row expands
 * to show what the tool actually did.
 * ───────────────────────────────────────────────────────── */

const STEP_MS = 700;

const Icons: Record<string, React.ReactNode> = {
  think: <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />,
  write: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
    </g>
  ),
  run: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 17l6-5-6-5M12 19h8" />
    </g>
  ),
  read: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </g>
  ),
  search: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </g>
  ),
};

export type DetailLine = { text: string; tone?: "add" | "del" | "ctx" };

export type ToolChipRow = {
  id?: string;
  icon: string;
  label: string;
  chip: string;
  mono?: boolean;
  detailMono?: boolean;
  detail: DetailLine[];
};

export type DiffChip = {
  file: string;
  add: number;
  del: number;
  lines?: DiffLine[];
};

export type DiffLine = { text: string; tone: "add" | "del" | "ctx" };

const DEFAULT_ROWS: ToolChipRow[] = [
  {
    icon: "think",
    label: "Thinking",
    chip: "Planning the application workflow…",
    mono: false,
    detailMono: false,
    detail: [
      { text: "Candidate skills match 92% of senior backend requirements." },
      { text: "Targeting tailored STAR response for system architecture questions." },
    ],
  },
  {
    icon: "write",
    label: "Generate resume bullets",
    chip: "Resume_Senior_Engineer.pdf",
    mono: true,
    detailMono: true,
    detail: [
      { text: "+ Architected distributed event stream pipeline (15k ops/sec)", tone: "add" },
      { text: "+ Reduced cloud compute overhead by 34% via Redis caching", tone: "add" },
    ],
  },
  {
    icon: "run",
    label: "Sync Career Graph",
    chip: "CareerKnowledgeGraph.sync()",
    mono: true,
    detailMono: true,
    detail: [
      { text: "✓ verified 6 matching skill nodes" },
      { text: "✓ updated 3 application pipeline milestones" },
    ],
  },
  {
    icon: "read",
    label: "Read job intake",
    chip: "Stripe_Senior_Engineer.jd",
    mono: true,
    detailMono: false,
    detail: [
      { text: "Full-stack TypeScript / Go, Distributed Systems, High Availability" },
      { text: "Competitive compensation band: $190k - $240k" },
    ],
  },
];

const DEFAULT_DIFFS: DiffChip[] = [
  { file: "resume.md", add: 14, del: 2 },
  { file: "outreach-email.txt", add: 8, del: 0 },
  { file: "prep-notes.md", add: 12, del: 3 },
];

const DEFAULT_DIFF_LINES: Record<string, DiffLine[]> = {
  "resume.md": [
    { text: "## Experience Summary", tone: "ctx" },
    { text: "- Software Engineer with 3 years experience", tone: "del" },
    { text: "+ Senior Full-Stack Engineer specializing in resilient cloud services", tone: "add" },
    { text: "+ Led zero-downtime migration of PostgreSQL cluster", tone: "add" },
    { text: "## Key Technologies", tone: "ctx" },
  ],
  "outreach-email.txt": [
    { text: "Subject: Application for Senior Engineer - CareerTrack", tone: "add" },
    { text: "Hi Hiring Team, I noticed your opening for the infrastructure team...", tone: "add" },
    { text: "Looking forward to connecting,", tone: "add" },
  ],
  "prep-notes.md": [
    { text: "### Key Technical Discussion Points:", tone: "ctx" },
    { text: "- Low latency caching architecture", tone: "del" },
    { text: "+ Multi-region Redis cache synchronization & failover", tone: "add" },
    { text: "+ Asynchronous job scheduling with Inngest & resilient workers", tone: "add" },
  ],
};

function formatToolInvocations(invocations: ToolInvocation[]): { rows: ToolChipRow[]; diffs: DiffChip[] } {
  const rows: ToolChipRow[] = invocations.map((inv) => {
    let icon = "run";
    let label = `Execute ${inv.toolName}`;
    let chip = inv.toolName;
    const detail: DetailLine[] = [];

    if (inv.toolName === "scrapeJobLink") {
      icon = "read";
      label = "Read Job Link";
      chip = typeof inv.args?.url === "string" ? inv.args.url.replace(/^https?:\/\//, "").slice(0, 24) : "job link";
      detail.push({ text: "Extracted job description & company requirements" });
    } else if (inv.toolName === "searchExternalJobs" || inv.toolName === "searchJobsAcrossBoards") {
      icon = "search";
      label = "Discover Jobs";
      chip = String(inv.args?.query || inv.args?.keywords || "Multi-Board Search");
      detail.push({ text: "✓ Aggregated remote & global roles from RemoteOK, Arbeitnow, Adzuna", tone: "add" });
    } else if (inv.toolName === "saveJobOpportunityToTracker") {
      icon = "write";
      label = "Save Opportunity";
      chip = String(inv.args?.companyName || "Pipeline");
      detail.push({ text: "+ Tracked opportunity in applications pipeline", tone: "add" });
    } else if (inv.toolName === "createApplication" || inv.toolName === "updateApplicationStatus") {
      icon = "write";
      label = inv.toolName === "createApplication" ? "Create Application" : "Update Status";
      chip = String(inv.args?.companyName || inv.args?.status || "Application Tracker");
      detail.push({ text: `+ ${inv.toolName === "createApplication" ? "Created" : "Updated"} tracker record`, tone: "add" });
    } else if (inv.toolName === "draftOutreachEmail" || inv.toolName === "sendOutreachEmailViaResend") {
      icon = "write";
      label = "Draft Outreach";
      chip = String(inv.args?.company || "Email Outreach");
      detail.push({ text: "+ Formatted high-conversion cold email template", tone: "add" });
    } else if (inv.toolName === "queryCareerKnowledgeGraph" || inv.toolName === "syncCareerKnowledgeGraph") {
      icon = "run";
      label = "Knowledge Graph";
      chip = "Graph Index";
      detail.push({ text: "✓ Queried verified candidate graph relationships" });
    } else if (inv.toolName === "tailorResumeForJob") {
      icon = "write";
      label = "Tailor Resume";
      chip = "Resume_Tailored.md";
      detail.push({ text: "+ Injected quantifiable ATS keywords & impact metrics", tone: "add" });
    } else if (inv.toolName === "searchUserMemories" || inv.toolName === "getUserMemories" || inv.toolName === "saveUserMemory") {
      icon = "read";
      label = "Memory Search";
      chip = "pgvector Index";
      detail.push({ text: "✓ Retrieved semantic profile memories & preferences" });
    } else if (inv.toolName === "createWeeklyGoal") {
      icon = "write";
      label = "Weekly Goal";
      chip = String(inv.args?.targetApplicationsCount ? `${inv.args.targetApplicationsCount} Apps Target` : "Weekly Milestone");
      detail.push({ text: "+ Scheduled weekly goal target", tone: "add" });
    } else {
      detail.push({ text: inv.state === "result" ? "✓ Task execution completed" : "Running tool in background..." });
    }

    return {
      id: inv.toolCallId,
      icon,
      label,
      chip,
      mono: true,
      detailMono: false,
      detail,
    };
  });

  return { rows, diffs: [] };
}

export type ToolChipsProps = {
  toolInvocations?: ToolInvocation[];
  rows?: ToolChipRow[];
  diffs?: DiffChip[];
  diffLines?: Record<string, DiffLine[]>;
  stepMs?: number;
  initialOpen?: boolean;
  className?: string;
};

export default function ToolChips({
  toolInvocations,
  rows: customRows,
  diffs: customDiffs,
  diffLines: customDiffLines,
  stepMs = STEP_MS,
  initialOpen = true,
  className = "",
}: ToolChipsProps) {
  let activeRows = customRows;
  let activeDiffs = customDiffs;

  if (toolInvocations && toolInvocations.length > 0 && !customRows) {
    const formatted = formatToolInvocations(toolInvocations);
    activeRows = formatted.rows;
    activeDiffs = formatted.diffs;
  }

  const effectiveRows = activeRows ?? DEFAULT_ROWS;
  const effectiveDiffs = activeDiffs ?? DEFAULT_DIFFS;
  const effectiveDiffLines = customDiffLines ?? DEFAULT_DIFF_LINES;

  const [step, setStep] = useState(toolInvocations ? effectiveRows.length + 1 : 0);
  const [open, setOpen] = useState(initialOpen);
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<{
    file: string;
    x: number;
    top?: number;
    bottom?: number;
  } | null>(null);

  const openPreview = (file: string) => (event: React.SyntheticEvent) => {
    const target = (event.currentTarget as Element).closest("[data-diffchip]");
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const previewHeight = 38 + (effectiveDiffLines[file]?.length ?? 0) * 19;
    const fitsBelow = rect.bottom + 6 + previewHeight <= window.innerHeight - 12;
    setPreview({
      file,
      x: Math.max(12, Math.min(rect.left, window.innerWidth - 300)),
      ...(fitsBelow
        ? { top: rect.bottom + 6 }
        : { bottom: window.innerHeight - rect.top + 6 }),
    });
  };

  const closePreview = (file: string) => () =>
    setPreview((current) => (current?.file === file ? null : current));

  const total = effectiveRows.length + 1; // rows, then diff chips

  useEffect(() => {
    if (toolInvocations) {
      setStep(total);
      return;
    }
    if (step >= total) return;
    const t = setTimeout(() => setStep((s) => s + 1), stepMs);
    return () => clearTimeout(t);
  }, [step, total, stepMs, toolInvocations]);

  const toggleRow = (label: string) =>
    setOpenRows((current) => {
      const next = new Set(current);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });

  const toolCallsCount = effectiveRows.length;

  return (
    <div className={`min-h-[120px] w-full max-w-lg pb-1 not-prose select-none ${className}`}>
      {/* collapsed run header */}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="-mx-1.5 flex w-fit items-center gap-1.5 rounded-control px-1.5 py-1 text-[12.5px] font-medium text-ink-2 transition-colors duration-100 hover:bg-hover-2 cursor-pointer"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-200"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
        <span className="tabular-nums">
          {toolCallsCount} tool {toolCallsCount === 1 ? "call" : "calls"}
          {effectiveDiffs.length > 0 ? `, ${effectiveDiffs.length} modified artifacts` : ""}
        </span>
      </button>

      {/* tool call rows */}
      <div
        className="grid transition-[grid-template-rows,opacity] duration-300"
        style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
      >
        <div className="-mx-1 overflow-hidden px-1.5 pb-1">
          <div className="mt-1.5 flex flex-col gap-1">
            {effectiveRows.slice(0, step).map((row) => {
              const rowOpen = openRows.has(row.label);
              return (
                <div
                  key={row.label}
                  style={{ animation: "fade-up 300ms cubic-bezier(0.23,1,0.32,1) both" }}
                >
                  <button
                    type="button"
                    aria-expanded={rowOpen}
                    onClick={() => toggleRow(row.label)}
                    className="group/row -mx-[3px] flex h-7 w-[calc(100%+6px)] min-w-0 items-center gap-2 rounded-control px-[3px] text-left transition-colors duration-100 hover:bg-hover-2 cursor-pointer"
                  >
                    <span className="relative flex size-4 shrink-0 items-center justify-center text-ink-3">
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill={row.icon === "think" ? "currentColor" : "none"}
                        stroke="currentColor"
                        className={`transition-opacity duration-100 group-hover/row:opacity-0 ${
                          rowOpen ? "opacity-0" : ""
                        }`}
                      >
                        {Icons[row.icon] || Icons.run}
                      </svg>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`absolute transition-[opacity,transform] duration-150 group-hover/row:opacity-100 ${
                          rowOpen ? "opacity-100" : "opacity-0"
                        }`}
                        style={{ transform: rowOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                    <span className="shrink-0 text-[12.5px] font-medium text-ink truncate max-w-[160px] sm:max-w-none">
                      {row.label}
                    </span>
                    <span
                      className={`inline-flex h-5.5 min-w-0 flex-1 cursor-pointer items-center truncate rounded-chip bg-field px-1.5
                        text-[11.5px] text-ink-2 shadow-hairline transition-colors duration-100 hover:bg-hover-2
                        ${row.mono ? "font-mono" : ""}`}
                    >
                      {row.chip}
                    </span>
                  </button>

                  {/* expanded detail */}
                  <div
                    className="grid transition-[grid-template-rows,opacity] duration-300"
                    style={{
                      gridTemplateRows: rowOpen ? "1fr" : "0fr",
                      opacity: rowOpen ? 1 : 0,
                      transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
                    }}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="mt-0.5 mb-1 ml-2 flex flex-col gap-0.5 border-l border-line py-0.5 pl-3.5">
                        {row.detail.map((line, idx) => (
                          <span
                            key={idx}
                            className={`truncate text-[11.5px] leading-[1.6] ${
                              row.detailMono ? "font-mono" : ""
                            } ${line.tone === "add" ? "text-green" : line.tone === "del" ? "text-red" : "text-ink-2"}`}
                          >
                            {line.text}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* file-diff chips */}
          {step >= total && effectiveDiffs.length > 0 && (
            <div className="mt-2.5 flex max-w-full flex-wrap gap-1.5 border-t border-line pt-2.5">
              {effectiveDiffs.map((d, i) => (
                <span
                  key={d.file}
                  data-diffchip
                  className="relative"
                  onMouseEnter={openPreview(d.file)}
                  onMouseLeave={closePreview(d.file)}
                >
                  <button
                    type="button"
                    aria-expanded={preview?.file === d.file}
                    aria-label={`Show diff for ${d.file}`}
                    onFocus={openPreview(d.file)}
                    onBlur={closePreview(d.file)}
                    className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-chip
                      bg-surface px-2 font-mono text-[11.5px] text-ink shadow-btn
                      transition-colors duration-100 hover:bg-hover cursor-pointer"
                    style={{ animation: `pop-in 250ms cubic-bezier(0.23,1,0.32,1) ${i * 80}ms both` }}
                  >
                    <span className="min-w-0 truncate">{d.file}</span>
                    <span className="shrink-0 text-green tabular-nums">+{d.add}</span>
                    {d.del > 0 && <span className="shrink-0 text-red tabular-nums">−{d.del}</span>}
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Diff Hover Preview Portal */}
      {preview && typeof document !== "undefined" && createPortal(
        <div
          className="fixed z-50 w-72 overflow-hidden rounded-[10px] bg-surface shadow-overlay border border-line"
          style={{
            left: preview.x,
            top: preview.top,
            bottom: preview.bottom,
            animation: "pop-in 160ms cubic-bezier(0.23,1,0.32,1) both",
            transformOrigin: preview.top === undefined ? "bottom left" : "top left",
          }}
        >
          <div className="flex items-center justify-between border-b border-line px-2.5 py-1.5 font-mono text-[11px]">
            <span className="min-w-0 truncate text-ink-2">{preview.file}</span>
            <span className="shrink-0 tabular-nums">
              <span className="text-green">
                +{effectiveDiffs.find((diff) => diff.file === preview.file)?.add ?? 0}
              </span>
              {(effectiveDiffs.find((diff) => diff.file === preview.file)?.del ?? 0) > 0 && (
                <span className="text-red">
                  {" "}
                  −{effectiveDiffs.find((diff) => diff.file === preview.file)?.del}
                </span>
              )}
            </span>
          </div>
          <div className="py-1 font-mono text-[11px] leading-[1.8]">
            {(effectiveDiffLines[preview.file] ?? []).map((line, index) => (
              <div
                key={index}
                className={`flex gap-2 px-2.5 whitespace-pre ${
                  line.tone === "add"
                    ? "bg-green-tint text-green"
                    : line.tone === "del"
                    ? "bg-red-tint text-red"
                    : "text-ink-2"
                }`}
              >
                <span className="w-3 shrink-0 select-none">
                  {line.tone === "add" ? "+" : line.tone === "del" ? "−" : " "}
                </span>
                <span className="min-w-0 truncate">{line.text}</span>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
