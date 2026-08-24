"use client"

import React, { useState, useEffect } from "react"
import { FileSpreadsheet, Check, Copy, ExternalLink, RefreshCw, HelpCircle, Save } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from "@/lib/google-sheets"

export function GoogleSheetsIntegrationCard() {
  const [sheetUrl, setSheetUrl] = useState("")
  const [webhookUrl, setWebhookUrl] = useState("")
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [copied, setCopied] = useState(false)

  // Fetch current config on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true)
        const res = await fetch("/api/integrations/google-sheets")
        if (res.ok) {
          const data = await res.json()
          if (data.config) {
            setSheetUrl(data.config.sheetUrl || "")
            setWebhookUrl(data.config.webhookUrl || "")
            setAutoSyncEnabled(Boolean(data.config.autoSyncEnabled))
            setLastSyncedAt(data.config.lastSyncedAt || null)
          }
        }
      } catch (err) {
        console.error("Failed to load Google Sheets config:", err)
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [])

  async function handleSave() {
    try {
      setSaving(true)
      const res = await fetch("/api/integrations/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetUrl,
          webhookUrl,
          autoSyncEnabled,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to save settings")
      }

      toast.success("Google Sheets configuration saved!")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleManualSync() {
    if (!webhookUrl) {
      toast.error("Please provide and save a Webhook URL first.")
      return
    }

    try {
      setSyncing(true)
      const res = await fetch("/api/integrations/google-sheets/sync", {
        method: "POST",
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Sync failed")
      }

      setLastSyncedAt(new Date().toISOString())
      toast.success(data.message || `Successfully synced ${data.count} applications!`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sync failed"
      toast.error(msg)
    } finally {
      setSyncing(false)
    }
  }

  function copyAppsScript() {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE)
    setCopied(true)
    toast.success("Apps Script code copied!")
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <Card className="rounded-xl border border-border bg-card shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                Google Sheets Real-time Auto-Sync
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Automatically push every created or imported application to your live Google Sheet.
              </CardDescription>
            </div>
          </div>

          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              autoSyncEnabled && webhookUrl
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-muted text-muted-foreground border-border"
            }`}
          >
            {autoSyncEnabled && webhookUrl ? "Auto-Sync Active" : "Disconnected"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {loading ? (
          <div className="py-4 text-center text-xs text-muted-foreground">Loading configuration...</div>
        ) : (
          <>
            {/* Sheet URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Google Sheet Spreadsheet URL (Optional bookmark)</span>
                {sheetUrl && (
                  <a
                    href={sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    Open Sheet <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </Label>
              <Input
                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            {/* Webhook URL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-foreground">
                  Google Apps Script Webhook URL <span className="text-destructive">*</span>
                </Label>

                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline cursor-pointer"
                    >
                      <HelpCircle className="h-3 w-3" /> Setup in 30 seconds
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="text-sm font-semibold flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                        How to connect your Google Sheet in 30 seconds
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 text-xs text-muted-foreground leading-relaxed pt-2">
                      <ol className="list-decimal list-inside space-y-2">
                        <li>
                          Open any blank Google Sheet and click <strong className="text-foreground">Extensions &gt; Apps Script</strong>.
                        </li>
                        <li>
                          Paste the script below into the code editor and click <strong className="text-foreground">Save</strong>.
                        </li>
                        <li>
                          Click <strong className="text-foreground">Deploy &gt; New deployment</strong>.
                        </li>
                        <li>
                          Select type <strong className="text-foreground">Web app</strong>, set <em>&quot;Execute as&quot;</em> to <strong>Me</strong>, and <em>&quot;Who has access&quot;</em> to <strong>Anyone</strong>.
                        </li>
                        <li>
                          Click <strong className="text-foreground">Deploy</strong>, copy the generated <strong className="text-foreground">Web app URL</strong>, and paste it into CareerTrack below!
                        </li>
                      </ol>

                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-[11px] text-foreground">Apps Script Code:</span>
                          <Button variant="outline" size="sm" onClick={copyAppsScript} className="h-6 text-[11px] gap-1">
                            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                            {copied ? "Copied" : "Copy Code"}
                          </Button>
                        </div>
                        <pre className="p-2.5 rounded-lg bg-muted border border-border text-[11px] font-mono overflow-x-auto max-h-48">
                          {GOOGLE_APPS_SCRIPT_TEMPLATE}
                        </pre>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Input
                placeholder="https://script.google.com/macros/s/.../exec"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="text-xs h-8 font-mono"
              />
            </div>

            {/* Toggle auto-sync */}
            <div className="flex items-center justify-between pt-1">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium">Automatic Instant Sync</Label>
                <p className="text-[11px] text-muted-foreground">
                  Whenever an application is added by you or the AI agent, append it to your Google Sheet immediately.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoSyncEnabled}
                onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoSyncEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                    autoSyncEnabled ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {lastSyncedAt && (
              <p className="text-[11px] text-muted-foreground pt-0.5">
                Last Synced: <span className="text-foreground font-medium">{new Date(lastSyncedAt).toLocaleString()}</span>
              </p>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSync}
                disabled={syncing || !webhookUrl}
                className="text-xs h-8 gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync All Applications Now"}
              </Button>

              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="text-xs h-8 gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
