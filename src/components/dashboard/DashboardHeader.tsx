"use client";

import { useUser } from "@clerk/nextjs";

export function DashboardHeader() {
  const { user } = useUser();

  const firstName = user?.firstName || user?.fullName?.split(" ")[0] || "Tanvir";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1 pb-1">
      <div>
        <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <span>Good morning, {firstName}</span>
          <span className="inline-block select-none text-2xl" role="img" aria-label="waving hand">
            👋
          </span>
        </h1>
        <p className="mt-1 text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 font-normal">
          Make progress today. Small steps lead to big opportunities.
        </p>
      </div>

      <div className="hidden sm:block rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-4 py-2 text-right shadow-2xs">
        <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
          &quot;A better career is a series of intentional steps.&quot;
        </p>
        <span className="text-[10px] sm:text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-0.5 block">
          — CareerTrack
        </span>
      </div>
    </div>
  );
}
