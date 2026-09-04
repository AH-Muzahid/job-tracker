"use client"

import { useState, useEffect } from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { DecorIcon } from "@/components/decor-icon"
import { cn } from "@/lib/utils"

export function PreferencesCard() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"))
  }, [])

  function setTheme(isDark: boolean) {
    setDark(isDark)
    document.documentElement.classList.toggle("dark", isDark)
  }

  return (
    <div className="relative rounded-none border border-border bg-card/60 backdrop-blur-xl p-4 sm:p-6 transition-colors">
      <DecorIcon position="top-right" />
      <DecorIcon position="bottom-left" />

      <div className="flex items-center justify-between pb-4 border-b border-border/70">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center border border-border bg-muted/40 text-foreground">
            <Monitor className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">UI / 02</span>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Appearance & Theme</h3>
          </div>
        </div>

        <span className="font-mono text-[10px] uppercase text-muted-foreground border border-border px-1.5 py-0.5">
          {dark ? "Dark Active" : "Light Active"}
        </span>
      </div>

      <div className="mt-4">
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
          Select interface contrast mode. The linear blueprint architecture adapts instantly to both themes.
        </p>

        <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
          <button
            type="button"
            onClick={() => setTheme(false)}
            className={cn(
              "flex items-center justify-center gap-2 p-2.5 sm:p-3 min-h-[44px] border cursor-pointer rounded-none transition-all text-center",
              !dark
                ? "border-foreground bg-muted/80 text-foreground font-semibold shadow-xs"
                : "border-border bg-background/50 text-muted-foreground hover:text-foreground hover:border-border/80"
            )}
          >
            <Sun className="h-4 w-4 shrink-0" />
            <span className="truncate">Light</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme(true)}
            className={cn(
              "flex items-center justify-center gap-2 p-2.5 sm:p-3 min-h-[44px] border cursor-pointer rounded-none transition-all text-center",
              dark
                ? "border-foreground bg-muted/80 text-foreground font-semibold shadow-xs"
                : "border-border bg-background/50 text-muted-foreground hover:text-foreground hover:border-border/80"
            )}
          >
            <Moon className="h-4 w-4 shrink-0" />
            <span className="truncate">Dark</span>
          </button>
        </div>
      </div>
    </div>
  )
}
