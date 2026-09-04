"use client"

import { User, ShieldCheck } from "lucide-react"
import { DecorIcon } from "@/components/decor-icon"

interface AccountInfoCardProps {
  name?: string | null
  email?: string | null
}

export function AccountInfoCard({ name, email }: AccountInfoCardProps) {
  return (
    <div className="relative rounded-none border border-border bg-card/60 backdrop-blur-xl p-4 sm:p-6 transition-colors">
      <DecorIcon position="top-right" />
      <DecorIcon position="bottom-left" />

      <div className="flex items-center justify-between pb-4 border-b border-border/70">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center border border-border bg-muted/40 text-foreground">
            <User className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">IDENT / 01</span>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Account Profile</h3>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] uppercase">
          <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
          Active
        </span>
      </div>

      <div className="mt-4 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between gap-2 py-2 border-b border-border/40">
          <span className="text-muted-foreground shrink-0">Full Name</span>
          <span className="font-medium text-foreground font-sans truncate text-right">{name || "Not provided"}</span>
        </div>
        <div className="flex items-center justify-between gap-2 py-2 border-b border-border/40">
          <span className="text-muted-foreground shrink-0">Email Address</span>
          <span className="font-medium text-foreground font-mono truncate text-right">{email || "N/A"}</span>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5 shrink-0">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Auth Provider
          </span>
          <span className="text-foreground text-right truncate">Clerk SSO Verified</span>
        </div>
      </div>
    </div>
  )
}
