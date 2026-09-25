"use client"

import { useEffect } from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import {
  BlueprintCard,
  BlueprintCardHeader,
  BlueprintCardTitle,
  BlueprintCardContent,
} from "@/components/primitives"
import { StatusBadge } from "@/components/StatusBadge"
import { useUI } from "@/stores/store"
import { cn } from "@/lib/utils"

export function PreferencesCard() {
  const dark = useUI((s) => s.dark)
  const setTheme = useUI((s) => s.setTheme)
  const initTheme = useUI((s) => s.initTheme)

  useEffect(() => {
    initTheme()
  }, [initTheme])

  return (
    <BlueprintCard className="flex flex-col justify-between">
      <div>
        <BlueprintCardHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-border bg-muted/40 text-foreground shrink-0">
              <Monitor className="h-4 w-4 text-primary" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">UI / 02</span>
              <BlueprintCardTitle className="text-sm font-semibold tracking-tight text-foreground">
                Appearance & Theme
              </BlueprintCardTitle>
            </div>
          </div>

          <StatusBadge
            status={dark ? "interviewing" : "staged"}
            customLabel={dark ? "Dark Active" : "Light Active"}
            size="sm"
          />
        </BlueprintCardHeader>

        <BlueprintCardContent className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Select interface contrast mode. The Stripe-standard architecture adapts instantly with full persistence.
          </p>

          <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
            <button
              type="button"
              onClick={() => setTheme(false)}
              className={cn(
                "flex items-center justify-center gap-2 p-2.5 sm:p-3 min-h-[44px] border cursor-pointer rounded-[4px] transition-all text-center",
                !dark
                  ? "border-foreground bg-muted text-foreground font-semibold shadow-xs ring-1 ring-border"
                  : "border-border bg-background/50 text-muted-foreground hover:text-foreground hover:border-border/80"
              )}
            >
              <Sun className="h-4 w-4 shrink-0 text-amber-500" />
              <span className="truncate">Light Mode</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme(true)}
              className={cn(
                "flex items-center justify-center gap-2 p-2.5 sm:p-3 min-h-[44px] border cursor-pointer rounded-[4px] transition-all text-center",
                dark
                  ? "border-foreground bg-muted text-foreground font-semibold shadow-xs ring-1 ring-border"
                  : "border-border bg-background/50 text-muted-foreground hover:text-foreground hover:border-border/80"
              )}
            >
              <Moon className="h-4 w-4 shrink-0 text-indigo-400" />
              <span className="truncate">Dark Mode</span>
            </button>
          </div>
        </BlueprintCardContent>
      </div>

      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
        <p className="text-[11px] font-mono text-muted-foreground border-t border-border/40 pt-2.5">
          Synced across sessions via <code className="bg-muted px-1 py-0.5 rounded-[2px] text-foreground">localStorage</code>.
        </p>
      </div>
    </BlueprintCard>
  )
}
