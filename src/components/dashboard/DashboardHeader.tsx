"use client"

import { CalendarDays, Plus, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardHeader({
  dateRange,
  onAddNew,
}: {
  dateRange: string
  onAddNew: () => void
}) {
  return (
    <div className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" />
          Job pipeline overview
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Keep track of your applied jobs all in one place.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span>{dateRange}</span>
        </div>
        <Button onClick={onAddNew}>
          <Plus className="h-4 w-4" />
          Add Job
        </Button>
      </div>
    </div>
  )
}
