"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  ExternalLink,
  Mic,
  Pencil,
  Trash2,
  Video,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

interface Props {
  companyName: string
  jobTitle: string
  applicationId: string
  interviewDate?: Date | string | null
  interviewRound?: string | null
  interviewMeetingUrl?: string | null
  interviewNotes?: string | null
  onScheduleUpdate?: (updated: {
    interviewDate: string | null
    interviewRound: string | null
    interviewMeetingUrl: string | null
    interviewNotes: string | null
  }) => void
  onDelete: () => void
}

const ROUND_OPTIONS = [
  "Recruiter Screen",
  "Technical / Coding",
  "System Design",
  "Behavioral (STAR)",
  "Hiring Manager / Team Fit",
  "Executive / Final Onsite",
  "Take-Home Review",
  "Other",
]

function toLocalDatetimeString(dateInput?: Date | string | null): string {
  if (!dateInput) return ""
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return ""
  const pad = (n: number) => n.toString().padStart(2, "0")
  const year = d.getFullYear()
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hours = pad(d.getHours())
  const minutes = pad(d.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export default function ApplicationDetailHeader({
  companyName,
  jobTitle,
  applicationId,
  interviewDate,
  interviewRound,
  interviewMeetingUrl,
  interviewNotes,
  onScheduleUpdate,
  onDelete,
}: Props) {
  const cleanCompanyName = companyName.replace(/\s*\(inferred from.*?\)\s*/gi, "").trim()

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [round, setRound] = useState(interviewRound || "Technical / Coding")
  const [dateTime, setDateTime] = useState(toLocalDatetimeString(interviewDate))
  const [meetingUrl, setMeetingUrl] = useState(interviewMeetingUrl || "")
  const [notes, setNotes] = useState(interviewNotes || "")
  const [isSaving, setIsSaving] = useState(false)

  const handleOpenModal = () => {
    setRound(interviewRound || "Technical / Coding")
    setDateTime(toLocalDatetimeString(interviewDate))
    setMeetingUrl(interviewMeetingUrl || "")
    setNotes(interviewNotes || "")
    setScheduleModalOpen(true)
  }

  const handleSaveSchedule = async () => {
    if (!dateTime) {
      toast.error("Please specify an interview date and time.")
      return
    }

    setIsSaving(true)
    try {
      const isoDate = new Date(dateTime).toISOString()
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewDate: isoDate,
          interviewRound: round,
          interviewMeetingUrl: meetingUrl.trim() || null,
          interviewNotes: notes.trim() || null,
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to save interview schedule")
      }

      toast.success("Interview schedule updated!")
      onScheduleUpdate?.({
        interviewDate: isoDate,
        interviewRound: round,
        interviewMeetingUrl: meetingUrl.trim() || null,
        interviewNotes: notes.trim() || null,
      })
      setScheduleModalOpen(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update interview schedule"
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClearSchedule = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewDate: null,
          interviewRound: null,
          interviewMeetingUrl: null,
          interviewNotes: null,
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to clear interview schedule")
      }

      toast.success("Interview schedule cleared.")
      onScheduleUpdate?.({
        interviewDate: null,
        interviewRound: null,
        interviewMeetingUrl: null,
        interviewNotes: null,
      })
      setScheduleModalOpen(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to clear schedule"
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
        <Link href="/applications" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-3 w-3" />
          Applications
        </Link>
        <span>/</span>
        <span className="text-foreground truncate">{cleanCompanyName}</span>
      </div>

      {/* Main Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{cleanCompanyName}</h1>
          <p className="text-sm font-medium text-muted-foreground mt-0.5">{jobTitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" className="h-9 rounded-md font-semibold text-sm cursor-pointer shadow-xs px-3.5">
            <Link href={`/interview-prep?appId=${applicationId}&company=${encodeURIComponent(cleanCompanyName)}&role=${encodeURIComponent(jobTitle)}`}>
              <Mic className="h-4 w-4 mr-1.5" /> Mock Prep Room
            </Link>
          </Button>
          {!interviewDate ? (
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-md text-sm font-medium cursor-pointer px-3.5"
              onClick={handleOpenModal}
            >
              <CalendarClock className="h-3.5 w-3.5 mr-1.5 text-primary" /> Schedule Interview
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-md text-sm font-medium cursor-pointer px-3.5 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
              onClick={handleOpenModal}
            >
              <CalendarClock className="h-3.5 w-3.5 mr-1.5 text-amber-500" /> Reschedule
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="h-9 rounded-md text-sm font-medium cursor-pointer px-3.5">
            <Link href={`/applications/${applicationId}/edit`}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="h-9 rounded-md text-sm text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer px-3" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Scheduled Interview Banner */}
      {interviewDate && (
        <div className="relative rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">
                  Scheduled: {interviewRound || "Interview Round"}
                </span>
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  Upcoming
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 font-mono">
                <Clock className="h-3 w-3" />
                {new Date(interviewDate).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                at{" "}
                {new Date(interviewDate).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {interviewMeetingUrl && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold rounded-md border-amber-500/30 hover:bg-amber-500/10"
              >
                <a
                  href={interviewMeetingUrl.startsWith("http") ? interviewMeetingUrl : `https://${interviewMeetingUrl}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Video className="h-3.5 w-3.5 mr-1 text-amber-600 dark:text-amber-400" />
                  Join Call
                  <ExternalLink className="h-3 w-3 ml-1 opacity-70" />
                </a>
              </Button>
            )}
            <Button
              asChild
              size="sm"
              className="h-8 text-xs font-semibold rounded-md shadow-xs bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-black"
            >
              <Link
                href={`/interview-prep?appId=${applicationId}&company=${encodeURIComponent(
                  cleanCompanyName
                )}&role=${encodeURIComponent(jobTitle)}`}
              >
                <Mic className="h-3.5 w-3.5 mr-1" /> Mock Prep
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs rounded-md"
              onClick={handleOpenModal}
            >
              <Pencil className="h-3 w-3 mr-1" /> Reschedule
            </Button>
          </div>
        </div>
      )}

      {/* Schedule / Reschedule Dialog Modal */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>
              Set interview date, round type, and video meeting link for {cleanCompanyName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Interview Round</label>
              <Select value={round} onValueChange={setRound}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select round" />
                </SelectTrigger>
                <SelectContent>
                  {ROUND_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Date & Time</label>
              <Input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Meeting Link (Zoom / Meet / Teams)</label>
              <Input
                type="url"
                placeholder="https://meet.google.com/..."
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Cheatsheet & Preparation Notes</label>
              <Textarea
                placeholder="Key topics to review, interviewer names, questions to ask..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
            {interviewDate ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSchedule}
                disabled={isSaving}
                className="text-destructive hover:bg-destructive/10 text-xs h-9"
              >
                Clear Schedule
              </Button>
            ) : <div />}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScheduleModalOpen(false)}
                disabled={isSaving}
                className="h-9"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveSchedule}
                disabled={isSaving}
                className="h-9"
              >
                {isSaving ? "Saving..." : "Save Schedule"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
