"use client"

import { useRouter } from "next/navigation"
import { ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import StatusBadge from "@/components/StatusBadge"
import { getCompanyColor, getInitials } from "./utils"
import type { Application } from "./types"

export default function TableView({ applications }: { applications: Application[] }) {
  const router = useRouter()

  return (
    <div className="rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Company</th>
              <th className="px-4 py-3 text-left font-medium">Job Title</th>
              <th className="px-4 py-3 text-left font-medium">Tags</th>
              <th className="px-4 py-3 text-left font-medium">Source</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => {
              const initials = getInitials(application.companyName)
              const colorClass = getCompanyColor(application.companyName)

              return (
                <tr
                  key={application.id}
                  className="cursor-pointer border-b transition-colors hover:bg-muted/50"
                  onClick={() => router.push(`/applications/${application.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white ${colorClass}`}>
                        {initials}
                      </div>
                      <span className="font-medium">{application.companyName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{application.jobTitle}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {application.tags.slice(0, 2).map(({ tag }) => (
                        <Badge key={tag.id} variant="outline" className="text-xs">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
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
                      <a
                        href={application.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
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
