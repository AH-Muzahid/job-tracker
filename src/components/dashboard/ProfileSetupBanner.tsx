"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { BlueprintCard } from "@/components/primitives/BlueprintCard";

export type ProfileCompleteness = {
  score: number;
  isComplete: boolean;
  nextStepText: string;
  completedPillars?: number;
  totalPillars?: number;
  hasResume?: boolean;
  hasRoles?: boolean;
  hasSkills?: boolean;
  hasPreferences?: boolean;
};

interface ProfileSetupBannerProps {
  completeness?: ProfileCompleteness;
  isLoading?: boolean;
}

const STORAGE_KEY = "ct_profile_setup_banner_dismissed_session";

export function ProfileSetupBanner({ completeness, isLoading }: ProfileSetupBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const dismissed = sessionStorage.getItem(STORAGE_KEY);
      if (dismissed === "true") {
        setIsDismissed(true);
      }
    }
  }, []);

  // Strict Rule: Never show if loading, if dismissed for current session, or if setup is already 100% complete
  if (!mounted || isLoading || !completeness || completeness.isComplete || completeness.score >= 100 || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_KEY, "true");
    }
  };

  const score = Math.max(0, Math.min(100, completeness.score));
  const completedCount = completeness.completedPillars ?? Math.round(score / 25);

  return (
    <BlueprintCard
      role="region"
      aria-label="Profile setup progress"
      className="p-3 sm:py-3 sm:px-4 border-border bg-card shadow-none transition-all"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        {/* Left: Score Badge, Title & Next Action */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Circular/Square Status Badge */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border border-border bg-muted/40 text-foreground font-mono text-[11px] font-semibold tabular-nums">
            {score}%
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-foreground tracking-tight">
                Profile Setup
              </span>
              <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                ({completedCount}/4 steps)
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              <span className="text-foreground font-medium">Next:</span>{" "}
              {completeness.nextStepText || "Upload master resume & define target roles"}
            </p>
          </div>
        </div>

        {/* Right: Hairline Progress Bar + Action CTA + Dismiss */}
        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0 w-full sm:w-auto justify-between sm:justify-end">
          {/* 4px Hairline Progress Bar */}
          <div
            className="w-20 sm:w-28 h-1.5 rounded-full bg-muted overflow-hidden shrink-0"
            role="progressbar"
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Profile setup progress"
          >
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${score}%` }}
            />
          </div>

          {/* Action CTA Button */}
          <Link
            href="/profile-setup"
            className="inline-flex items-center gap-1.5 rounded-[4px] bg-[#533AFD] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#533AFD]/90 transition-colors shrink-0 cursor-pointer"
          >
            <span>Complete Setup</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          {/* Dismiss Button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss setup banner for this session"
            className="p-1 rounded-[4px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </BlueprintCard>
  );
}
