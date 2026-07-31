"use client"

import { useState } from "react"
import { ExternalLink, CheckSquare, Trash2, ArrowRightLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import StatusBadge from "@/components/StatusBadge"
import { getCompanyColor, getInitials } from "./utils"
import type { Application } from "./types"
import { toast } from "sonner"

interface Props {
  applications: Application[]
  onSelect: (id: string) => void
  onBulkSuccess?: () => void
}

const ALL_STATUSES = [
  "Bookmarked",
  "Applying",
  "Applied",
  "Interviewing",
  "Negotiating",
  "Accepted",
  "Rejected",
]

export default function TableView({ applications, onSelect, onBulkSuccess }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [targetStatus, setTargetStatus] = useState("Applied")

  const allSelected = applications.length > 0 && selectedIds.length === applications.length

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(applications.map((app) => app.id))
    }
  }

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} application(s)?`)) return

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/applications/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: selectedIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete applications")

      toast.success(`Deleted ${selectedIds.length} application(s)`)
      setSelectedIds([])
      onBulkSuccess?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bulk delete failed"
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkStatusChange = async () => {
    if (selectedIds.length === 0) return

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/applications/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          ids: selectedIds,
          payload: { status: targetStatus },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update status")

      toast.success(`Updated ${selectedIds.length} application(s) to "${targetStatus}"`)
      setSelectedIds([])
      onBulkSuccess?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bulk status update failed"
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative space-y-4">
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-primary/5 p-3 text-xs font-medium animate-in fade-in-50">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span>{selectedIds.length} item(s) selected</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
                className="h-8 rounded-md border bg-background px-2 text-xs font-normal"
              >
                {ALL_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    Move to {st}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkStatusChange}
                disabled={isSubmitting}
                className="h-8 text-xs"
              >
                Apply Status
              </Button>
            </div>

            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isSubmitting}
              className="h-8 text-xs gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
                  />
                </th>
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
                const isSelected = selectedIds.includes(application.id)

                return (
                  <tr
                    key={application.id}
                    className={`cursor-pointer border-b last:border-0 transition-colors hover:bg-muted/50 ${
                      isSelected ? "bg-primary/5" : ""
                    }`}
                    onClick={() => onSelect(application.id)}
                  >
                    <td className="px-4 py-3 text-center" onClick={(e) => toggleSelectOne(application.id, e)}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
                      />
                    </td>
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
    </div>
  )
}
