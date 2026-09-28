"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"

function formatRemaining(diff: number): string {
  const total = Math.max(0, Math.floor(diff / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function BatchCountdown({
  nextBatchAt,
  className,
}: {
  nextBatchAt?: string | null
  className?: string
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const diff = nextBatchAt ? new Date(nextBatchAt).getTime() - now : 0
  const done = diff <= 0

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border border-border/70 bg-muted/30 px-2 py-1 text-[11px] font-mono tabular-nums text-muted-foreground",
        className
      )}
    >
      <Clock className={cn("size-3.5 shrink-0", done ? "text-primary animate-pulse" : "text-muted-foreground")} />
      <span>{done ? "New batch incoming…" : `Next batch in ${formatRemaining(diff)}`}</span>
    </div>
  )
}
