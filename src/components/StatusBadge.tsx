import { cn } from "@/lib/utils"

const textColorMap: Record<string, string> = {
  Saved:       "text-muted-foreground",
  Applied:     "text-foreground",
  Assessment:  "text-foreground",
  Interview:   "text-foreground",
  Rejected:    "text-muted-foreground",
  Offer:       "text-foreground",
}

export default function StatusBadge({ status }: { status: string }) {
  const color = textColorMap[status] ?? "text-muted-foreground"
  return (
    <span className={cn("text-xs font-medium whitespace-nowrap", color)}>
      {status}
    </span>
  )
}
