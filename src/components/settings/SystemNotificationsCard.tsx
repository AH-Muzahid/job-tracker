"use client"

import { useState, useEffect } from "react"
import { Bell, Mail, Calendar } from "lucide-react"
import {
  BlueprintCard,
  BlueprintCardHeader,
  BlueprintCardTitle,
  BlueprintCardContent,
} from "@/components/primitives"
import { StatusBadge } from "@/components/StatusBadge"
import { toast } from "sonner"

interface NotificationPref {
  id: string
  title: string
  description: string
  enabled: boolean
  icon: typeof Bell
}

export function SystemNotificationsCard() {
  const [prefs, setPrefs] = useState<NotificationPref[]>([
    {
      id: "interview_alerts",
      title: "Interview Reminders",
      description: "Email and browser alerts 24 hours and 1 hour before scheduled interview stages.",
      enabled: true,
      icon: Calendar,
    },
    {
      id: "status_updates",
      title: "Application Updates & Recruiter Replies",
      description: "Immediate alert when Gmail sync detects a recruiter response or interview invite.",
      enabled: true,
      icon: Mail,
    },
    {
      id: "weekly_digest",
      title: "Weekly Performance Digest",
      description: "Monday morning summary of active pipeline volume, weekly goals, and upcoming dates.",
      enabled: false,
      icon: Bell,
    },
  ])

  // Load from localStorage if present
  useEffect(() => {
    try {
      const stored = localStorage.getItem("careertrack_notification_prefs")
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, boolean>
        setPrefs((current) =>
          current.map((item) => ({
            ...item,
            enabled: parsed[item.id] !== undefined ? parsed[item.id] : item.enabled,
          }))
        )
      }
    } catch {
      // Ignore localStorage parse errors
    }
  }, [])

  function togglePref(id: string) {
    setPrefs((current) => {
      const updated = current.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
      try {
        const storeObj: Record<string, boolean> = {}
        for (const item of updated) {
          storeObj[item.id] = item.enabled
        }
        localStorage.setItem("careertrack_notification_prefs", JSON.stringify(storeObj))
      } catch {
        // Storage fail
      }
      toast.success("Notification preferences updated")
      return updated
    })
  }

  const activeCount = prefs.filter((p) => p.enabled).length

  return (
    <BlueprintCard>
      <BlueprintCardHeader>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-border bg-muted/40 text-foreground shrink-0">
            <Bell className="h-4 w-4 text-primary" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">NOTIF / 04</span>
            <BlueprintCardTitle className="text-sm font-semibold tracking-tight text-foreground">
              System Notifications & Alerts
            </BlueprintCardTitle>
          </div>
        </div>

        <StatusBadge
          status="applied"
          customLabel={`${activeCount} of ${prefs.length} Active`}
          size="sm"
        />
      </BlueprintCardHeader>

      <BlueprintCardContent className="space-y-3 pt-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Configure real-time notification channels for pipeline events, recruiter interactions, and scheduled rounds.
        </p>

        <div className="divide-y divide-border/40 rounded-[6px] border border-border bg-muted/10 overflow-hidden">
          {prefs.map((pref) => {
            const Icon = pref.icon
            return (
              <div
                key={pref.id}
                className="flex items-center justify-between p-3 sm:p-4 gap-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-7 w-7 rounded-[4px] border border-border bg-background flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-3.5 w-3.5 text-foreground" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{pref.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{pref.description}</p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={pref.enabled}
                  onClick={() => togglePref(pref.id)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                    pref.enabled ? "bg-primary border-primary" : "bg-muted border-border"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-background shadow-xs transition duration-200 ease-in-out m-0.5 ${
                      pref.enabled ? "translate-x-4 bg-primary-foreground" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            )
          })}
        </div>
      </BlueprintCardContent>
    </BlueprintCard>
  )
}
