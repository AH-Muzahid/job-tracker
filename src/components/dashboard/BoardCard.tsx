"use client"

import { memo } from "react"
import { ExternalLink, MoreHorizontal, Pencil, Trash2, ArrowRight, Calendar, Globe, Building2, MapPin, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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

interface Props {
  application: Application
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
  onMoveTo: (status: string) => void
}

function getTagStyle(tagName: string) {
  const lower = tagName.toLowerCase()
  if (lower.includes("remote")) {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
  }
  if (lower.includes("hybrid")) {
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
  }
  if (lower.includes("full time") || lower.includes("full-time")) {
    return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25"
  }
  if (lower.includes("intern") || lower.includes("contract")) {
    return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25"
  }
  return "bg-muted/60 text-muted-foreground border-border/80"
}

const BoardCard = memo(function BoardCard({ application, onClick, onEdit, onDelete, onMoveTo }: Props) {
  const initials = getInitials(application.companyName)
  const colorClass = getCompanyColor(application.companyName)

  const formattedDate = new Date(application.applicationDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })

  return (
    <div className="group block w-full text-left select-none">
      <div
        onClick={onClick}
        className="relative p-3.5 rounded-lg border border-border/80 bg-card hover:bg-card/90 hover:border-primary/40 hover:shadow-xs transition-all duration-150 cursor-pointer overflow-hidden"
      >
        {/* Top: Company Logo, Name & Actions */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Dynamic Colorful Avatar */}
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold font-mono tracking-wider border shadow-2xs ${colorClass}`}
            >
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-muted-foreground truncate hover:text-foreground transition-colors">
                  {application.companyName}
                </p>
                {application.jobUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open(application.jobUrl!, "_blank")
                    }}
                    className="text-muted-foreground/60 hover:text-primary transition-colors cursor-pointer shrink-0"
                    title="Open Job Link"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions Dropdown */}
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground transition-all cursor-pointer"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-md border border-border bg-popover p-1 shadow-lg">
                <DropdownMenuItem onClick={onEdit} className="gap-2 text-xs cursor-pointer">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </DropdownMenuItem>
                {application.jobUrl && (
                  <DropdownMenuItem
                    onClick={() => window.open(application.jobUrl!, "_blank")}
                    className="gap-2 text-xs cursor-pointer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open Link
                  </DropdownMenuItem>
                )}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2 text-xs cursor-pointer">
                    <ArrowRight className="h-3.5 w-3.5" /> Move to
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-36 rounded-md border border-border bg-popover p-1 shadow-lg">
                    {STATUS_OPTIONS.filter((s) => s !== application.status).map((status) => (
                      <DropdownMenuItem key={status} onClick={() => onMoveTo(status)} className="text-xs cursor-pointer">
                        {status}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="gap-2 text-xs text-destructive focus:text-destructive cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Job Title */}
        <div className="mt-2.5">
          <h3 className="text-[13.5px] font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {application.jobTitle}
          </h3>
        </div>

        {/* Badges / Tags */}
        {application.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {application.tags.map(({ tag }) => {
              const tagStyle = getTagStyle(tag.name)
              return (
                <span
                  key={tag.id}
                  className={`inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-md border ${tagStyle} transition-colors`}
                >
                  {tag.name}
                </span>
              )
            })}
          </div>
        )}

        {/* Bottom Meta Row: Source & Date */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-2 font-mono">
          <span className="truncate max-w-[130px] font-medium text-muted-foreground/90">
            {application.source || "Direct"}
          </span>
          <span className="shrink-0 flex items-center gap-1 text-muted-foreground/75">
            <Calendar className="h-3 w-3" />
            {formattedDate}
          </span>
        </div>
      </div>
    </div>
  )
})

export default BoardCard
