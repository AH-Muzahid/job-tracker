"use client"

import { useState } from "react"
import { Download, FileSpreadsheet, Loader2, Database } from "lucide-react"
import {
  BlueprintCard,
  BlueprintCardHeader,
  BlueprintCardTitle,
  BlueprintCardContent,
} from "@/components/primitives"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function DataManagementCard() {
  const [exporting, setExporting] = useState(false)

  async function exportData() {
    try {
      setExporting(true)
      const res = await fetch("/api/applications/export")
      if (!res.ok) throw new Error("Failed to export data")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `applications-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Pipeline CSV export downloaded successfully")
    } catch {
      toast.error("Export failed. Please check network connection.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <BlueprintCard>
      <BlueprintCardHeader>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-border bg-muted/40 text-foreground shrink-0">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">EXPORT / 03</span>
            <BlueprintCardTitle className="text-sm font-semibold tracking-tight text-foreground">
              Data Export & Backup
            </BlueprintCardTitle>
          </div>
        </div>

        <span className="font-mono text-[10px] uppercase text-muted-foreground border border-border bg-muted/30 px-2 py-0.5 rounded-[4px]">
          RFC 4180 CSV
        </span>
      </BlueprintCardHeader>

      <BlueprintCardContent>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Download your complete job applications pipeline including company names, roles, stages, salary data, and timestamps.
            </p>
            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground pt-1">
              <Database className="h-3 w-3 text-primary" />
              <span>UTF-8 encoded · Full schema compatibility with Excel, Notion, and Google Sheets</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={exportData}
            disabled={exporting}
            className="rounded-[4px] border-border font-mono text-xs cursor-pointer h-9 px-4 shrink-0 hover:bg-muted w-full sm:w-auto"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin text-primary" />
            ) : (
              <Download className="h-3.5 w-3.5 mr-2" />
            )}
            {exporting ? "Exporting CSV..." : "Export Pipeline CSV"}
          </Button>
        </div>
      </BlueprintCardContent>
    </BlueprintCard>
  )
}
