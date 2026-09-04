"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2, BookmarkPlus } from "lucide-react"
import { DecorIcon } from "@/components/decor-icon"
import type { ExternalJobOpportunity } from "@/lib/ai/graph/tools/discovery-tools"

interface DiscoveryTrackModalProps {
  job: ExternalJobOpportunity | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTrackApplied: (job: ExternalJobOpportunity) => void
  onSaveToTracker?: (job: ExternalJobOpportunity) => void
  isSubmitting?: boolean
}

export function DiscoveryTrackModal({
  job,
  open,
  onOpenChange,
  onTrackApplied,
  onSaveToTracker,
  isSubmitting = false,
}: DiscoveryTrackModalProps) {
  if (!job) return null

  const handleConfirm = () => {
    onTrackApplied(job)
    onOpenChange(false)
  }

  const handleSave = () => {
    onSaveToTracker?.(job)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-5 !overflow-hidden border-border bg-card rounded-none shadow-2xl">
        <DecorIcon position="top-right" />
        <DecorIcon position="bottom-left" />

        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="text-base font-bold text-foreground">
            Track External Application
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            The external job application page was opened in a new tab. Would you like to track this in your Pipeline?
          </DialogDescription>
        </DialogHeader>

        {/* Quick Job Overview Card */}
        <div className="p-3 border border-border/70 bg-muted/20 rounded-none space-y-1 my-2">
          <p className="text-xs font-semibold text-foreground truncate">{job.title}</p>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
            <span className="truncate">{job.company}</span>
            <span>•</span>
            <span>{job.location}</span>
          </div>
        </div>

        {/* 3 Action Buttons with Proper Orientation & UX Alignment */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-8 text-xs rounded-none text-muted-foreground hover:text-foreground cursor-pointer justify-center sm:justify-start px-2"
          >
            Not Now
          </Button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {onSaveToTracker && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={isSubmitting}
                className="h-8 text-xs rounded-none gap-1.5 cursor-pointer border-border justify-center"
              >
                <BookmarkPlus className="size-3.5 text-muted-foreground" />
                <span>Save to Tracker</span>
              </Button>
            )}

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="h-8 text-xs font-semibold rounded-none gap-1.5 cursor-pointer shadow-xs justify-center"
            >
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              <span>Track as Applied</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
