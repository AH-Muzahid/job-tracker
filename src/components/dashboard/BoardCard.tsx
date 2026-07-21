"use client"

import { ExternalLink, MoreHorizontal } from "lucide-react"
import { Card } from "@/components/ui/card"
import { getCompanyColor, getInitials } from "./utils"
import type { Application } from "./types"

const tagColors: Record<string, string> = {
  REMOTE: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  "FULL TIME": "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300",
  "PART TIME": "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
  INTERNSHIP: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
  URGENT: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  "ON-SITE": "bg-gray-50 text-gray-700 dark:bg-gray-500/10 dark:text-gray-300",
  HYBRID: "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300",
}

const defaultTagColor = "bg-secondary text-secondary-foreground"

interface Props {
  application: Application
  onClick: () => void
}

export default function BoardCard({ application, onClick }: Props) {
  const initials = getInitials(application.companyName)
  const colorClass = getCompanyColor(application.companyName)

  return (
    <button
      onClick={onClick}
      className="group block w-full text-left"
    >
      <Card className="p-3 transition-all duration-200 hover:shadow-md hover:ring-1 hover:ring-primary/20 cursor-pointer active:scale-[0.98]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${colorClass}`}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{application.companyName}</p>
              <p className="truncate text-sm font-semibold leading-tight">{application.jobTitle}</p>
            </div>
          </div>
          <MoreHorizontal className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>

        {application.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {application.tags.map(({ tag }) => (
              <span
                key={tag.id}
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ${tagColors[tag.name] || defaultTagColor}`}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>{new Date(application.applicationDate).toLocaleDateString()}</span>
          {application.jobUrl && (
            <span
              className="inline-flex items-center gap-1 text-muted-foreground group-hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                window.open(application.jobUrl!, "_blank")
              }}
            >
              <ExternalLink className="h-3 w-3" />
            </span>
          )}
        </div>
      </Card>
    </button>
  )
}
