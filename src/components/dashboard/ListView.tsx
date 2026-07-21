"use client"

import Link from "next/link"
import { ExternalLink, Inbox, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import StatusBadge from "@/components/StatusBadge"
import { getCompanyColor, getInitials } from "./utils"
import type { Application } from "./types"

interface Props {
  applications: Application[]
  onSelect: (id: string) => void
}

export default function ListView({ applications, onSelect }: Props) {
  if (applications.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-16 text-center">
        <Inbox className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">No applications found</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Try adjusting your filters or add a new application</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/applications/new">
            <Plus className="h-4 w-4" />
            Add Application
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {applications.map((application) => (
        <ListItem key={application.id} application={application} onClick={() => onSelect(application.id)} />
      ))}
    </div>
  )
}

function ListItem({ application, onClick }: { application: Application; onClick: () => void }) {
  const initials = getInitials(application.companyName)
  const colorClass = getCompanyColor(application.companyName)

  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-xl border px-4 py-3 transition-all duration-200 hover:bg-muted/50 hover:shadow-sm active:scale-[0.99] text-left"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${colorClass}`}>
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold group-hover:text-foreground">{application.jobTitle}</p>
        <p className="truncate text-xs text-muted-foreground">{application.companyName}</p>
      </div>
      <div className="hidden sm:flex items-center gap-1.5">
        {application.tags.slice(0, 2).map(({ tag }) => (
          <Badge key={tag.id} variant="outline" className="text-[10px] px-1.5 py-0">
            {tag.name}
          </Badge>
        ))}
      </div>
      <StatusBadge status={application.status} />
      <Badge variant="secondary" className="hidden md:inline-flex">{application.source}</Badge>
      <span className="shrink-0 text-xs text-muted-foreground">
        {new Date(application.applicationDate).toLocaleDateString()}
      </span>
      {application.jobUrl && (
        <span
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation()
            window.open(application.jobUrl!, "_blank")
          }}
        >
          <ExternalLink className="h-4 w-4" />
        </span>
      )}
    </button>
  )
}
