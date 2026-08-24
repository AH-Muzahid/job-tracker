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

export interface GoogleSheetsConfigData {
  sheetUrl: string
  webhookUrl: string
  autoSyncEnabled: boolean
  lastSyncedAt?: string | null
}

interface Props {
  initialConfig?: GoogleSheetsConfigData | null
  isLoading?: boolean
}

export function GoogleSheetsIntegrationCard({ initialConfig, isLoading = false }: Props) {
  const [sheetUrl, setSheetUrl] = useState(initialConfig?.sheetUrl || "")
  const [webhookUrl, setWebhookUrl] = useState(initialConfig?.webhookUrl || "")
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(initialConfig?.autoSyncEnabled || false)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(initialConfig?.lastSyncedAt || null)
  
  const [loading, setLoading] = useState(isLoading && !initialConfig)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [copied, setCopied] = useState(false)

  // Sync state if initialConfig changes
  useEffect(() => {
    if (initialConfig) {
      setSheetUrl(initialConfig.sheetUrl || "")
      setWebhookUrl(initialConfig.webhookUrl || "")
      setAutoSyncEnabled(Boolean(initialConfig.autoSyncEnabled))
      setLastSyncedAt(initialConfig.lastSyncedAt || null)
      setLoading(false)
    }
  }, [initialConfig])

  // Fallback direct load if not provided by parent
  useEffect(() => {
    if (!initialConfig) {
      let isMounted = true
      async function loadConfig() {
        try {
          setLoading(true)
          const res = await fetch("/api/integrations/google-sheets")
          if (res.ok && isMounted) {
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
          if (isMounted) setLoading(false)
        }
      }
      loadConfig()
      return () => { isMounted = false }
    }
  }, [initialConfig])

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
      toast.error("Please configure the Apps Script Webhook URL first.")
      return
    }

    try {
      setSyncing(true)
      const res = await fetch("/api/integrations/google-sheets/sync", {
        method: "POST",
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to sync applications")
      }

      const syncTime = new Date().toISOString()
      setLastSyncedAt(syncTime)
      toast.success(`Successfully synced ${data.count || 0} applications to Google Sheets!`)
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
    toast.success("Apps Script code copied to clipboard!")
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <Card className="rounded-xl border border-border/80 bg-card shadow-2xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                Google Sheets Real-time Auto-Sync
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Automatically push every created or imported application to your live Google Sheet.
              </CardDescription>
            </div>
          </div>

          <span
            className={`inline-flex items-center self-start sm:self-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${
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

                {/* Setup Modal */}
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline cursor-pointer font-medium"
                    >
                      <HelpCircle className="h-3.5 w-3.5" /> Setup in 30 seconds
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl">
                    <DialogHeader>
                      <div className="flex items-center justify-between pr-6">
                        <DialogTitle className="text-sm font-semibold flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-emerald-500 shrink-0" />
                          Connect Google Sheet in 5 Steps
                        </DialogTitle>
                      </div>
                    </DialogHeader>

                    <div className="space-y-3 text-xs text-muted-foreground leading-relaxed pt-1">
                      {/* Step 1 */}
                      <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border/60">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          1
                        </span>
                        <div className="space-y-1 flex-1">
                          <p className="text-foreground font-medium">Open Google Sheet & Apps Script</p>
                          <p className="text-[11px] text-muted-foreground">
                            Open any blank Google Sheet and click{" "}
                            <strong className="text-foreground">Extensions ➔ Apps Script</strong>.
                          </p>
                          <a
                            href="https://sheets.new"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold pt-0.5"
                          >
                            Create New Sheet at sheets.new <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border/60">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          2
                        </span>
                        <div className="space-y-1 flex-1">
                          <p className="text-foreground font-medium">Paste the Code & Save</p>
                          <p className="text-[11px] text-muted-foreground">
                            Delete any sample code in the editor, paste the Apps Script code below, and press{" "}
                            <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">Ctrl+S / ⌘+S</kbd> to save.
                          </p>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border/60">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          3
                        </span>
                        <div className="space-y-1 flex-1">
                          <p className="text-foreground font-medium">Click Deploy</p>
                          <p className="text-[11px] text-muted-foreground">
                            Click the blue <strong className="text-foreground">Deploy</strong> button (top right) ➔ select{" "}
                            <strong className="text-foreground">New deployment</strong>.
                          </p>
                        </div>
                      </div>

                      {/* Step 4 */}
                      <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border/60">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          4
                        </span>
                        <div className="space-y-1 flex-1">
                          <p className="text-foreground font-medium">Configure Web App Permissions</p>
                          <p className="text-[11px] text-muted-foreground">
                            Click the Gear ⚙️ icon ➔ select <strong className="text-foreground">Web app</strong>.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
                            <div className="p-1.5 rounded bg-background border border-border">
                              <span className="text-muted-foreground">Execute as: </span>
                              <strong className="text-foreground">Me (your email)</strong>
                            </div>
                            <div className="p-1.5 rounded bg-background border border-border">
                              <span className="text-muted-foreground">Who has access: </span>
                              <strong className="text-foreground">Anyone</strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 5 */}
                      <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border/60">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          5
                        </span>
                        <div className="space-y-1 flex-1">
                          <p className="text-foreground font-medium">Copy Web App URL</p>
                          <p className="text-[11px] text-muted-foreground">
                            Click <strong className="text-foreground">Deploy</strong>, copy the generated{" "}
                            <strong className="text-foreground">Web app URL</strong> (ending in <code className="font-mono text-primary">/exec</code>), and paste it into the Webhook URL field.
                          </p>
                        </div>
                      </div>

                      {/* Code Snippet Box */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-xs text-foreground">Apps Script Code:</span>
                          <Button variant="outline" size="sm" onClick={copyAppsScript} className="h-6 text-xs gap-1.5 cursor-pointer">
                            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                            {copied ? "Copied!" : "Copy Code"}
                          </Button>
                        </div>
                        <pre className="p-3 rounded-lg bg-muted/70 border border-border text-[10.5px] font-mono overflow-x-auto max-h-40 leading-relaxed text-foreground/90 select-all">
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
              <div className="space-y-0.5 pr-2">
                <Label className="text-xs font-medium text-foreground">Automatic Instant Sync</Label>
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
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSync}
                disabled={syncing || !webhookUrl}
                className="text-xs h-8 gap-1.5 w-full sm:w-auto cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync All Applications"}
              </Button>

              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="text-xs h-8 gap-1.5 w-full sm:w-auto cursor-pointer"
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
