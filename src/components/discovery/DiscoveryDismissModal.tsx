"use client"

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
  Briefcase,
} from "lucide-react"
import { DecorIcon } from "@/components/decor-icon"
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
  if (!job) return null

  const handleSelectReason = (reasonKey: string) => {
    onDismiss(job, reasonKey)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-5 !overflow-hidden border-border bg-card rounded-none shadow-2xl">
        <DecorIcon position="top-right" />
        <DecorIcon position="bottom-left" />

        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <EyeOff className="size-4 text-muted-foreground" />
            <span>Dismiss Opportunity</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Help CareerTrack calibrate your feed. Select why this role isn&apos;t a good fit:
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

        {/* 1-Click Reason Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2">
          {DISMISS_REASONS.map((reason) => {
            const Icon = reason.icon
            return (
              <button
                key={reason.key}
                type="button"
                onClick={() => handleSelectReason(reason.key)}
                className="group p-3 border border-border/70 hover:border-primary/60 bg-background/50 hover:bg-muted/40 transition-all rounded-none text-left cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="size-6 rounded-none bg-muted/60 border border-border/60 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/40 transition-colors">
                    <Icon className="size-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    {reason.label}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                  {reason.description}
                </p>
              </button>
            )
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <span className="text-[10px] text-muted-foreground">
            1-click hides this posting and refines future recommendations.
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-7 text-xs rounded-none cursor-pointer"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
