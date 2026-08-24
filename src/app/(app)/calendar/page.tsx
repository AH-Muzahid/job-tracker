"use client"

import { useEffect, useMemo, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
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
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

export default function CalendarPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push("/login"); return }

    fetch("/api/applications?pageSize=500&sort=newest")
      .then((r) => r.json())
      .then((d) => setApplications(d.data || []))
      .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn, router])

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: { date: Date; isCurrentMonth: boolean; apps: Application[] }[] = []

    for (let i = 0; i < firstDay; i++) {
      const d = new Date(year, month, -firstDay + i + 1)
      days.push({ date: d, isCurrentMonth: false, apps: [] })
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i)
      const dateStr = d.toISOString().split("T")[0]
      const apps = applications.filter((a) => a.applicationDate ? a.applicationDate.split("T")[0] === dateStr : false)
      days.push({ date: d, isCurrentMonth: true, apps })
    }

    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i)
      days.push({ date: d, isCurrentMonth: false, apps: [] })
    }

    return days
  }, [currentDate, applications])

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

            {/* Day of week headers */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center pb-2 border-b border-border/60">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-10 mx-auto rounded-sm" />
              ))}
            </div>

            {/* 35 Calendar Cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  className="min-h-16 sm:min-h-24 p-1.5 sm:p-2 rounded-lg border border-border/40 bg-muted/20 space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <Skeleton className="size-4 rounded-full" />
                  </div>
                  {i % 4 === 1 && (
                    <Skeleton className="h-3.5 w-full rounded-sm" />
                  )}
                  {i % 5 === 2 && (
                    <Skeleton className="h-3.5 w-4/5 rounded-sm" />
                  )}
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
          <p className="text-sm text-muted-foreground">Timeline view of your job applications and key milestones</p>
        </div>
      </div>

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
              <div key={day} className="bg-secondary/40 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {day}
              </div>
            ))}
            {calendarDays.map((day, i) => {
              const dateStr = day.date.toISOString().split("T")[0]
              const isToday = dateStr === today
              return (
                <div
                  key={i}
                  className={`bg-card p-2 min-h-[90px] sm:min-h-[110px] transition-colors flex flex-col justify-between ${
                    !day.isCurrentMonth ? "opacity-35 bg-muted/20" : "hover:bg-accent/20"
                  } ${isToday ? "ring-2 ring-primary/80 ring-inset bg-primary/5" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isToday ? "text-primary flex h-5 w-5 items-center justify-center rounded-full bg-primary/10" : "text-muted-foreground"}`}>
                      {day.date.getDate()}
                    </span>
                    {day.apps.length > 0 && (
                      <span className="text-[10px] font-medium text-muted-foreground/70">
                        {day.apps.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 mt-1">
                    {day.apps.slice(0, 2).map((app) => (
                      <div 
                        key={app.id} 
                        className="rounded-md px-1.5 py-0.5 bg-primary/10 text-[10px] font-medium truncate text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                        title={`${app.companyName} — ${app.jobTitle}`}
                      >
                        {app.companyName}
                      </div>
                    ))}
                    {day.apps.length > 2 && (
                      <p className="text-[10px] font-medium text-muted-foreground text-center">
                        +{day.apps.length - 2} more
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
