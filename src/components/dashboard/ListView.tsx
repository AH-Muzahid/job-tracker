import Link from "next/link"
import { ExternalLink, Inbox, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import StatusBadge from "@/components/StatusBadge"
import { getCompanyColor, getInitials } from "./utils"
import type { Application } from "./types"

export default function ListView({ applications }: { applications: Application[] }) {
  if (applications.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
        <Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
        <p className="mb-2">No applications yet.</p>
        <Button asChild variant="outline">
          <Link href="/applications/new">
            <Plus className="h-4 w-4" />
            Add your first application
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {applications.map((application) => (
        <ListItem key={application.id} application={application} />
      ))}
    </div>
  )
}

function ListItem({ application }: { application: Application }) {
  const initials = getInitials(application.companyName)
  const colorClass = getCompanyColor(application.companyName)

  return (
    <Link
      href={`/applications/${application.id}`}
      className="group flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${colorClass}`}>
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{application.jobTitle}</p>
        <p className="truncate text-xs text-muted-foreground">{application.companyName}</p>
      </div>
      <StatusBadge status={application.status} />
      <Badge variant="secondary">{application.source}</Badge>
      <span className="shrink-0 text-xs text-muted-foreground">
        {new Date(application.applicationDate).toLocaleDateString()}
      </span>
      {application.jobUrl && (
        <a
          href={application.jobUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </Link>
  )
}
