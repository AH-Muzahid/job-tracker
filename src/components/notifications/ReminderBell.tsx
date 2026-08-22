"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Bell, Calendar, Mail, CheckCircle2, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import type { ReminderAlert } from "@/app/api/notifications/reminders/route"

export default function ReminderBell() {
  const [isOpen, setIsOpen] = useState(false)

  const { data: reminders = [], isLoading: loading } = useQuery({
    queryKey: ["notifications", "reminders"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/reminders")
      const json = await res.json()
      if (res.ok && json.data?.reminders) {
        return json.data.reminders as ReminderAlert[]
      }
      return []
    },
    staleTime: 5 * 60 * 1000,
  })

  const getIcon = (type: ReminderAlert["type"]) => {
    switch (type) {
      case "interview":
        return <Calendar className="h-4 w-4 text-emerald-500 shrink-0" />
      case "followup":
        return <Mail className="h-4 w-4 text-blue-500 shrink-0" />
      default:
        return <CheckCircle2 className="h-4 w-4 text-purple-500 shrink-0" />
    }
  }

  const highPriorityCount = reminders.filter((r) => r.priority === "high").length

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {reminders.length > 0 && (
          <span
            className={`absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full ${
              highPriorityCount > 0 ? "bg-red-500 animate-pulse" : "bg-primary"
            }`}
          />
        )}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 rounded-xl border bg-popover p-4 shadow-xl text-popover-foreground animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">Reminders & Action Items</h3>
                {reminders.length > 0 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {reminders.length}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] px-2 text-muted-foreground"
                onClick={() => setIsOpen(false)}
              >
                Close
              </Button>
            </div>

            {loading ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Loading reminders...
              </div>
            ) : reminders.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                🎉 All caught up! No pending reminders right now.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {reminders.map((reminder) => (
                  <Link
                    key={reminder.id}
                    href={reminder.actionUrl}
                    onClick={() => setIsOpen(false)}
                    className="group flex items-start gap-3 rounded-lg border p-2.5 transition-colors hover:bg-muted/60"
                  >
                    <div className="mt-0.5">{getIcon(reminder.type)}</div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-medium truncate group-hover:text-primary">
                          {reminder.title}
                        </p>
                        {reminder.priority === "high" && (
                          <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 shrink-0">
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {reminder.description}
                      </p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity self-center shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
