"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Target,
  MapPin,
  DollarSign,
  Building2,
  GraduationCap,
  EyeOff,
  Check,
} from "lucide-react"
import { DecorIcon } from "@/components/decor-icon"
import { cn } from "@/lib/utils"
import type { ExternalJobOpportunity } from "@/lib/discovery/types"

export interface DismissReasonOption {
  key: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

export const DISMISS_REASONS: DismissReasonOption[] = [
  {
    key: "wrong_role",
    label: "Wrong Role / Tech Stack",
    description: "Not aligned with target engineering role or languages",
    icon: Target,
  },
  {
    key: "wrong_location",
    label: "Location / Timezone",
    description: "Not truly remote, wrong timezone, or requires relocation",
    icon: MapPin,
  },
  {
    key: "bad_salary",
    label: "Compensation Issue",
    description: "Salary is unlisted, below expectation, or equity-only",
    icon: DollarSign,
  },
  {
    key: "bad_company",
    label: "Company / Industry",
    description: "Not interested in this specific organization or sector",
    icon: Building2,
  },
  {
    key: "unqualified",
    label: "Seniority Mismatch",
    description: "Requirements differ from my current career stage",
    icon: GraduationCap,
  },
  {
    key: "not_interested",
    label: "Not Interested / Other",
    description: "General pass; hide and reduce similar listings",
    icon: EyeOff,
  },
]

interface DiscoveryDismissModalProps {
  job: ExternalJobOpportunity | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDismiss: (job: ExternalJobOpportunity, reason: string) => void
}

export function DiscoveryDismissModal({
  job,
  open,
  onOpenChange,
  onDismiss,
}: DiscoveryDismissModalProps) {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])

  // Reset selected reasons whenever modal opens with a new job
  useEffect(() => {
    if (open) {
      setSelectedReasons([])
    }
  }, [open, job?.id])

  if (!job) return null

  const handleToggleReason = (reasonKey: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reasonKey)
        ? prev.filter((k) => k !== reasonKey)
        : [...prev, reasonKey]
    )
  }

  const handleSelectAll = () => {
    if (selectedReasons.length === DISMISS_REASONS.length) {
      setSelectedReasons([])
    } else {
      setSelectedReasons(DISMISS_REASONS.map((r) => r.key))
    }
  }

  const handleSubmit = () => {
    if (selectedReasons.length === 0) return
    onDismiss(job, selectedReasons.join(","))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-5 !overflow-hidden border-border bg-card rounded-none shadow-2xl">
        <DecorIcon position="top-right" />
        <DecorIcon position="bottom-left" />

        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <EyeOff className="size-4 text-muted-foreground" />
            <span>Dismiss Opportunity</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Select all reasons that apply. CareerTrack uses this to calibrate and refine your recommendations:
          </DialogDescription>
        </DialogHeader>

        {/* Target Job Quick Summary */}
        <div className="p-3 border border-border/70 bg-muted/20 rounded-none my-1 flex items-center gap-3">
          <div className="size-8 rounded-none bg-muted flex items-center justify-center font-bold text-xs text-foreground shrink-0 border border-border">
            {job.company.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold text-foreground truncate">{job.title}</h4>
            <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
              <span>{job.company}</span>
              <span>•</span>
              <span className="truncate">{job.location}</span>
            </p>
          </div>
        </div>

        {/* Multi-Select Reason Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2">
          {DISMISS_REASONS.map((reason) => {
            const Icon = reason.icon
            const isSelected = selectedReasons.includes(reason.key)

            return (
              <button
                key={reason.key}
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                onClick={() => handleToggleReason(reason.key)}
                className={cn(
                  "group p-3 border transition-all rounded-none text-left cursor-pointer flex flex-col justify-between select-none relative",
                  isSelected
                    ? "border-primary bg-primary/10 dark:bg-primary/15 shadow-xs ring-1 ring-primary/40"
                    : "border-border/70 hover:border-primary/50 bg-background/50 hover:bg-muted/30"
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={cn(
                        "size-6 rounded-none border flex items-center justify-center transition-colors shrink-0",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/60 border-border/60 text-muted-foreground group-hover:text-primary group-hover:border-primary/40"
                      )}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <span
                      className={cn(
                        "text-xs font-semibold truncate transition-colors",
                        isSelected
                          ? "text-primary dark:text-primary font-bold"
                          : "text-foreground group-hover:text-primary"
                      )}
                    >
                      {reason.label}
                    </span>
                  </div>

                  {/* Blueprint Linear Checkbox */}
                  <div
                    className={cn(
                      "size-4 rounded-none border flex items-center justify-center shrink-0 transition-colors",
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/40 bg-background group-hover:border-primary/60"
                    )}
                  >
                    {isSelected && <Check className="size-3 stroke-[3]" />}
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                  {reason.description}
                </p>
              </button>
            )
          })}
        </div>

        {/* Footer Actions: Selection Summary, Cancel, and Submit Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/60">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              {selectedReasons.length > 0 ? (
                <span className="text-foreground font-semibold">
                  {selectedReasons.length} of {DISMISS_REASONS.length} selected
                </span>
              ) : (
                "Select at least one reason"
              )}
            </span>
            {selectedReasons.length > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedReasons([])}
                className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
              >
                Clear
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
              >
                Select all
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs rounded-none cursor-pointer border border-transparent hover:border-border"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={selectedReasons.length === 0}
              onClick={handleSubmit}
              className="h-8 px-4 text-xs font-semibold rounded-none cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all gap-1.5"
            >
              <EyeOff className="size-3.5" />
              <span>
                Dismiss Job{selectedReasons.length > 0 ? ` (${selectedReasons.length})` : ""}
              </span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
