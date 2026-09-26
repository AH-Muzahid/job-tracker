"use client";

import { useUser } from "@clerk/nextjs";

interface DashboardHeaderProps {
  onAnalyzeJD?: () => void;
}

export function DashboardHeader({ onAnalyzeJD }: DashboardHeaderProps) {
  const { user } = useUser();

  const firstName = user?.firstName || user?.fullName?.split(" ")[0] || "there";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="pt-1 pb-1">
      <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
        Executive Cockpit
      </div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground min-w-0">
          {greeting}, {firstName}
        </h1>

        {onAnalyzeJD && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onAnalyzeJD}
              className="h-8 px-3 rounded-sm border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-none"
            >
              <span>+ Quick Intake</span>
            </button>
          </div>
        )}
      </div>
      <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-normal leading-relaxed">
        Autonomous career pipeline briefing and high-conviction actions for today.
      </p>
    </div>
  );
}
