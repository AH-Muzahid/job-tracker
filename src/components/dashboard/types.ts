import {
  Bookmark,
  BriefcaseBusiness,
  Clock3,
  CircleCheck,
  XCircle,
} from "lucide-react"

export type ViewMode = "board" | "list" | "table"

export type SortOption = "newest" | "oldest" | "company" | "status"

export type Tag = {
  id: string
  name: string
}

export type Application = {
  id: string
  companyName: string
  jobTitle: string
  jobUrl: string | null
  source: string
  status: string
  applicationDate: string
  createdAt: string
  tags: Array<{ tag: Tag }>
}

export interface Stats {
  total: number
  saved: number
  applied: number
  assessment: number
  interview: number
  rejected: number
  offer: number
  recent: Array<{
    id: string
    companyName: string
    jobTitle: string
    status: string
    createdAt: string
  }>
  trend: Array<{ month: string; count: number }>
}

export interface DashboardFilters {
  search: string
  status: string
  source: string
  sort: SortOption
  tag: string
}

export const STATUS_OPTIONS = [
  "Saved",
  "Applied",
  "Assessment",
  "Interview",
  "Rejected",
  "Offer",
] as const

export const SOURCE_OPTIONS = [
  "LinkedIn",
  "Bdjobs",
  "Indeed",
  "Wellfound",
  "Facebook",
  "Referral",
  "Other",
] as const

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "company", label: "Company name" },
  { value: "status", label: "Status" },
]

export const boardColumns = [
  {
    key: "saved",
    title: "Saved Jobs",
    statuses: ["Saved"],
    icon: Bookmark,
    accent: "from-sky-50 to-white dark:from-sky-500/10 dark:to-card",
    iconBg: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  {
    key: "applied",
    title: "Applied Jobs",
    statuses: ["Applied"],
    icon: BriefcaseBusiness,
    accent: "from-indigo-50 to-white dark:from-indigo-500/10 dark:to-card",
    iconBg: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
    dot: "bg-indigo-500",
  },
  {
    key: "interviews",
    title: "Interviews",
    statuses: ["Assessment", "Interview"],
    icon: Clock3,
    accent: "from-amber-50 to-white dark:from-amber-500/10 dark:to-card",
    iconBg: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  {
    key: "rejected",
    title: "Rejected Jobs",
    statuses: ["Rejected"],
    icon: XCircle,
    accent: "from-rose-50 to-white dark:from-rose-500/10 dark:to-card",
    iconBg: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  {
    key: "offer",
    title: "Offered Jobs",
    statuses: ["Offer"],
    icon: CircleCheck,
    accent: "from-emerald-50 to-white dark:from-emerald-500/10 dark:to-card",
    iconBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
] as const
