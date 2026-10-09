"use client"

import { useState, useEffect } from "react"
import { Bell, Mail, Smartphone, Calendar, Save, Loader2 } from "lucide-react"
import {
  BlueprintCard,
  BlueprintCardHeader,
  BlueprintCardTitle,
  BlueprintCardContent,
} from "@/components/primitives"
import { StatusBadge } from "@/components/StatusBadge"
import { toast } from "sonner"

interface ProfileNotificationSettings {
  phone?: string | null
  notifyEmail?: boolean
  notifySms?: boolean
  minMatchScore?: number
}

export function SystemNotificationsCard() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // DB-persisted preferences
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [notifySms, setNotifySms] = useState(false)
  const [phone, setPhone] = useState("")
  const [minMatchScore, setMinMatchScore] = useState(80)

  // Client-side channel preferences (interview alerts)
  const [interviewAlerts, setInterviewAlerts] = useState(true)

  // Fetch preferences from API
  useEffect(() => {
    let isMounted = true
    async function fetchPreferences() {
      try {
        const res = await fetch("/api/user/profile")
        if (res.ok) {
          const data = (await res.json()) as ProfileNotificationSettings
          if (isMounted) {
            if (data.notifyEmail !== undefined) setNotifyEmail(data.notifyEmail)
            if (data.notifySms !== undefined) setNotifySms(data.notifySms)
            if (data.phone) setPhone(data.phone)
            if (data.minMatchScore !== undefined) setMinMatchScore(data.minMatchScore)
          }
        }
      } catch (err) {
        console.error("Failed to load notification settings:", err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    // Load local storage preferences
    try {
      const stored = localStorage.getItem("careertrack_notification_prefs")
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, boolean>
        if (parsed.interview_alerts !== undefined) {
          setInterviewAlerts(parsed.interview_alerts)
        }
      }
    } catch {
      // Ignore
    }

    void fetchPreferences()
    return () => {
      isMounted = false
    }
  }, [])

  async function handleSaveSettings() {
    if (notifySms && (!phone || phone.trim().length < 8)) {
      toast.error("Please enter a valid phone number with country code for SMS alerts")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim() || null,
          notifyEmail,
          notifySms,
          minMatchScore,
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to update notification settings")
      }

      // Persist interview alerts locally
      try {
        localStorage.setItem(
          "careertrack_notification_prefs",
          JSON.stringify({ interview_alerts: interviewAlerts })
        )
      } catch {
        // Ignore
      }

      toast.success("Notification preferences updated successfully")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving preferences"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const activeChannelsCount = (notifyEmail ? 1 : 0) + (notifySms ? 1 : 0) + (interviewAlerts ? 1 : 0)

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
              Job Match & System Notifications
            </BlueprintCardTitle>
          </div>
        </div>

        <StatusBadge
          status="applied"
          customLabel={`${activeChannelsCount} of 3 Channels Active`}
          size="sm"
        />
      </BlueprintCardHeader>

      <BlueprintCardContent className="space-y-4 pt-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Configure how and when CareerTrack alerts you about high-fit job opportunities, daily briefings, and interview reminders.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="divide-y divide-border/40 rounded-[6px] border border-border bg-muted/10 overflow-hidden">
              {/* Email Notifications Toggle */}
              <div className="flex items-center justify-between p-3.5 sm:p-4 gap-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-[4px] border border-border bg-background flex items-center justify-center shrink-0 mt-0.5">
                    <Mail className="h-4 w-4 text-foreground" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-foreground">Daily Opportunity Email Digest</p>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] bg-primary/10 text-primary border border-primary/20">
                        RESEND
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Delivers top matched jobs (&ge;{minMatchScore}%), active pipeline metrics, and stale follow-ups every morning.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={notifyEmail}
                  onClick={() => setNotifyEmail(!notifyEmail)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                    notifyEmail ? "bg-primary border-primary" : "bg-muted border-border"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-background shadow-xs transition duration-200 ease-in-out m-0.5 ${
                      notifyEmail ? "translate-x-4 bg-primary-foreground" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* SMS Notifications Toggle */}
              <div className="p-3.5 sm:p-4 hover:bg-muted/20 transition-colors space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-[4px] border border-border bg-background flex items-center justify-center shrink-0 mt-0.5">
                      <Smartphone className="h-4 w-4 text-foreground" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-foreground">High-Fit SMS Job Alerts</p>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          QUEUE / TWILIO
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Instant single-segment text message when newly evaluated opportunities meet your match criteria.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifySms}
                    onClick={() => setNotifySms(!notifySms)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                      notifySms ? "bg-primary border-primary" : "bg-muted border-border"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-background shadow-xs transition duration-200 ease-in-out m-0.5 ${
                        notifySms ? "translate-x-4 bg-primary-foreground" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Extended SMS Configuration (Phone Number & Threshold) */}
                {notifySms && (
                  <div className="pl-11 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-border/40">
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1">
                        Recipient Mobile Number
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+8801700000000 or +1234567890"
                        className="w-full text-xs font-mono h-8 px-2.5 rounded-[4px] border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">
                        Include country code (e.g. +880, +1)
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1">
                        Minimum Fit Threshold
                      </label>
                      <select
                        value={minMatchScore}
                        onChange={(e) => setMinMatchScore(Number(e.target.value))}
                        className="w-full text-xs h-8 px-2 rounded-[4px] border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary tabular-nums"
                      >
                        <option value={75}>75% Fit & Above (Recommended)</option>
                        <option value={80}>80% Fit & Above (Strict)</option>
                        <option value={85}>85% Fit & Above (Very High)</option>
                        <option value={90}>90% Fit & Above (Dream Roles Only)</option>
                      </select>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">
                        Only triggers SMS if score exceeds this percentage
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Interview Reminders Toggle */}
              <div className="flex items-center justify-between p-3.5 sm:p-4 gap-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-[4px] border border-border bg-background flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar className="h-4 w-4 text-foreground" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-semibold text-foreground">Interview Prep Briefings</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      24-hour and 2-hour pre-interview dossiers with mock prep questions and company analysis.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={interviewAlerts}
                  onClick={() => setInterviewAlerts(!interviewAlerts)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                    interviewAlerts ? "bg-primary border-primary" : "bg-muted border-border"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-background shadow-xs transition duration-200 ease-in-out m-0.5 ${
                      interviewAlerts ? "translate-x-4 bg-primary-foreground" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[4px] bg-[#533AFD] text-white hover:bg-[#533AFD]/90 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Preferences</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </BlueprintCardContent>
    </BlueprintCard>
  )
}
