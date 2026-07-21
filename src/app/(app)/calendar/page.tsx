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
      const apps = applications.filter((a) => a.applicationDate.split("T")[0] === dateStr)
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
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full rounded-xl" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-sm text-muted-foreground">Track your application timeline</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold">
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {DAY_NAMES.map((day) => (
              <div key={day} className="bg-muted/50 p-2 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
            {calendarDays.map((day, i) => {
              const dateStr = day.date.toISOString().split("T")[0]
              const isToday = dateStr === today
              return (
                <div
                  key={i}
                  className={`bg-background p-1.5 min-h-[80px] sm:min-h-[100px] ${
                    !day.isCurrentMonth ? "opacity-40" : ""
                  } ${isToday ? "ring-2 ring-primary ring-inset" : ""}`}
                >
                  <p className={`text-xs font-medium mb-1 ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                    {day.date.getDate()}
                  </p>
                  <div className="space-y-0.5">
                    {day.apps.slice(0, 2).map((app) => (
                      <div key={app.id} className="rounded px-1 py-0.5 bg-primary/10 text-[9px] font-medium truncate text-primary">
                        {app.companyName}
                      </div>
                    ))}
                    {day.apps.length > 2 && (
                      <p className="text-[9px] text-muted-foreground text-center">+{day.apps.length - 2}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-primary/10 ring-1 ring-primary" /> Today</div>
            <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-primary/10" /> Application</div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Recent Applications
          </h3>
          <div className="space-y-2">
            {applications.slice(0, 5).map((app) => (
              <div key={app.id} className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/50 transition-colors">
                <div>
                  <p className="text-sm font-medium">{app.companyName}</p>
                  <p className="text-xs text-muted-foreground">{app.jobTitle}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={app.status} />
                  <span className="text-xs text-muted-foreground">
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
