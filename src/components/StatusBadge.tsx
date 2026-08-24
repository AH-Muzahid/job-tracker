import { cn } from "@/lib/utils"

// Status dot color map — uses existing --status-* CSS vars from globals.css
// so dark mode adapts automatically without any extra tokens.
const dotColorMap: Record<string, string> = {
  Saved:       "bg-[var(--status-saved)]",
  Applied:     "bg-[var(--status-applied)]",
  Assessment:  "bg-[var(--status-assessment)]",
  Interview:   "bg-[var(--status-interview)]",
  Rejected:    "bg-[var(--status-rejected)]",
  Offer:       "bg-[var(--status-offer)]",
}

/**
 * Efferd-compliant status badge:
 * - Neutral monochrome pill (bg-muted/40, border-border, text-muted-foreground)
 * - Colored dot using existing --status-* CSS vars (dark-mode adaptive)
 * - No saturated rainbow badge backgrounds
 */
export default function StatusBadge({ status }: { status: string }) {
  const dot = dotColorMap[status] ?? "bg-muted-foreground"
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-mono font-medium text-muted-foreground whitespace-nowrap">
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dot)} />
      {status}
    </span>
  )
}
