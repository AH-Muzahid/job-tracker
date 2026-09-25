"use client"

import { useEffect, useState } from "react"
import {
  Calendar,
  ExternalLink,
  Globe,
  Pencil,
  StickyNote,
  Tag,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import StatusBadge from "@/components/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import Link from "next/link"
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

const statusDots: Record<string, string> = {
  Saved: "bg-gray-500",
  Applied: "bg-blue-500",
  Assessment: "bg-amber-500",
  Interview: "bg-purple-500",
  Rejected: "bg-red-500",
  Offer: "bg-emerald-500",
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

  const dot = application ? statusDots[application.status] || statusDots.Saved : ""

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden p-0 gap-0 rounded-[8px] border border-border bg-card [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {loading || !application ? (
            <DetailSkeleton />
          ) : (
            <>
              {/* Header Banner - Solid Stripe Surface */}
              <div className="relative bg-muted/30 border-b border-border px-6 pt-6 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[6px] text-base font-bold bg-primary text-primary-foreground">
                        {application.companyName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${dot}`} />
                    </div>
                    <div className="pt-0.5">
                      <h2 className="text-base sm:text-lg font-bold leading-tight text-foreground">{application.companyName}</h2>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{application.jobTitle}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <StatusBadge status={application.status} />
                        <Badge variant="outline" className="text-xs font-normal">{application.source}</Badge>
                        {application.jobUrl && (
                          <a
                            href={application.jobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Globe className="h-3 w-3" />
                            Job post
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                    <Button
                      size="sm"
                      className="h-8 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-xs"
                      asChild
                    >
                      <Link href={`/interview-prep?appId=${application.id}&company=${encodeURIComponent(application.companyName)}&role=${encodeURIComponent(application.jobTitle)}`}>
                        Prep Room
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs border-border text-foreground hover:bg-secondary cursor-pointer font-medium"
                      asChild
                    >
                      <Link href={`/applications/${application.id}`}>
                        Workbench
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2.5 text-muted-foreground hover:text-foreground"
                      onClick={() => setEditOpen(true)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4 max-h-[calc(90vh-120px)] overflow-y-auto space-y-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {/* Info Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <InfoCard
                    icon={<Globe className="h-3.5 w-3.5" />}
                    label="Source"
                    value={application.source}
                  />
                  <InfoCard
                    icon={<Calendar className="h-3.5 w-3.5" />}
                    label="Applied"
                    value={new Date(application.applicationDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  />
                  <InfoCard
                    icon={<Tag className="h-3.5 w-3.5" />}
                    label="Status"
                    value={application.status}
                    highlight
                  />
                </div>

                {/* Tags */}
                {application.tags.length > 0 && (
                  <div>
                    <SectionHeader icon={<Tag className="h-3.5 w-3.5" />} title="Tags" />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {application.tags.map(({ tag }) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="text-xs font-normal"
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {application.notes && (
                  <div>
                    <SectionHeader icon={<StickyNote className="h-3.5 w-3.5" />} title="Notes" />
                    <div className="mt-2 rounded-xl bg-muted/40 border p-3.5">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {application.notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                {application.statusChanges.length > 0 && (
                  <div>
                    <SectionHeader icon={<Calendar className="h-3.5 w-3.5" />} title="Activity" />
                    <div className="mt-3 relative">
                      <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border" />
                      <div className="space-y-0">
                        {application.statusChanges.map((sc, i) => (
                          <div key={sc.id} className="relative flex items-start gap-3 py-2.5 first:pt-0">
                            <div className={`relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-4 ring-background ${
                              i === 0
                                ? `${statusDots[sc.toStatus] || "bg-primary"} text-white`
                                : "bg-muted text-muted-foreground"
                            }`}>
                              <div className="h-1.5 w-1.5 rounded-full bg-current" />
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {sc.fromStatus && (
                                  <>
                                    <StatusBadge status={sc.fromStatus} />
                                    <span className="text-muted-foreground text-[10px]">→</span>
                                  </>
                                )}
                                <StatusBadge status={sc.toStatus} />
                              </div>
                              <p className="text-[11px] text-muted-foreground/70 mt-1">
                                {new Date(sc.changedAt).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
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

                {/* Empty Timeline State */}
                {application.statusChanges.length === 0 && (
                  <div>
                    <SectionHeader icon={<Calendar className="h-3.5 w-3.5" />} title="Activity" />
                    <div className="mt-2 rounded-xl border border-dashed p-6 text-center">
                      <p className="text-xs text-muted-foreground/60">No activity yet</p>
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

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-muted-foreground">{icon}</div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
    </div>
  )
}

function InfoCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="rounded-xl bg-muted/30 border px-3.5 py-3 space-y-1.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      {highlight ? (
        <StatusBadge status={value} />
      ) : (
        <p className="text-sm font-medium">{value}</p>
      )}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-14 w-14 rounded-2xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-28" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-muted/30 border p-3.5 space-y-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
