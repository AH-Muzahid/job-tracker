"use client";

import { Layers, FileText, Calendar, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardKpisData = {
  opportunities?: {
    count: number;
    delta?: number;
    newThisWeek?: number;
  };
  applications?: {
    count: number;
    delta?: number;
    inProgress?: number;
  };
  interviews?: {
    count: number;
    delta?: number;
    thisWeek?: number;
  };
  offers?: {
    count: number;
    delta?: number;
    label?: string;
  };
};

interface DashboardKpisProps {
  data?: DashboardKpisData;
  isLoading?: boolean;
}

export function DashboardKpis({ data, isLoading }: DashboardKpisProps) {
  const oppCount = data?.opportunities?.count ?? 28;
  const oppDelta = data?.opportunities?.delta ?? 12;
  const oppNew = data?.opportunities?.newThisWeek ?? 8;

  const appCount = data?.applications?.count ?? 12;
  const appDelta = data?.applications?.delta ?? 33;
  const appInProgress = data?.applications?.inProgress ?? 3;

  const intCount = data?.interviews?.count ?? 3;
  const intDelta = data?.interviews?.delta ?? 50;
  const intThisWeek = data?.interviews?.thisWeek ?? 1;

  const offCount = data?.offers?.count ?? 1;
  const offLabel = data?.offers?.label || "Keep going!";

  const cards = [
    {
      id: "opportunities",
      title: "Opportunities",
      value: oppCount,
      delta: `↑ ${oppDelta}%`,
      subtext: `New this week: ${oppNew}`,
      icon: Layers,
      iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
    },
    {
      id: "applications",
      title: "Applications",
      value: appCount,
      delta: `↑ ${appDelta}%`,
      subtext: `${appInProgress} in progress`,
      icon: FileText,
      iconBg: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400",
    },
    {
      id: "interviews",
      title: "Interviews",
      value: intCount,
      delta: intDelta > 0 ? `↑ ${intDelta}%` : "—",
      subtext: `${intThisWeek} this week`,
      icon: Calendar,
      iconBg: "bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400",
    },
    {
      id: "offers",
      title: "Offers",
      value: offCount,
      delta: "—",
      subtext: offLabel,
      icon: Trophy,
      iconBg: "bg-amber-50 text-amber-500 dark:bg-amber-950/50 dark:text-amber-400",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center gap-3.5"
          >
            {/* Left squircle icon container */}
            <div
              className={cn(
                "flex size-11 items-center justify-center rounded-xl shrink-0 transition-transform",
                card.iconBg
              )}
            >
              <Icon className="size-5.5 stroke-[1.75]" />
            </div>

            {/* Right content: 3 lines */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {card.title}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                  {card.value}
                </span>
                {card.delta !== "—" ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 leading-none">
                    {card.delta}
                  </span>
                ) : (
                  <span className="text-xs font-mono text-slate-400 leading-none px-0.5">—</span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 truncate font-normal">
                {card.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
