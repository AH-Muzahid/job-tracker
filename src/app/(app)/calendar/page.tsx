"use client"

import { useEffect, useMemo, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarClock,
  Mic,
  Video,
  ExternalLink,
  Clock,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import StatusBadge from "@/components/StatusBadge"

interface Application {
  id: string
  companyName: string
  jobTitle: string
  status: string
  applicationDate: string
  interviewDate?: string | null
  interviewRound?: string | null
  interviewMeetingUrl?: string | null
  interviewNotes?: string | null
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export default function CalendarPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      router.push("/login")
      return
    }

    fetch("/api/applications?pageSize=100&sort=newest")
      .then((r) => r.json())
      .then((d) => setApplications(d.data || []))
      .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn, router])

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: {
      date: Date
      isCurrentMonth: boolean
      apps: Application[]
      interviews: Application[]
    }[] = []

    for (let i = 0; i < firstDay; i++) {
      const d = new Date(year, month, -firstDay + i + 1)
      days.push({ date: d, isCurrentMonth: false, apps: [], interviews: [] })
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i)
      const dateStr = d.toISOString().split("T")[0]
      const apps = applications.filter((a) =>
        a.applicationDate ? a.applicationDate.split("T")[0] === dateStr : false
      )
      const interviews = applications.filter((a) =>
        a.interviewDate ? a.interviewDate.split("T")[0] === dateStr : false
      )
      days.push({ date: d, isCurrentMonth: true, apps, interviews })
    }

    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i)
      days.push({ date: d, isCurrentMonth: false, apps: [], interviews: [] })
    }

    return days
  }, [currentDate, applications])

  const scheduledInterviews = useMemo(() => {
    return applications
      .filter((a) => Boolean(a.interviewDate))
      .sort((a, b) => new Date(a.interviewDate!).getTime() - new Date(b.interviewDate!).getTime())
  }, [applications])

  const today = new Date().toISOString().split("T")[0]

  if (!isLoaded || loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-10 w-full min-w-0">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-56 rounded-md" />
          <Skeleton className="h-4 w-80 rounded-sm" />
        </div>

        <Card className="rounded-xl border border-border/80 bg-card shadow-xs">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-6 w-36 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center pb-2 border-b border-border/60">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-10 mx-auto rounded-sm" />
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  className="min-h-16 sm:min-h-24 p-1.5 sm:p-2 rounded-lg border border-border/40 bg-muted/20 space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <Skeleton className="size-4 rounded-full" />
                  </div>
                  {i % 4 === 1 && <Skeleton className="h-3.5 w-full rounded-sm" />}
                  {i % 5 === 2 && <Skeleton className="h-3.5 w-4/5 rounded-sm" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Application Calendar</h1>
          <p className="text-sm text-muted-foreground">Timeline view of your job applications and key interview milestones</p>
        </div>
      </div>

      {/* Upcoming Scheduled Interviews Section */}
      {scheduledInterviews.length > 0 && (
        <Card className="rounded-xl border border-amber-500/30 bg-amber-500/5 shadow-xs">
          <CardContent className="p-4 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-amber-500" />
                Upcoming Scheduled Interviews ({scheduledInterviews.length})
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {scheduledInterviews.map((app) => {
                const dateObj = new Date(app.interviewDate!)
                const cleanCompany = app.companyName.replace(/\s*\(inferred from.*?\)\s*/gi, "").trim()
                return (
                  <div
                    key={app.id}
                    className="flex flex-col justify-between rounded-lg border border-amber-500/20 bg-background/80 p-3.5 gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            href={`/applications/${app.id}`}
                            className="text-sm font-bold text-foreground hover:underline truncate"
                          >
                            {cleanCompany}
                          </Link>
                          <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            {app.interviewRound || "Interview"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{app.jobTitle}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-medium text-foreground block">
                          {dateObj.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1 justify-end">
                          <Clock className="h-2.5 w-2.5" />
                          {dateObj.toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                      {app.interviewMeetingUrl && (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-medium px-2.5"
                        >
                          <a
                            href={
                              app.interviewMeetingUrl.startsWith("http")
                                ? app.interviewMeetingUrl
                                : `https://${app.interviewMeetingUrl}`
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Video className="h-3 w-3 mr-1 text-amber-500" />
                            Join Call
                            <ExternalLink className="h-2.5 w-2.5 ml-1 opacity-70" />
                          </a>
                        </Button>
                      )}
                      <Button
                        asChild
                        size="sm"
                        className="h-7 text-xs font-semibold px-2.5 bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-black"
                      >
                        <Link
                          href={`/interview-prep?appId=${app.id}&company=${encodeURIComponent(
                            cleanCompany
                          )}&role=${encodeURIComponent(app.jobTitle)}`}
                        >
                          <Mic className="h-3 w-3 mr-1" /> Mock Prep
                        </Link>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar Grid */}
      <Card className="rounded-xl border border-border/80 bg-card shadow-xs">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              className="h-8 w-8 rounded-lg cursor-pointer hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-base font-bold text-foreground">
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              className="h-8 w-8 rounded-lg cursor-pointer hover:bg-accent"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-px bg-border/60 rounded-xl overflow-hidden border border-border/80">
            {DAY_NAMES.map((day) => (
              <div
                key={day}
                className="bg-secondary/40 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                {day}
              </div>
            ))}
            {calendarDays.map((day, i) => {
              const dateStr = day.date.toISOString().split("T")[0]
              const isToday = dateStr === today
              const totalEvents = day.interviews.length + day.apps.length

              return (
                <div
                  key={i}
                  className={`bg-card p-2 min-h-[95px] sm:min-h-[115px] transition-colors flex flex-col justify-between ${
                    !day.isCurrentMonth ? "opacity-35 bg-muted/20" : "hover:bg-accent/20"
                  } ${isToday ? "ring-2 ring-primary/80 ring-inset bg-primary/5" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isToday
                          ? "text-primary flex h-5 w-5 items-center justify-center rounded-full bg-primary/10"
                          : "text-muted-foreground"
                      }`}
                    >
                      {day.date.getDate()}
                    </span>
                    {totalEvents > 0 && (
                      <span className="text-[10px] font-medium text-muted-foreground/70">
                        {totalEvents}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 mt-1">
                    {/* Scheduled Interviews First */}
                    {day.interviews.map((app) => (
                      <Link
                        key={`interview-${app.id}`}
                        href={`/interview-prep?appId=${app.id}&company=${encodeURIComponent(
                          app.companyName
                        )}&role=${encodeURIComponent(app.jobTitle)}`}
                        className="rounded-md px-1.5 py-0.5 bg-amber-500/15 text-[10px] font-semibold truncate text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 flex items-center gap-1 transition-colors"
                        title={`Scheduled Interview: ${app.companyName} (${app.interviewRound || "Interview"})`}
                      >
                        <CalendarClock className="h-2.5 w-2.5 shrink-0 text-amber-500" />
                        <span className="truncate">{app.companyName}</span>
                      </Link>
                    ))}

                    {/* Applications Submitted */}
                    {day.apps.slice(0, Math.max(1, 2 - day.interviews.length)).map((app) => (
                      <Link
                        key={`app-${app.id}`}
                        href={`/applications/${app.id}`}
                        className="rounded-md px-1.5 py-0.5 bg-primary/10 text-[10px] font-medium truncate text-primary border border-primary/20 hover:bg-primary/20 transition-colors block"
                        title={`Application: ${app.companyName} — ${app.jobTitle}`}
                      >
                        {app.companyName}
                      </Link>
                    ))}

                    {totalEvents > 2 && (
                      <p className="text-[10px] font-medium text-muted-foreground text-center">
                        +{totalEvents - 2} more
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-muted-foreground border-t border-border/40">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-md bg-primary/20 border border-primary" />
              <span>Today</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-md bg-amber-500/20 border border-amber-500" />
              <span>Scheduled Interview (Click for Prep Room)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-md bg-primary/10 border border-primary/30" />
              <span>Application Submitted</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Applications Feed */}
      <Card className="rounded-xl border border-border/80 bg-card shadow-xs">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Recent Applications
          </h3>
          <div className="space-y-2">
            {applications.slice(0, 5).map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/20 px-3.5 py-2.5 hover:bg-secondary/40 transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-sm font-semibold text-foreground truncate">{app.companyName}</p>
                  <p className="text-xs text-muted-foreground truncate">{app.jobTitle}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={app.status} />
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {new Date(app.applicationDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
