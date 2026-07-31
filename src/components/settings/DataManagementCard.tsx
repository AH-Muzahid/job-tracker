"use client"

import { Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function DataManagementCard() {
  async function exportData() {
    try {
      const res = await fetch("/api/applications/export")
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `applications-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Export downloaded")
    } catch {
      toast.error("Export failed")
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Download className="h-4 w-4" /> Data Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Export Applications</p>
            <p className="text-xs text-muted-foreground">Download all applications as CSV</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
