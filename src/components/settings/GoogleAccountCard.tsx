"use client"

import React, { useState, useEffect } from "react"
import { Mail, RefreshCw, Trash2, ExternalLink, ShieldCheck, AlertTriangle } from "lucide-react"
import {
  BlueprintCard,
  BlueprintCardHeader,
  BlueprintCardTitle,
  BlueprintCardContent,
} from "@/components/primitives"
import { StatusBadge } from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"

export function GoogleAccountCard() {
  const [connected, setConnected] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [confirmDisconnectOpen, setConfirmDisconnectOpen] = useState(false)

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
        setConfirmDisconnectOpen(false)
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
    <>
      <BlueprintCard>
        <BlueprintCardHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-border bg-muted/40 text-foreground shrink-0">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">SYNC / GMAIL</span>
              <BlueprintCardTitle className="text-sm font-semibold tracking-tight text-foreground">
                Personal Gmail Integration
              </BlueprintCardTitle>
            </div>
          </div>

          <StatusBadge
            status={connected ? "accepted" : "saved"}
            customLabel={connected ? "Connected" : "Disconnected"}
            size="sm"
          />
        </BlueprintCardHeader>

        <BlueprintCardContent className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Send recruiter outreach emails directly from your personal Gmail address and automatically sync incoming interview replies to your pipeline.
          </p>

          <div className="rounded-[4px] border border-border bg-muted/20 p-3.5 space-y-2.5 font-mono text-xs">
            <div className="flex items-start gap-2 text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed font-sans">
                OAuth tokens are securely stored using AES-256-GCM authenticated encryption. Access is restricted strictly to job correspondence threads.
              </p>
            </div>

            {connected && email && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-2 border-t border-border/40 text-[11px]">
                <span className="text-muted-foreground shrink-0">Active Address:</span>
                <span className="font-mono text-foreground bg-background px-2 py-0.5 rounded-[4px] border border-border break-all max-w-full">
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
                className="rounded-[4px] border-border font-mono text-xs h-8 px-3 cursor-pointer flex-1 sm:flex-initial"
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
                  className="rounded-[4px] font-mono text-xs h-8 px-3 cursor-pointer flex-1 sm:flex-initial"
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
                onClick={() => setConfirmDisconnectOpen(true)}
                disabled={disconnecting || syncing}
                className="rounded-[4px] font-mono text-xs h-8 px-3 cursor-pointer w-full sm:w-auto"
              >
                <Trash2 className="w-3 h-3 mr-1.5" />
                Disconnect
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleConnect}
                disabled={loading}
                className="rounded-[4px] font-mono text-xs h-8 px-4 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
              >
                <ExternalLink className="w-3 h-3 mr-1.5" />
                Connect Gmail Account
              </Button>
            )}
          </div>
        </BlueprintCardContent>
      </BlueprintCard>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={confirmDisconnectOpen} onOpenChange={setConfirmDisconnectOpen}>
        <DialogContent className="sm:max-w-md rounded-[8px] border border-border bg-background p-6">
          <DialogHeader>
            <div className="flex items-center gap-2.5 pb-2">
              <div className="h-8 w-8 rounded-[4px] bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  Disconnect Gmail Account?
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  This will sever automatic inbox syncing and remove your stored credentials.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 text-xs text-muted-foreground leading-relaxed">
            Outreach drafts will no longer be able to send emails through <strong className="text-foreground">{email}</strong> until you re-authenticate.
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmDisconnectOpen(false)}
              disabled={disconnecting}
              className="rounded-[4px] font-mono text-xs h-8 px-3"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="rounded-[4px] font-mono text-xs h-8 px-4"
            >
              {disconnecting ? "Disconnecting..." : "Confirm Disconnect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
