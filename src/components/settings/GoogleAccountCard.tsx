"use client"

import React, { useState, useEffect } from "react"
import { Mail, RefreshCw, Trash2, ExternalLink, ShieldCheck } from "lucide-react"
import { DecorIcon } from "@/components/decor-icon"
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
    <div className="relative rounded-none border border-border bg-card/60 backdrop-blur-xl p-4 sm:p-6 transition-colors">
      <DecorIcon position="top-right" />
      <DecorIcon position="bottom-left" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/70 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center border border-border bg-muted/40 text-foreground shrink-0">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">SYNC / GMAIL</span>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Personal Gmail Integration</h3>
          </div>
        </div>

        {connected ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] uppercase w-fit">
            <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Connected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[10px] uppercase w-fit">
            <span className="h-1.5 w-1.5 bg-amber-500 rounded-full" />
            Disconnected
          </span>
        )}
      </div>

      <div className="mt-4 space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Send recruiter outreach emails directly from your personal Gmail address and automatically sync incoming interview replies to your pipeline.
        </p>

        <div className="rounded-none border border-border/60 bg-muted/20 p-3.5 space-y-2.5 font-mono text-xs">
          <div className="flex items-start gap-2 text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              OAuth tokens are securely stored using AES-256-GCM authenticated encryption. Access is restricted strictly to job correspondence threads.
            </p>
          </div>

          {connected && email && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-2 border-t border-border/40 text-[11px]">
              <span className="text-muted-foreground shrink-0">Active Address:</span>
              <span className="font-mono text-foreground bg-background px-2 py-0.5 border border-border break-all max-w-full">
                {email}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchStatus}
              disabled={loading || disconnecting || syncing}
              className="rounded-none border-border font-mono text-xs h-8 px-3 cursor-pointer flex-1 sm:flex-initial"
            >
              <RefreshCw className={`w-3 h-3 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            {connected && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSyncNow}
                disabled={syncing || loading}
                className="rounded-none font-mono text-xs h-8 px-3 cursor-pointer flex-1 sm:flex-initial"
              >
                <RefreshCw className={`w-3 h-3 mr-1.5 ${syncing ? "animate-spin text-primary" : ""}`} />
                Sync Inbox
              </Button>
            )}
          </div>

          {connected ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnecting || syncing}
              className="rounded-none font-mono text-xs h-8 px-3 cursor-pointer w-full sm:w-auto"
            >
              <Trash2 className="w-3 h-3 mr-1.5" />
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleConnect}
              disabled={loading}
              className="rounded-none font-mono text-xs h-8 px-4 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
            >
              <ExternalLink className="w-3 h-3 mr-1.5" />
              Connect Gmail Account
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
