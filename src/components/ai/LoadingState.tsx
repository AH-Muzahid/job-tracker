"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, BrainCircuit, Terminal } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const chevron = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3),
    c = i % 3;
  return (c + Math.abs(r - 1)) * 90;
});

const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
const orbit = Array.from({ length: 9 }, (_, i) => {
  const k = ORBIT_ORDER.indexOf(i);
  return k === -1 ? null : k * 110;
});

const PATTERNS: Record<string, { delays: (number | null)[]; dur: number; round: boolean }> = {
  Drive: { delays: chevron, dur: 650, round: false },
  Dots: { delays: chevron, dur: 650, round: true },
  Orbit: { delays: orbit, dur: 950, round: false },
};

function LoaderGrid({
  delays,
  dur,
  round,
}: {
  delays: (number | null)[];
  dur: number;
  round: boolean;
}) {
  return (
    <span aria-hidden className="grid shrink-0 grid-cols-[repeat(3,4.5px)] gap-[2px]">
      {delays.map((delay, index) => (
        <span
          key={index}
          className={`size-[4.5px] bg-foreground/80 dark:bg-foreground ${round ? "rounded-full" : "rounded-[1px]"}`}
          style={{
            opacity: delay === null ? 0.1 : 0.25,
            animation: delay === null ? "none" : `pixel-on ${dur}ms ease-in-out ${delay}ms infinite`,
          }}
        />
      ))}
    </span>
  );
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

function getDynamicStage(seconds: number): string {
  if (seconds < 2.0) return "Analyzing query & context...";
  if (seconds < 5.0) return "Inspecting career tracker & database...";
  if (seconds < 9.0) return "Synthesizing agent action plan...";
  if (seconds < 18.0) return "Evaluating parameters & safety gates...";
  return "Executing deep reasoning...";
}

export default function LoadingState({
  label,
  reasoning,
  isFinished = false,
  variant = "Dots",
  className = "",
}: {
  label?: string;
  reasoning?: string;
  isFinished?: boolean;
  variant?: string;
  className?: string;
}) {
  const { elapsed, seconds } = useElapsed(isFinished);
  const [isThoughtOpen, setIsThoughtOpen] = useState(true);
  const { delays, dur, round } = PATTERNS[variant] ?? PATTERNS.Dots;

  const dynamicStage = getDynamicStage(seconds);
  const resolvedLabel = label || dynamicStage;

  // If the model streams raw reasoning / thought tokens
  if (reasoning && reasoning.trim()) {
    return (
      <div className={cn("w-full not-prose my-2 text-xs font-mono select-none", className)}>
        <button
          type="button"
          onClick={() => setIsThoughtOpen(!isThoughtOpen)}
          className="inline-flex items-center gap-2 py-1 px-2.5 -ml-2 rounded-md hover:bg-muted/70 transition-colors text-muted-foreground hover:text-foreground cursor-pointer group"
        >
          <BrainCircuit className="h-3.5 w-3.5 text-purple-500 animate-pulse shrink-0" />
          <span className="font-semibold text-[11.5px] text-foreground/90">
            {isFinished ? `Thought for ${elapsed}` : `Thinking (${elapsed})`}
          </span>
          <span className="text-[10.5px] text-muted-foreground/70 hidden sm:inline">
            • {isFinished ? "Reasoning complete" : "Streaming thoughts..."}
          </span>
          {isThoughtOpen ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground/60 transition-transform group-hover:text-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground/60 transition-transform group-hover:text-foreground" />
          )}
        </button>

        {isThoughtOpen && (
          <div className="mt-1.5 pl-3 border-l-2 border-purple-500/30 py-1 space-y-1 text-muted-foreground/90 text-[11px] leading-relaxed max-h-[280px] overflow-y-auto font-sans">
            <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-pre:my-1 max-w-none text-muted-foreground text-xs">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {reasoning}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Live dynamic activity stage view while thinking or preparing tools
  return (
    <div role="status" className={cn("flex flex-col gap-1.5 py-1.5 select-none", className)}>
      <div className="flex items-center gap-2.5">
        <LoaderGrid delays={delays} dur={dur} round={round} />
        <span
          className="bg-clip-text text-[12.5px] font-medium text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(90deg, var(--color-ink-3, var(--muted-foreground, #71717a)) 20%, var(--color-ink, var(--foreground, #09090b)) 50%, var(--color-ink-3, var(--muted-foreground, #71717a)) 80%)",
            backgroundSize: "200% 100%",
            WebkitBackgroundClip: "text",
            animation: "shimmer-text 1.6s linear infinite",
          }}
        >
          {resolvedLabel}
        </span>
        <span className="font-mono text-[11.5px] text-muted-foreground/80 tabular-nums">
          {elapsed}
        </span>
      </div>

      {/* Dynamic step detail hint for long operations */}
      {seconds >= 3.0 && (
        <div className="flex items-center gap-1.5 pl-4 text-[11px] font-mono text-muted-foreground/60 animate-in fade-in duration-300">
          <Terminal className="h-3 w-3 shrink-0" />
          <span>Stage: {dynamicStage}</span>
        </div>
      )}
    </div>
  );
}
