import {
  Bookmark,
  BriefcaseBusiness,
  Clock3,
  CircleCheck,
  Layers,
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
  staged?: number
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
  followUpOnly?: boolean
}

export const STATUS_OPTIONS = [
  "Staged",
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
    key: "staged",
    title: "Staged",
    statuses: ["Staged", "STAGED"],
    icon: Layers,
    accent: "bg-purple-500/5",
    iconBg: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
    dot: "bg-purple-500",
    description: "Roles queued for tailoring & packaging",
  },
  {
    key: "saved",
    title: "Saved",
    statuses: ["Saved", "SAVED"],
    icon: Bookmark,
    accent: "bg-sky-500/5",
    iconBg: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    dot: "bg-sky-500",
    description: "Bookmarked target roles to apply later",
  },
  {
    key: "applied",
    title: "Applied",
    statuses: ["Applied", "APPLIED"],
    icon: BriefcaseBusiness,
    accent: "bg-indigo-500/5",
    iconBg: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
    dot: "bg-indigo-500",
    description: "Active submissions awaiting response",
  },
  {
    key: "interviews",
    title: "Interviews",
    statuses: ["Assessment", "ASSESSMENT", "Interview", "INTERVIEW", "Interviewing"],
    icon: Clock3,
    accent: "bg-amber-500/5",
    iconBg: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    dot: "bg-amber-500",
    description: "Scheduled rounds & technical tests",
  },
  {
    key: "rejected",
    title: "Rejected",
    statuses: ["Rejected", "REJECTED"],
    icon: XCircle,
    accent: "bg-rose-500/5",
    iconBg: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    dot: "bg-rose-500",
    description: "Archived & closed applications",
  },
  {
    key: "offer",
    title: "Offered",
    statuses: ["Offer", "OFFER", "Accepted"],
    icon: CircleCheck,
    accent: "bg-emerald-500/5",
    iconBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    dot: "bg-emerald-500",
    description: "Active job offers and contracts",
  },
] as const

