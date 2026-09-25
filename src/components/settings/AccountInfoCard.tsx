"use client"

import { User, ShieldCheck, ExternalLink } from "lucide-react"
import { useClerk } from "@clerk/nextjs"
import {
  BlueprintCard,
  BlueprintCardHeader,
  BlueprintCardTitle,
  BlueprintCardContent,
  BlueprintCardFooter,
} from "@/components/primitives"
import { StatusBadge } from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"

interface AccountInfoCardProps {
  name?: string | null
  email?: string | null
}

export function AccountInfoCard({ name, email }: AccountInfoCardProps) {
  const { openUserProfile } = useClerk()

  return (
    <BlueprintCard className="flex flex-col justify-between">
      <div>
        <BlueprintCardHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-border bg-muted/40 text-foreground shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">IDENT / 01</span>
              <BlueprintCardTitle className="text-sm font-semibold tracking-tight text-foreground">
                Account Profile
              </BlueprintCardTitle>
            </div>
          </div>

          <StatusBadge status="accepted" customLabel="Active" size="sm" />
        </BlueprintCardHeader>

        <BlueprintCardContent className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between gap-2 py-2 border-b border-border/40">
            <span className="text-muted-foreground shrink-0">Full Name</span>
            <span className="font-medium text-foreground font-sans truncate text-right">
              {name || "Not provided"}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 py-2 border-b border-border/40">
            <span className="text-muted-foreground shrink-0">Email Address</span>
            <span className="font-medium text-foreground font-mono truncate text-right">
              {email || "N/A"}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5 shrink-0">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Auth Provider
            </span>
            <span className="text-foreground text-right truncate">Clerk SSO Verified</span>
          </div>
        </BlueprintCardContent>
      </div>

      <BlueprintCardFooter className="pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => openUserProfile?.()}
          className="w-full rounded-[4px] font-mono text-xs h-8 border-border hover:bg-muted/80 cursor-pointer justify-center gap-1.5"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Manage Clerk Profile</span>
        </Button>
      </BlueprintCardFooter>
    </BlueprintCard>
  )
}
