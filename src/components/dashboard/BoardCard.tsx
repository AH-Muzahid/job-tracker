"use client"

import { memo } from "react"
import { ExternalLink, MoreHorizontal, Pencil, Trash2, ArrowRight, Bot, Clock } from "lucide-react"
import { isFollowUpDue } from "@/lib/applications/follow-up-utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getCompanyColor, getInitials } from "./utils"
import { STATUS_OPTIONS } from "./types"
import type { Application } from "./types"
import { SalaryIndexIndicator } from "@/components/salary/SalaryIndexIndicator"

interface Props {
  application: Application
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
  onMoveTo: (status: string) => void
  onOpenFollowUp?: (id: string) => void
}

// Next logical status to advance with 1 click
const NEXT_STATUS_MAP: Record<string, { label: string; status: string }> = {
  Staged: { label: "Apply", status: "Applied" },
  STAGED: { label: "Apply", status: "Applied" },
  Saved: { label: "Apply", status: "Applied" },
  SAVED: { label: "Apply", status: "Applied" },
  Applied: { label: "Interview", status: "Interview" },
  APPLIED: { label: "Interview", status: "Interview" },
  Assessment: { label: "Interview", status: "Interview" },
  ASSESSMENT: { label: "Interview", status: "Interview" },
  Interview: { label: "Offer", status: "Offer" },
  INTERVIEW: { label: "Offer", status: "Offer" },
  Interviewing: { label: "Offer", status: "Offer" },
}

const BoardCard = memo(function BoardCard({
  application,
  onClick,
  onEdit,
  onDelete,
  onMoveTo,
  onOpenFollowUp,
}: Props) {
  const initials = getInitials(application.companyName)
  const colorClass = getCompanyColor(application.companyName)
  const followUpDue = isFollowUpDue(application)
  const nextStage = NEXT_STATUS_MAP[application.status]

  const formattedDate = new Date(application.applicationDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })

  return (
    <div className="group block w-full text-left select-none">
      <div
        onClick={onClick}
        className="relative p-2 sm:p-2.5 rounded-[5px] border border-border bg-card hover:border-foreground/30 hover:shadow-xs active:scale-[0.99] transition-all cursor-pointer overflow-hidden flex flex-col gap-1.5"
      >
        {/* Row 1: Company Logo + Name + Actions / Date */}
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div
              className={`flex size-5 shrink-0 items-center justify-center rounded-[3px] text-[9.5px] font-mono font-bold tracking-tight border ${colorClass}`}
            >
              {initials}
            </div>
            <span className="text-[11px] font-medium text-muted-foreground truncate group-hover:text-foreground transition-colors">
              {application.companyName}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <span className="text-[10px] font-mono tabular-nums text-muted-foreground/60">
              {formattedDate}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-5 shrink-0 rounded p-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground transition-all cursor-pointer"
                >
                  <MoreHorizontal className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-[6px] border border-border bg-popover p-1 shadow-lg text-xs">
                <DropdownMenuItem onClick={onEdit} className="gap-2 text-xs cursor-pointer rounded-[4px]">
                  <Pencil className="size-3" /> Edit
                </DropdownMenuItem>
                {application.jobUrl && (
                  <DropdownMenuItem
                    onClick={() => window.open(application.jobUrl!, "_blank")}
                    className="gap-2 text-xs cursor-pointer rounded-[4px]"
                  >
                    <ExternalLink className="size-3" /> Job link
                  </DropdownMenuItem>
                )}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2 text-xs cursor-pointer rounded-[4px]">
                    <ArrowRight className="size-3" /> Move
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-32 rounded-[6px] border border-border bg-popover p-1 shadow-lg">
                    {STATUS_OPTIONS.filter((s) => s.toLowerCase() !== application.status.toLowerCase()).map((status) => (
                      <DropdownMenuItem key={status} onClick={() => onMoveTo(status)} className="text-xs cursor-pointer rounded-[4px]">
                        {status}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="gap-2 text-xs text-destructive focus:text-destructive cursor-pointer rounded-[4px]">
                  <Trash2 className="size-3" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Row 2: Job Title (Compact, High legibility) */}
        <h3 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {application.jobTitle}
        </h3>

        {/* Salary Benchmark Indicator (if salary exists) */}
        {application.salary && (
          <div className="pt-0.5">
            <SalaryIndexIndicator
              salary={application.salary}
              company={application.companyName}
              role={application.jobTitle}
              location={application.location}
            />
          </div>
        )}

        {/* Row 3: Meta & Micro Badges (Follow-up Alert & Source) */}
        {(followUpDue || application.source === "Career Orchestrator" || nextStage) && (
          <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-border/40 text-[10px]">
            <div className="flex items-center gap-1 min-w-0">
              {followUpDue ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenFollowUp?.(application.id)
                  }}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] text-[9.5px] font-mono font-medium border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
                  title="5+ days dormant. Click to open Follow-Up draft."
                >
                  <Clock className="size-2.5" />
                  <span>Follow-up</span>
                </button>
              ) : application.source === "Career Orchestrator" ? (
                <span className="inline-flex items-center gap-0.5 text-[9.5px] font-mono text-primary font-medium">
                  <Bot className="size-2.5" /> Auto
                </span>
              ) : null}
            </div>

            {nextStage && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onMoveTo(nextStage.status)
                }}
                className="opacity-0 group-hover:opacity-100 ml-auto inline-flex items-center gap-0.5 text-[9.5px] font-sans font-medium px-1.5 py-0.5 rounded border border-border bg-background hover:bg-muted text-foreground transition-all cursor-pointer shrink-0"
                title={`Advance to ${nextStage.status}`}
              >
                <span>{nextStage.label}</span>
                <ArrowRight className="size-2" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

export default BoardCard
