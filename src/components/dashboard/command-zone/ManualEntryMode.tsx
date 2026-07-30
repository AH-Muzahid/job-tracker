"use client"

import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Props {
  manualCompany: string
  setManualCompany: (val: string) => void
  manualTitle: string
  setManualTitle: (val: string) => void
  manualSource: string
  setManualSource: (val: string) => void
  manualLoading: boolean
  onSubmit: (e: React.FormEvent) => void
}

export function ManualEntryMode({
  manualCompany,
  setManualCompany,
  manualTitle,
  setManualTitle,
  manualSource,
  setManualSource,
  manualLoading,
  onSubmit,
}: Props) {
  return (
    <form onSubmit={onSubmit} className="space-y-2.5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Input
          placeholder="Company name"
          className="h-9 text-xs bg-background/80 border-border/80"
          value={manualCompany}
          onChange={(e) => setManualCompany(e.target.value)}
          disabled={manualLoading}
        />
        <Input
          placeholder="Job title"
          className="h-9 text-xs bg-background/80 border-border/80"
          value={manualTitle}
          onChange={(e) => setManualTitle(e.target.value)}
          disabled={manualLoading}
        />
        <Select value={manualSource} onValueChange={setManualSource} disabled={manualLoading}>
          <SelectTrigger className="h-9 text-xs bg-background/80 border-border/80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["LinkedIn", "Bdjobs", "Indeed", "Wellfound", "Facebook", "Referral", "Other"].map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={manualLoading || !manualCompany.trim() || !manualTitle.trim()}
          className="text-xs font-semibold h-8 px-4 cursor-pointer"
        >
          {manualLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              Saving...
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Application
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
