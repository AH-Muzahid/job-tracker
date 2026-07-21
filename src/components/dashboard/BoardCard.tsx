import Link from "next/link"
import { ExternalLink, MoreHorizontal } from "lucide-react"
import { Card } from "@/components/ui/card"
import { getCompanyColor, getInitials } from "./utils"
import type { Application } from "./types"

export default function BoardCard({ application }: { application: Application }) {
  const initials = getInitials(application.companyName)
  const colorClass = getCompanyColor(application.companyName)

  return (
    <Link
      href={`/applications/${application.id}`}
      className="group block"
    >
      <Card className="p-3 transition-all hover:shadow-md hover:ring-1 hover:ring-primary/20">
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

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
            REMOTE
          </span>
          <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
            FULL TIME
          </span>
        </div>

        <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>{new Date(application.applicationDate).toLocaleDateString()}</span>
          {application.jobUrl && (
            <a
              href={application.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </Card>
    </Link>
  )
}
