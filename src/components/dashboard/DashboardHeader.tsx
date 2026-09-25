"use client";

import { useUser } from "@clerk/nextjs";

export function DashboardHeader() {
  const { user } = useUser();

  const firstName = user?.firstName || user?.fullName?.split(" ")[0] || "there";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1 pb-1">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <span>{greeting}, {firstName}</span>
          <span className="inline-block select-none text-2xl" role="img" aria-label="waving hand">
            👋
          </span>
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-normal">
          Make progress today. Small intentional steps lead to high-conviction offers.
        </p>
      </div>

      <div className="hidden sm:block rounded-[6px] border border-border bg-card px-4 py-2.5 text-right">
        <p className="text-xs text-foreground font-normal leading-relaxed">
          &quot;A better career is a series of intentional steps.&quot;
        </p>
        <span className="text-[11px] font-normal text-muted-foreground mt-0.5 block">
          — CareerTrack
        </span>
      </div>
    </div>
  );
}
