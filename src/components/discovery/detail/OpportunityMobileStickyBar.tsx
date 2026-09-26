"use client"

import React from "react"
import Link from "next/link"
import { ArrowRight, RefreshCw, Check } from "lucide-react"

interface OpportunityMobileStickyBarProps {
  isStaged: boolean
  isPackaging: boolean
  stagedApplicationId?: string | null
  onPackage: () => void
}

export function OpportunityMobileStickyBar({
  isStaged,
  isPackaging,
  stagedApplicationId,
  onPackage,
}: OpportunityMobileStickyBarProps) {
  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 p-3 bg-background/95 backdrop-blur-md border-t border-border shadow-lg pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {isStaged ? (
        <Link
          href={stagedApplicationId ? `/applications/${stagedApplicationId}` : "/applications?status=Staged"}
          className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-[6px] text-sm font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-colors shadow-xs"
        >
          <Check className="size-4 stroke-[2.5]" />
          <span>Staged in Workbench</span>
          <ArrowRight className="size-4" />
        </Link>
      ) : (
        <button
          type="button"
          onClick={onPackage}
          disabled={isPackaging}
          className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-[6px] text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
        >
          {isPackaging ? (
            <>
              <RefreshCw className="size-4 animate-spin" />
              <span>Packaging Application...</span>
            </>
          ) : (
            <>
              <span>Package & Stage</span>
              <ArrowRight className="size-4 stroke-[2]" />
            </>
          )}
        </button>
      )}
    </div>
  )
}
