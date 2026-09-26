"use client";

import { Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { BlueprintCard } from "@/components/primitives/BlueprintCard";

export type DayActivity = {
  day: string;
  active: boolean;
};

interface StayConsistentCardProps {
  activity?: DayActivity[];
  activeDaysCount?: number;
  isLoading?: boolean;
}

const defaultDays: DayActivity[] = [
  { day: "Mon", active: false },
  { day: "Tue", active: false },
  { day: "Wed", active: false },
  { day: "Thu", active: false },
  { day: "Fri", active: false },
  { day: "Sat", active: false },
  { day: "Sun", active: false },
];

export function StayConsistentCard({
  activity,
  activeDaysCount,
  isLoading,
}: StayConsistentCardProps) {
  const days = activity && activity.length > 0 ? activity : defaultDays;
  const count = activeDaysCount ?? days.filter((d) => d.active).length;

  if (isLoading) {
    return (
      <BlueprintCard className="p-4 sm:p-5 animate-pulse">
        <div className="h-5 w-32 bg-muted rounded-sm mb-3" />
        <div className="h-10 bg-muted/50 rounded-sm" />
      </BlueprintCard>
    );
  }

  return (
    <BlueprintCard className="p-4 sm:p-5">
      {/* Header with Target icon */}
      <div className="flex items-center gap-2">
        <div className="flex size-6 items-center justify-center shrink-0">
          <Target className="size-4 text-emerald-600 dark:text-emerald-400 stroke-[2]" />
        </div>
        <h2 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">
          Stay consistent
        </h2>
      </div>

      <div className="mt-2 text-xs leading-relaxed">
        <p className="text-muted-foreground font-normal">
          Active for{" "}
          <span className="font-semibold text-foreground tabular-nums">{count} days</span> this
          week.
        </p>
        <p className="text-muted-foreground/75 mt-0.5 font-normal">
          Consistent daily action leads to offers.
        </p>
      </div>

      {/* Weekday streak indicators */}
      <div className="mt-3.5 pt-1">
        <div className="flex items-center justify-between px-1">
          {days.map((item) => (
            <div key={item.day} className="flex flex-col items-center gap-1.5">
              <div
                role="img"
                aria-label={`${item.day}: ${item.active ? "Active" : "Inactive"}`}
                className={cn(
                  "size-3 rounded-full transition-colors",
                  item.active
                    ? "bg-emerald-600 dark:bg-emerald-500"
                    : "bg-muted border border-border"
                )}
              />
              <span className="text-[10px] font-normal text-muted-foreground">
                {item.day}
              </span>
            </div>
          ))}
        </div>
      </div>
    </BlueprintCard>
  );
}
