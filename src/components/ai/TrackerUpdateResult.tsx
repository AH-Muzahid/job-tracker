"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { RefreshCw } from "lucide-react"

interface Props {
  data: Record<string, string | null | undefined>
  onConfirm: () => void
  onReject: () => void
}

export default function TrackerUpdateResult({ data, onConfirm, onReject }: Props) {
  const company = data.company
  const role = data.role
  const status = data.status

  return (
    <Card className="rounded-xl border border-border/80 bg-card/70 backdrop-blur-2xl shadow-xs overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground pb-2 border-b border-border/50">
          <RefreshCw className="h-4 w-4 text-indigo-500" />
          <span>AI Application Tracker Update</span>
        </div>
        {company && <p className="text-xs text-muted-foreground">Company: <span className="font-bold text-foreground">{company}</span></p>}
        {role && <p className="text-xs text-muted-foreground">Role: <span className="font-bold text-foreground">{role}</span></p>}
        {status && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/20 bg-primary/5 text-primary">{status}</Badge>
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={onConfirm} className="h-7 text-xs rounded-lg gap-1 font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs">
            ✓ Confirm Update
          </Button>
          <Button size="sm" variant="outline" onClick={onReject} className="h-7 text-xs rounded-lg gap-1 font-semibold text-muted-foreground hover:text-foreground">
            ✕ Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
