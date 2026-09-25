"use client"

import Link from "next/link"
import { ExternalLink, Plus, Inbox, Bot, Clock } from "lucide-react"
import { isFollowUpDue } from "@/lib/applications/follow-up-utils"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { DecorIcon } from "@/components/decor-icon"
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
      <div className="relative border border-border bg-background p-12 text-center rounded-[6px]">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox className="size-6 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>No applications found</EmptyTitle>
            <EmptyDescription className="text-xs">
              Try adjusting your search criteria or add your next target application.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="outline" size="sm" className="rounded-[4px] h-8 text-xs font-medium">
              <Link href="/applications/new">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Application
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  return (
    <div className="relative border border-border bg-border rounded-[6px] overflow-hidden">
      <DecorIcon className="hidden md:block" position="top-left" />
      <div className="divide-y divide-border bg-background">
        {applications.map((application) => (
          <ListItem key={application.id} application={application} onClick={() => onSelect(application.id)} />
        ))}
      </div>
    </div>
  )
}

function ListItem({ application, onClick }: { application: Application; onClick: () => void }) {
  const initials = getInitials(application.companyName)
  const colorClass = getCompanyColor(application.companyName)

  return (
    <div
      onClick={onClick}
      className="group flex w-full items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-3.5 transition-colors hover:bg-muted/40 text-left cursor-pointer"
    >
      <div className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-[4px] text-xs font-mono font-bold border ${colorClass}`}>
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{application.jobTitle}</p>
        <p className="truncate text-xs font-medium text-muted-foreground">{application.companyName}</p>
      </div>
      <div className="hidden sm:flex items-center gap-1.5">
        {application.tags.slice(0, 2).map(({ tag }) => (
          <span key={tag.id} className="inline-flex items-center rounded-[4px] border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
            {tag.name}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <StatusBadge status={application.status} />
        {isFollowUpDue(application) && (
          <span
            className="hidden md:inline-flex items-center gap-1 rounded-[4px] border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-mono text-amber-600 dark:text-amber-400 font-semibold shrink-0"
            title="Application silent for 5+ business days"
          >
            <Clock className="h-3 w-3" />
            Follow-up Due
          </span>
        )}
      </div>
      {application.source === "Career Orchestrator" ? (
        <span className="hidden md:inline-flex items-center gap-1 rounded-[4px] border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-mono text-primary font-semibold">
          <Bot className="h-3 w-3" />
          Auto-Staged
        </span>
      ) : (
        <span className="hidden md:inline-flex items-center rounded-[4px] border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
          {application.source}
        </span>
      )}
      <span className="hidden sm:inline-block shrink-0 text-xs font-mono text-muted-foreground">
        {new Date(application.applicationDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
      </span>
      {application.jobUrl && (
        <span
          className="shrink-0 text-muted-foreground hover:text-foreground p-1 rounded-[4px] hover:bg-muted transition-colors cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            window.open(application.jobUrl!, "_blank")
          }}
        >
          <ExternalLink className="h-4 w-4" />
        </span>
      )}
    </div>
  )
}
