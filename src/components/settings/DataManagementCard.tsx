"use client"

import { useState } from "react"
import { Download, FileSpreadsheet, Loader2 } from "lucide-react"
import { DecorIcon } from "@/components/decor-icon"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function DataManagementCard() {
  const [exporting, setExporting] = useState(false)

  async function exportData() {
    try {
      setExporting(true)
      const res = await fetch("/api/applications/export")
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `applications-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Pipeline CSV export downloaded")
    } catch {
      toast.error("Export failed. Please try again.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="relative rounded-none border border-border bg-card/60 backdrop-blur-xl p-4 sm:p-6 transition-colors">
      <DecorIcon position="top-right" />
      <DecorIcon position="bottom-left" />

      <div className="flex items-center justify-between pb-4 border-b border-border/70">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center border border-border bg-muted/40 text-foreground">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">EXPORT / 03</span>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Data Export & Backup</h3>
          </div>
        </div>

        <span className="font-mono text-[10px] uppercase text-muted-foreground border border-border px-1.5 py-0.5">
          RFC 4180 CSV
        </span>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Download your complete job applications pipeline including companies, stages, notes, and salary data.
          </p>
          <span className="text-[10px] font-mono text-muted-foreground mt-1 inline-block">
            UTF-8 encoded · Compatible with Excel, Notion, Google Sheets
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={exportData}
          disabled={exporting}
          className="rounded-none border-border font-mono text-xs cursor-pointer h-9 px-4 shrink-0 hover:bg-muted w-full sm:w-auto"
        >
          {exporting ? (
            <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5 mr-2" />
          )}
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>
    </div>
  )
}
