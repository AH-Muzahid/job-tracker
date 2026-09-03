export type BatchSlot = "" | "just-in" | "earlier-today" | "yesterday"

export interface DiscoveryFilters {
  source: "" | "remoteok" | "arbeitnow" | "adzuna" | "curated" | "linkedin"
  location: "" | "remote" | "hybrid" | "onsite"
  minScore: "" | "85" | "70" | "0"
  batchSlot?: BatchSlot
  tags: string[]
}

export interface BatchSummary {
  justIn: number
  earlierToday: number
  yesterday: number
  totalActive: number
}

export type SortOption = "score-desc" | "score-asc" | "salary-desc" | "salary-asc" | "newest"

export const DISCOVERY_QUICK_TAGS = [
  "React", "Python", "Go", "TypeScript", "AI", "Next.js", "Node.js", "Remote",
]

export const DISCOVERY_SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "score-desc", label: "Fit Score (highest)" },
  { value: "score-asc", label: "Fit Score (lowest)" },
  { value: "salary-desc", label: "Salary (highest)" },
  { value: "salary-asc", label: "Salary (lowest)" },
  { value: "newest", label: "Newest" },
]

export function getScoreBadgeClass(score: number): string {
  if (score >= 85) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
  if (score >= 70) return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30"
  return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
}

export function getSourceBadge(source: string): { label: string; color: string } {
  switch (source) {
    case "remoteok":
      return { label: "RemoteOK", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" }
    case "arbeitnow":
      return { label: "Arbeitnow", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" }
    case "adzuna":
      return { label: "Adzuna", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" }
    case "linkedin":
      return { label: "LinkedIn", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" }
    default:
      return { label: "Curated", color: "bg-primary/10 text-primary border-primary/20" }
  }
}

export function getBatchSlotBadge(slot?: string): { label: string; color: string } {
  switch (slot) {
    case "just-in":
      return {
        label: "Just In (<6h)",
        color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
      }
    case "earlier-today":
      return {
        label: "Earlier (6-12h)",
        color: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
      }
    case "yesterday":
      return {
        label: "Past (12-24h)",
        color: "bg-muted text-muted-foreground border-border",
      }
    default:
      return {
        label: "Active Batch",
        color: "bg-primary/10 text-primary border-primary/20",
      }
  }
}

