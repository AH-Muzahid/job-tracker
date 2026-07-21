"use client"

import { useMemo } from "react"
import {
  Bookmark,
  BriefcaseBusiness,
  Clock3,
  CircleCheck,
  XCircle,
  BarChart3,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import type { Application } from "./types"

const statConfig = [
  { key: "total", label: "Total", icon: BarChart3, color: "text-foreground", bg: "bg-muted" },
  { key: "Saved", label: "Saved", icon: Bookmark, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-500/10" },
  { key: "Applied", label: "Applied", icon: BriefcaseBusiness, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
  { key: "interviews", label: "Interviews", icon: Clock3, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
  { key: "Rejected", label: "Rejected", icon: XCircle, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10" },
  { key: "Offer", label: "Offers", icon: CircleCheck, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
] as const

export default function StatCards({ applications }: { applications: Application[] }) {
  const counts = useMemo(() => {
    const map: Record<string, number> = { total: applications.length }
    for (const app of applications) {
      map[app.status] = (map[app.status] || 0) + 1
    }
    map.interviews = (map.Assessment || 0) + (map.Interview || 0)
    return map
  }, [applications])

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {statConfig.map(({ key, label, icon: Icon, color, bg }) => (
        <Card key={key} className="p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg}`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold leading-none">{counts[key] || 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{label}</p>
          </div>
        </Card>
      ))}
    </div>
  )
}
