"use client"

import { ExternalLink, MoreHorizontal, Pencil, Trash2, ArrowRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getCompanyColor, getInitials } from "./utils"
import { STATUS_OPTIONS } from "./types"
import type { Application } from "./types"

const tagColors: Record<string, string> = {
  REMOTE: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  "FULL TIME": "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  "PART TIME": "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  INTERNSHIP: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  URGENT: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  "ON-SITE": "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  HYBRID: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
}

interface Props {
  application: Application
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
  onMoveTo: (status: string) => void
}

export default function BoardCard({ application, onClick, onEdit, onDelete, onMoveTo }: Props) {
  const initials = getInitials(application.companyName)
  const colorClass = getCompanyColor(application.companyName)

  return (
    <div className="group block w-full text-left">
      <Card className="p-3.5 rounded-xl border border-border/80 bg-card/60 backdrop-blur-xl shadow-xs hover:shadow-md hover:border-primary/40 transition-all duration-200 cursor-pointer active:scale-[0.99]">
        <div className="flex items-start justify-between gap-2">
          <button onClick={onClick} className="flex min-w-0 items-start gap-2.5 flex-1 text-left cursor-pointer">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-xs ${colorClass}`}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground truncate">{application.companyName}</p>
              <p className="truncate text-xs font-bold text-foreground leading-tight">{application.jobTitle}</p>
            </div>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-lg">
              <DropdownMenuItem onClick={onEdit} className="gap-2 text-xs">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </DropdownMenuItem>
              {application.jobUrl && (
                <DropdownMenuItem
                  onClick={() => window.open(application.jobUrl!, "_blank")}
                  className="gap-2 text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open Link
                </DropdownMenuItem>
              )}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2 text-xs">
                  <ArrowRight className="h-3.5 w-3.5" /> Move to
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-36 rounded-lg">
                  {STATUS_OPTIONS.filter((s) => s !== application.status).map((status) => (
                    <DropdownMenuItem key={status} onClick={() => onMoveTo(status)} className="text-xs">
                      {status}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="gap-2 text-xs text-destructive focus:text-destructive">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {application.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {application.tags.map(({ tag }) => (
              <Badge
                key={tag.id}
                variant="outline"
                className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold border ${tagColors[tag.name] || "bg-muted text-muted-foreground border-border"}`}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>{new Date(application.applicationDate).toLocaleDateString()}</span>
          {application.jobUrl && (
            <button
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                window.open(application.jobUrl!, "_blank")
              }}
            >
              <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>
      </Card>
    </div>
  )
}
