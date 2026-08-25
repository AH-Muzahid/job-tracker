"use client";

import { useEffect, useState } from "react";

/* ─────────────────────────────────────────────────────────
 * LOADING STATE — pixel-grid loader for long-running work
 *
 * Variants:
 *   Drive  — square cells, chevron wavefront driving right;
 *            the 650ms cycle is shorter than the sweep, so
 *            two fronts are always in flight
 *   Dots   — same wavefront, circular cells
 *   Orbit  — a comet lapping the grid perimeter
 *   Surfer — the Drive loader paired with a meme video below
 *
 * Paired with a shimmering label and a live elapsed timer
 * in mono tabular figures. Reduced motion freezes the grid
 * to its dim state; the timer still ticks.
 * ───────────────────────────────────────────────────────── */

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

function useElapsed() {
  const [ds, setDs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDs((d) => d + 1), 100);
    return () => clearInterval(t);
  }, []);
  const total = ds / 10;
  const timeStr = total < 60 ? `${total.toFixed(1)}s` : `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`;
  return { elapsed: timeStr, seconds: total };
}

export default function LoadingState({
  label,
  variant = "Drive",
  /** the meme feed for the Surfer variant; drop the file in /public to light it up */
  videoSrc = "/subway-surfers.mp4",
  className = "",
}: {
  label?: string;
  variant?: string;
  videoSrc?: string;
  className?: string;
}) {
  const { elapsed, seconds } = useElapsed();
  const surfer = variant === "Surfer";
  
  let defaultLabel = "Thinking";
  if (seconds >= 10) {
    defaultLabel = "Finalizing response & pipeline sync...";
  } else if (seconds >= 4) {
    defaultLabel = "Running database & tool actions...";
  } else if (seconds >= 1.5) {
    defaultLabel = "Processing career context...";
  }

  const resolvedLabel = label ?? (surfer ? "Subway surfing" : defaultLabel);
  const [videoOk, setVideoOk] = useState(true);
  const { delays, dur, round } = PATTERNS[variant] ?? PATTERNS.Drive;

  const labelEl = (
    <span
      className="bg-clip-text text-[13px] font-medium text-transparent"
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
  );
  const elapsedEl = (
    <span className="font-mono text-[12px] text-muted-foreground/80 tabular-nums">
      {elapsed}
    </span>
  );

  if (surfer) {
    return (
      <div role="status" className={`flex w-fit flex-col items-start select-none ${className}`}>
        <div className="flex items-center gap-2.5">
          <LoaderGrid {...PATTERNS.Drive} />
          {labelEl}
          {elapsedEl}
        </div>

        {/* the context card follows the status text it is illustrating */}
        <div
          className="mt-2 w-56 overflow-hidden rounded-[10px] shadow-overlay border border-line"
          style={{ animation: "pop-in 200ms cubic-bezier(0.16,1,0.3,1) both", transformOrigin: "top left" }}
        >
          <div className="relative aspect-video w-full" style={{ background: "var(--tooltip-bg)" }}>
            {videoOk ? (
              <video
                src={videoSrc}
                autoPlay
                muted
                loop
                playsInline
                onError={() => setVideoOk(false)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1.5">
                <LoaderGrid {...PATTERNS.Drive} />
                <span className="px-3 text-center font-mono text-[10px]" style={{ color: "var(--tooltip-muted)" }}>
                  Video unavailable
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div role="status" className={`flex w-fit items-center gap-2.5 select-none ${className}`}>
      <LoaderGrid delays={delays} dur={dur} round={round} />
      {labelEl}
      {elapsedEl}
    </div>
  );
}
