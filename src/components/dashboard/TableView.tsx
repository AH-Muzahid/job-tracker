"use client"

import { ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import StatusBadge from "@/components/StatusBadge"
import { getCompanyColor, getInitials } from "./utils"
import type { Application } from "./types"

interface Props {
  applications: Application[]
  onSelect: (id: string) => void
}

export default function TableView({ applications, onSelect }: Props) {
  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Company</th>
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Job Title</th>
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground hidden md:table-cell">Tags</th>
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Source</th>
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => {
              const initials = getInitials(application.companyName)
              const colorClass = getCompanyColor(application.companyName)

              return (
                <tr
                  key={application.id}
                  className="cursor-pointer border-b last:border-0 transition-colors hover:bg-muted/50"
                  onClick={() => onSelect(application.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${colorClass}`}>
                        {initials}
                      </div>
                      <span className="font-medium">{application.companyName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{application.jobTitle}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {application.tags.slice(0, 2).map(({ tag }) => (
                        <Badge key={tag.id} variant="outline" className="text-[10px] px-1.5 py-0">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <Badge variant="secondary">{application.source}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(application.applicationDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={application.status} />
                  </td>
                  <td className="px-4 py-3">
                    {application.jobUrl && (
                      <span
                        className="text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(application.jobUrl!, "_blank")
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
