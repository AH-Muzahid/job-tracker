"use client"

import { ExternalLink, MoreHorizontal, Pencil, Trash2, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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

export default function BoardCard({ application, onClick, onEdit, onDelete, onMoveTo }: Props) {
  const initials = getInitials(application.companyName)
  const colorClass = getCompanyColor()

  return (
    <div className="group block w-full text-left select-none">
      <div className="p-3.5 rounded-md border border-border bg-card/40 hover:bg-card hover:border-foreground/30 transition-all duration-150 cursor-pointer shadow-none">
        <div className="flex items-start justify-between gap-2.5">
          <button onClick={onClick} className="flex min-w-0 items-start gap-2.5 flex-1 text-left cursor-pointer">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-mono font-bold border ${colorClass}`}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground truncate">{application.companyName}</p>
              <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug mt-0.5">{application.jobTitle}</p>
            </div>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground transition-all cursor-pointer"
                onClick={(e) => e.stopPropagation()}
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

        {application.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {application.tags.map(({ tag }) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="text-[11px] font-mono px-2 py-0.5 rounded-md font-medium border border-border bg-muted/40 text-muted-foreground"
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2 font-mono">
          <span className="truncate">{application.source}</span>
          <span>{new Date(application.applicationDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        </div>
      </div>
    </div>
  )
}
