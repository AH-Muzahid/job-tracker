import { cn } from "@/lib/utils"

const textColorMap: Record<string, string> = {
  staged:      "text-purple-600 dark:text-purple-400 font-medium",
  saved:       "text-muted-foreground",
  applied:     "text-foreground",
  assessment:  "text-foreground",
  interview:   "text-foreground",
  rejected:    "text-muted-foreground",
  offer:       "text-emerald-600 dark:text-emerald-400 font-medium",
  archived:    "text-muted-foreground/60",
}

export default function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase() || ""
  const color = textColorMap[normalized] ?? "text-muted-foreground"
  return (
    <span className={cn("text-xs font-medium whitespace-nowrap", color)}>
      {status}
    </span>
  )
}
