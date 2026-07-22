import { cn } from "@/lib/utils"
import type { AIMode } from "@/lib/store"

const MODE_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  "profile": { label: "Profile", bg: "bg-sky-100 dark:bg-sky-500/20", text: "text-sky-700 dark:text-sky-300" },
  "jd-scan": { label: "JD Scan", bg: "bg-blue-100 dark:bg-blue-500/20", text: "text-blue-700 dark:text-blue-300" },
  "application": { label: "Application", bg: "bg-emerald-100 dark:bg-emerald-500/20", text: "text-emerald-700 dark:text-emerald-300" },
  "tracker": { label: "Tracker", bg: "bg-violet-100 dark:bg-violet-500/20", text: "text-violet-700 dark:text-violet-300" },
  "response": { label: "Response", bg: "bg-amber-100 dark:bg-amber-500/20", text: "text-amber-700 dark:text-amber-300" },
  "interview": { label: "Interview", bg: "bg-rose-100 dark:bg-rose-500/20", text: "text-rose-700 dark:text-rose-300" },
  "weekly": { label: "Weekly", bg: "bg-teal-100 dark:bg-teal-500/20", text: "text-teal-700 dark:text-teal-300" },
  "recovery": { label: "Recovery", bg: "bg-orange-100 dark:bg-orange-500/20", text: "text-orange-700 dark:text-orange-300" },
}

export default function ModeBadge({ mode }: { mode: AIMode }) {
  const style = MODE_STYLES[mode]
  if (!style) return null

  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border-0", style.bg, style.text)}>
      {style.label}
    </span>
  )
}
