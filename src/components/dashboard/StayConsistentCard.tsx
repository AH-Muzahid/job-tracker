"use client";

import { Target } from "lucide-react";
import { cn } from "@/lib/utils";

export type DayActivity = {
  day: string;
  active: boolean;
};

interface StayConsistentCardProps {
  activity?: DayActivity[];
  activeDaysCount?: number;
  isLoading?: boolean;
}

const referenceActivity: DayActivity[] = [
  { day: "Mon", active: true },
  { day: "Tue", active: true },
  { day: "Wed", active: true },
  { day: "Thu", active: true },
  { day: "Fri", active: true },
  { day: "Sat", active: false },
  { day: "Sun", active: false },
];

export function StayConsistentCard({
  activity,
  activeDaysCount,
  isLoading,
}: StayConsistentCardProps) {
  const days = activity && activity.length === 7 ? activity : referenceActivity;
  const count = activeDaysCount ?? days.filter((d) => d.active).length;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs animate-pulse">
        <div className="h-5 w-32 bg-slate-100 dark:bg-slate-800 rounded mb-3" />
        <div className="h-10 bg-slate-50 dark:bg-slate-800/50 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
      {/* Header with Target icon */}
      <div className="flex items-center gap-2.5">
        <div className="flex size-7 items-center justify-center shrink-0">
          <Target className="size-5 text-rose-500 stroke-[2]" />
        </div>
        <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">
          Stay consistent
        </h2>
      </div>

      <div className="mt-2 text-xs leading-relaxed">
        <p className="text-slate-600 dark:text-slate-300 font-normal">
          You&apos;ve been active for <span className="font-semibold text-slate-900 dark:text-white">{count} days</span> this week.
        </p>
        <p className="text-slate-400 dark:text-slate-500 mt-0.5 font-normal">
          Keep the momentum going!
        </p>
      </div>

      {/* Weekday streak indicators */}
      <div className="mt-4 pt-1">
        <div className="flex items-center justify-between px-1">
          {days.map((item) => (
            <div key={item.day} className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "size-3.5 rounded-full transition-all",
                  item.active
                    ? "bg-emerald-600"
                    : "bg-slate-200 dark:bg-slate-700"
                )}
              />
              <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                {item.day}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
