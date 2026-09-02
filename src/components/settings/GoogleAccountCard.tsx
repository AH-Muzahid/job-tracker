"use client"

import React, { useState, useEffect } from "react"
import { Mail, CheckCircle2, AlertCircle, RefreshCw, Trash2, ExternalLink, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function GoogleAccountCard() {
  const [connected, setConnected] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/auth/connect/google/status")
      if (res.ok) {
        const data = await res.json()
        setConnected(Boolean(data.connected))
        setEmail(data.email || null)
      }
    } catch (err) {
      console.error("Failed to check Google account status:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncNow = async () => {
    try {
      setSyncing(true)
      const res = await fetch("/api/integrations/gmail/sync", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        if (data.statusUpdates > 0) {
          toast.success(`Sync complete! ${data.statusUpdates} application status(es) updated.`)
        } else if (data.repliesMatched > 0) {
          toast.info(`Sync complete. Matched ${data.repliesMatched} recruiter reply/replies.`)
        } else {
          toast.success("Inbox synced. No new recruiter status changes found.")
        }
      } else {
        toast.error("Inbox sync failed.")
      }
    } catch (err) {
      console.error("Sync error:", err)
      toast.error("Failed to sync inbox.")
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchStatus()

    // Check url search params for status toasts
    const params = new URLSearchParams(window.location.search)
    if (params.get("connected") === "google") {
      toast.success("Google Account successfully connected!")
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (params.get("error")) {
      const errCode = params.get("error")
      toast.error(`Connection failed: ${errCode}`)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const handleConnect = () => {
    window.location.href = "/api/auth/connect/google"
  }

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true)
      const res = await fetch("/api/auth/connect/google", { method: "DELETE" })
      if (res.ok) {
        setConnected(false)
        setEmail(null)
        toast.success("Google Account disconnected.")
      } else {
        toast.error("Failed to disconnect Google Account.")
      }
    } catch (err) {
      console.error("Error disconnecting account:", err)
      toast.error("An error occurred while disconnecting.")
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <Card className="border border-border/60 shadow-sm bg-card text-card-foreground">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight">Personal Email Integration</CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-0.5">
                Send outreach emails directly from your verified Google account and sync incoming recruiter replies.
              </CardDescription>
            </div>
          </div>
          {connected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <AlertCircle className="w-3.5 h-3.5" />
              Not Connected
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="p-4 rounded-lg bg-muted/40 border border-border/50 text-sm space-y-3">
          <div className="flex items-start gap-2.5 text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              We store OAuth refresh tokens with AES-256-GCM encryption. We only request permissions to draft & dispatch outreach emails and read job interview response threads.
            </p>
          </div>

          {connected && email && (
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <span className="text-xs text-muted-foreground">Connected Gmail Address:</span>
              <span className="text-xs font-mono font-medium text-foreground bg-background px-2.5 py-1 rounded border border-border">
                {email}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStatus}
              disabled={loading || disconnecting || syncing}
              className="text-xs h-8"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh Status
            </Button>

            {connected && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSyncNow}
                disabled={syncing || loading}
                className="text-xs h-8"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? "animate-spin text-primary" : ""}`} />
                {syncing ? "Syncing..." : "Sync Inbox Now"}
              </Button>
            )}
          </div>

          {connected ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnecting || syncing}
              className="text-xs h-8"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              {disconnecting ? "Disconnecting..." : "Disconnect Account"}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleConnect}
              disabled={loading}
              className="text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Connect Google Account
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
