"use client";

import { Layers, FileText, Calendar, Trophy } from "lucide-react";
import { KPIStrip, type KPIItem } from "@/components/primitives/KPIStrip";

export type DashboardKpisData = {
  opportunities?: {
    count: number;
    delta?: number | null;
    newThisWeek?: number;
  };
  applications?: {
    count: number;
    delta?: number | null;
    inProgress?: number;
  };
  interviews?: {
    count: number;
    delta?: number | null;
    thisWeek?: number;
  };
  offers?: {
    count: number;
    delta?: number | null;
    label?: string;
    responseRate?: number;
  };
};

interface DashboardKpisProps {
  data?: DashboardKpisData;
  isLoading?: boolean;
}

export function DashboardKpis({ data, isLoading }: DashboardKpisProps) {
  const oppCount = data?.opportunities?.count ?? 0;
  const oppDelta = data?.opportunities?.delta ?? null;
  const oppNew = data?.opportunities?.newThisWeek ?? 0;

  const appCount = data?.applications?.count ?? 0;
  const appDelta = data?.applications?.delta ?? null;
  const appInProgress = data?.applications?.inProgress ?? 0;

  const intCount = data?.interviews?.count ?? 0;
  const intDelta = data?.interviews?.delta ?? null;
  const intThisWeek = data?.interviews?.thisWeek ?? 0;

  const offCount = data?.offers?.count ?? 0;
  const responseRate = data?.offers?.responseRate;
  const offLabel = data?.offers?.label || (offCount > 0 ? `${offCount} Received` : "Keep going!");

  const formatBadge = (delta?: number | null, fallback?: string) => {
    if (typeof delta === "number" && Math.abs(delta) > 0 && Math.abs(delta) < 100) {
      if (delta > 0) return { text: `↑ ${delta}%`, isPositive: true };
      if (delta < 0) return { text: `↓ ${Math.abs(delta)}%`, isPositive: false };
    }
    if (fallback) {
      return { text: fallback, isPositive: true };
    }
    if (typeof delta === "number" && delta > 0) {
      return { text: "Active", isPositive: true };
    }
    return { text: "—", isPositive: null };
  };

  const items: KPIItem[] = [
    {
      id: "opportunities",
      label: "Opportunities",
      value: oppCount,
      badge: formatBadge(oppDelta, oppNew > 0 ? `+${oppNew} new` : undefined),
      subtext: `New this week: ${oppNew}`,
      icon: Layers,
      iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      id: "applications",
      label: "Applications",
      value: appCount,
      badge: formatBadge(appDelta, appInProgress > 0 ? `${appInProgress} active` : undefined),
      subtext: `${appInProgress} in progress`,
      icon: FileText,
      iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    },
    {
      id: "interviews",
      label: "Interviews",
      value: intCount,
      badge: formatBadge(intDelta, intThisWeek > 0 ? `${intThisWeek} this week` : undefined),
      subtext: `${intThisWeek} this week`,
      icon: Calendar,
      iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    },
    {
      id: "offers",
      label: "Offers",
      value: offCount,
      badge: responseRate && responseRate > 0
        ? { text: `${responseRate}% rate`, isPositive: true }
        : offCount > 0
        ? { text: `${offCount} total`, isPositive: true }
        : { text: "—", isPositive: null },
      subtext: offLabel,
      icon: Trophy,
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
  ];

  return <KPIStrip items={items} isLoading={isLoading} columns={4} variant="cards" />;
}
