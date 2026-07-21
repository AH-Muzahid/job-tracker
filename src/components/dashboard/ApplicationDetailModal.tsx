"use client"

import { useEffect, useState } from "react"
import { ExternalLink, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import StatusBadge from "@/components/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import DeleteConfirmModal from "./DeleteConfirmModal"
import ApplicationFormModal from "./ApplicationFormModal"

interface StatusChange {
  id: string
  fromStatus: string | null
  toStatus: string
  changedAt: string
}

interface TagItem {
  tag: { id: string; name: string }
}

interface Application {
  id: string
  companyName: string
  jobTitle: string
  jobUrl: string | null
  source: string
  applicationDate: string
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  tags: TagItem[]
  statusChanges: StatusChange[]
}

interface Props {
  applicationId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
  onDeleted: () => void
}

const statusColors: Record<string, string> = {
  Saved: "bg-gray-100 dark:bg-gray-800",
  Applied: "bg-blue-100 dark:bg-blue-900/50",
  Assessment: "bg-yellow-100 dark:bg-yellow-900/50",
  Interview: "bg-purple-100 dark:bg-purple-900/50",
  Rejected: "bg-red-100 dark:bg-red-900/50",
  Offer: "bg-green-100 dark:bg-green-900/50",
}

export default function ApplicationDetailModal({
  applicationId,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: Props) {
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (!open || !applicationId) {
      setApplication(null)
      return
    }

    setLoading(true)
    fetch(`/api/applications/${applicationId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load")
        return res.json()
      })
      .then(setApplication)
      .catch(() => toast.error("Failed to load application"))
      .finally(() => setLoading(false))
  }, [open, applicationId])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0 gap-0">
          {loading || !application ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-28" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <DialogHeader className="p-6 pb-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${statusColors[application.status] || "bg-gray-100"}`}>
                      {application.companyName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <DialogTitle className="text-xl">{application.companyName}</DialogTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">{application.jobTitle}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <StatusBadge status={application.status} />
                        <Badge variant="outline">{application.source}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditOpen(true)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <DetailItem label="Source" value={application.source} />
                  <DetailItem
                    label="Applied"
                    value={new Date(application.applicationDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  />
                  <DetailItem
                    label="Status"
                    value={application.status}
                    badge={<StatusBadge status={application.status} />}
                  />
                  {application.jobUrl && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Job Post</p>
                      <a
                        href={application.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        View posting
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>

                {application.tags.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {application.tags.map(({ tag }) => (
                        <Badge key={tag.id} variant="secondary" className="text-xs">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {application.notes && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</p>
                    <p className="text-sm whitespace-pre-wrap rounded-lg bg-muted/50 p-3">{application.notes}</p>
                  </div>
                )}

                {application.statusChanges.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Timeline</p>
                    <div className="relative ml-2">
                      <div className="absolute left-0 top-2 bottom-2 w-px bg-border" />
                      <div className="space-y-3">
                        {application.statusChanges.map((sc, i) => (
                          <div key={sc.id} className="relative flex items-start gap-3 pl-4">
                            <div className={`absolute left-[-3px] top-1.5 h-[7px] w-[7px] rounded-full ring-2 ring-background ${i === 0 ? "bg-primary" : "bg-muted-foreground/40"}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {sc.fromStatus && (
                                  <>
                                    <StatusBadge status={sc.fromStatus} />
                                    <span className="text-muted-foreground text-xs">→</span>
                                  </>
                                )}
                                <StatusBadge status={sc.toStatus} />
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(sc.changedAt).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {application && (
        <>
          <ApplicationFormModal
            open={editOpen}
            onOpenChange={setEditOpen}
            applicationId={application.id}
            onUpdated={() => {
              setEditOpen(false)
              onUpdated()
              // Re-fetch detail
              fetch(`/api/applications/${application.id}`)
                .then((r) => r.json())
                .then(setApplication)
            }}
          />
          <DeleteConfirmModal
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            applicationId={application.id}
            companyName={application.companyName}
            onDeleted={() => {
              setDeleteOpen(false)
              onOpenChange(false)
              onDeleted()
            }}
          />
        </>
      )}
    </>
  )
}

function DetailItem({
  label,
  value,
  badge,
}: {
  label: string
  value: string
  badge?: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      {badge || <p className="text-sm font-medium">{value}</p>}
    </div>
  )
}
