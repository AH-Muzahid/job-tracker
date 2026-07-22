"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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
    <div className="space-y-3 rounded-lg border p-4">
      <p className="text-sm font-medium">AI wants to update your tracker:</p>
      {company && <p className="text-xs text-muted-foreground">Company: <span className="font-medium">{company}</span></p>}
      {role && <p className="text-xs text-muted-foreground">Role: <span className="font-medium">{role}</span></p>}
      {status && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Status:</span>
          <Badge variant="outline" className="text-xs">{status}</Badge>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={onConfirm} className="gap-1">
          ✓ Confirm
        </Button>
        <Button size="sm" variant="outline" onClick={onReject} className="gap-1">
          ✗ Reject
        </Button>
      </div>
    </div>
  )
}
