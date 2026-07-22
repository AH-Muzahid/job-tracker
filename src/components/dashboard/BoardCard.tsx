"use client"

import { ExternalLink, MoreHorizontal, Pencil, Trash2, ArrowRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getCompanyColor, getInitials } from "./utils"
import { STATUS_OPTIONS } from "./types"
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
  onEdit: () => void
  onDelete: () => void
  onMoveTo: (status: string) => void
}

export default function BoardCard({ application, onClick, onEdit, onDelete, onMoveTo }: Props) {
  const initials = getInitials(application.companyName)
  const colorClass = getCompanyColor(application.companyName)

  return (
    <div className="group block w-full text-left">
      <Card className="p-3 transition-all duration-200 hover:shadow-md hover:ring-1 hover:ring-primary/20 cursor-pointer active:scale-[0.98]">
        <div className="flex items-start justify-between gap-2">
          <button onClick={onClick} className="flex min-w-0 items-start gap-2.5 flex-1 text-left">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${colorClass}`}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{application.companyName}</p>
              <p className="truncate text-sm font-semibold leading-tight">{application.jobTitle}</p>
            </div>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
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
                <DropdownMenuSubContent className="w-36">
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
