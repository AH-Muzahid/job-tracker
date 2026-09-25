"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bot,
  Clock,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDailyBriefing } from "@/lib/api";
import { BlueprintCard } from "@/components/primitives/BlueprintCard";

export function DailyBriefingCard() {
  const { data: briefing, isLoading: loading, error, refresh } = useDailyBriefing();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch (err) {
      console.error("Failed to refresh daily briefing:", err);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <BlueprintCard className="p-3.5 sm:p-4 space-y-2.5">
        <div className="flex items-center justify-between pb-2.5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Skeleton className="size-6 rounded-sm bg-muted" />
            <Skeleton className="h-4 w-40 rounded-sm bg-muted" />
            <Skeleton className="h-4 w-16 rounded-sm bg-muted" />
          </div>
          <Skeleton className="h-3.5 w-20 rounded-sm bg-muted" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pt-1">
          <div className="space-y-2">
            <div className="flex justify-between items-center pb-0.5">
              <Skeleton className="h-3 w-28 rounded-sm bg-muted" />
              <Skeleton className="h-2.5 w-16 rounded-sm bg-muted" />
            </div>
            <Skeleton className="h-10 w-full rounded-sm bg-muted/60" />
            <Skeleton className="h-10 w-full rounded-sm bg-muted/60" />
            <Skeleton className="h-10 w-full rounded-sm bg-muted/60" />
          </div>
          <div className="space-y-2 p-3 rounded-[6px] border border-border/60 bg-muted/20">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3.5 w-24 rounded-sm bg-muted" />
              <Skeleton className="h-3 w-16 rounded-sm bg-muted" />
            </div>
            <Skeleton className="h-4 w-48 rounded-sm bg-muted" />
            <Skeleton className="h-8 w-full rounded-sm bg-muted/60" />
            <Skeleton className="h-7 w-full rounded-sm bg-muted/60" />
          </div>
        </div>
      </BlueprintCard>
    );
  }

  if (error && !briefing) {
    return (
      <BlueprintCard className="p-4 sm:p-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-muted-foreground text-sm">
          <AlertCircle className="size-4 text-amber-500" />
          <span>Daily briefing temporarily unavailable</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => handleRefresh()} className="h-8 text-xs rounded-sm">
          <RefreshCw className="size-3.5 mr-1.5" /> Retry
        </Button>
      </BlueprintCard>
    );
  }

  if (!briefing) return null;

  const summaryLines = briefing.executiveSummary || [];
  const priorityActions = briefing.priorityActions || [];
  const displayPriorities = priorityActions.slice(0, 3);

  let insightHeadline = "Your interview pipeline is slowing down.";
  let insightBody =
    "You've applied to many roles, but haven't received new interviews in the last 72 hours. Focus on follow-ups and targeted applications to improve conversion.";

  if (summaryLines.length > 0) {
    const firstLine = summaryLines[0];
    const colonIdx = firstLine.indexOf(":");
    const bodyAfterColon = colonIdx >= 0 ? firstLine.slice(colonIdx + 1).trim() : "";
    if (colonIdx >= 12 && colonIdx < 60 && bodyAfterColon.length >= 20) {
      insightHeadline = firstLine.substring(0, colonIdx).trim() + ".";
      insightBody = bodyAfterColon;
    } else if (firstLine.startsWith("You have ") && firstLine.includes(" active application")) {
      insightHeadline = "Active Pipeline Velocity.";
      insightBody = firstLine;
    } else {
      insightHeadline = firstLine;
      insightBody =
        summaryLines[1] ||
        "Focus on follow-ups and targeted applications to improve conversion.";
    }
  }

  let projectionTip = briefing.projectionTip;
  if (!projectionTip) {
    const followUps = briefing.metrics?.followUpsDueCount ?? 0;
    const totalApps = Math.max(1, briefing.metrics?.activeApplicationsCount ?? 1);
    if (followUps > 0) {
      const boost = Math.min(45, Math.max(12, Math.round((followUps / totalApps) * 28 + 6)));
      projectionTip = `Prioritizing follow-ups could improve your interview rate by ~${boost}%.`;
    } else if ((briefing.metrics?.stagedCount ?? 0) > 0) {
      const staged = briefing.metrics?.stagedCount ?? 1;
      const boost = Math.min(40, Math.max(15, staged * 10 + 15));
      projectionTip = `Submitting your ${staged} staged package${staged > 1 ? "s" : ""} within 24h increases recruiter response by ~${boost}%.`;
    } else if ((briefing.metrics?.upcomingInterviewsCount ?? 0) > 0) {
      projectionTip = `Running role-specific mock practice improves interview pass rates by ~35%.`;
    } else {
      projectionTip = `Targeting 90%+ fit score opportunities yields a 3x higher callback rate.`;
    }
  }

  const stagedCount = briefing.metrics?.stagedCount ?? 0;
  const followUpCount = briefing.metrics?.followUpsDueCount ?? 0;
  const activeCount = briefing.metrics?.activeApplicationsCount ?? 0;

  return (
    <BlueprintCard className="p-3.5 sm:p-4">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-2.5 border-b border-border/50 gap-3">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="flex size-6 items-center justify-center rounded-sm bg-primary/10 text-primary shrink-0">
            <Bot className="size-3.5 stroke-[2]" />
          </div>
          <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
            <h2 className="text-xs sm:text-sm font-semibold text-foreground tracking-tight shrink-0">
              Daily Strategic Briefing
            </h2>
            <span className="inline-flex items-center rounded-xs bg-muted px-1.5 py-0.5 text-[10px] font-mono uppercase text-muted-foreground font-semibold tracking-wider border border-border shrink-0">
              AUTONOMOUS
            </span>
            <span className="hidden md:inline text-muted-foreground/40">•</span>
            <p className="text-xs text-muted-foreground truncate hidden md:block">
              Here&apos;s what I found and what you should focus on today.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-muted-foreground tabular-nums">
            <Clock className="size-3" />
            <span>
              Last updated{" "}
              {briefing.generatedAt
                ? new Date(briefing.generatedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Live"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            className="size-6 text-muted-foreground hover:text-foreground rounded-sm cursor-pointer"
            title="Refresh briefing"
          >
            <RefreshCw
              className={cn("size-3", refreshing && "animate-spin text-primary")}
            />
          </Button>
        </div>
      </div>

      {/* Main 2-Column Split: 50/50 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 lg:gap-4 pt-3 items-stretch">
        {/* Left Column: Top Priorities */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between pb-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Top Priorities for Today
              </h3>
              <span className="text-[11px] font-mono text-muted-foreground/75 tabular-nums">
                ({displayPriorities.length} recommended)
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {displayPriorities.length === 0 && (
              <div className="rounded-[4px] border border-dashed border-border bg-muted/20 px-3 py-4 text-center">
                <p className="text-xs font-medium text-foreground">
                  No urgent priorities right now.
                </p>
                <Link
                  href="/discovery"
                  className="mt-1.5 inline-flex text-xs font-medium text-primary hover:underline"
                >
                  Explore Discovery
                </Link>
              </div>
            )}
            {displayPriorities.map((item, idx) => {
              const urgencyStyles: Record<string, string> = {
                urgent:
                  "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
                high:
                  "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
                medium:
                  "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
                low:
                  "bg-muted text-muted-foreground border-border",
              };

              const urgencyClass = urgencyStyles[item.urgency] || urgencyStyles.medium;
              const urgencyLabel =
                item.urgency === "urgent" || item.urgency === "high"
                  ? "High"
                  : item.urgency === "medium"
                  ? "Medium"
                  : "Low";

              let actionTitle = item.title;
              if (
                item.description &&
                (item.description.startsWith("Submit the staged") ||
                  item.description.startsWith("Follow up with") ||
                  item.description.startsWith("Source "))
              ) {
                actionTitle = item.description;
              } else if (
                item.title &&
                (item.title.startsWith("Submit the staged") ||
                  item.title.startsWith("Follow up with") ||
                  item.title.startsWith("Source "))
              ) {
                actionTitle = item.title;
              }

              let btnLabel = "Review";
              let fullActionLabel = `Review ${stagedCount} Staged Application`;

              if (item.type === "SEND_FOLLOWUP") {
                btnLabel = "Follow up";
                fullActionLabel = `Send ${followUpCount} Follow-ups`;
              } else if (item.type === "DISCOVER_JOBS") {
                btnLabel = "Source";
                fullActionLabel = "Source Roles";
              }

              const isPrimary = idx === 0;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "group flex items-center justify-between gap-2.5 py-2 px-2.5 sm:px-3 rounded-[4px] border transition-colors",
                    isPrimary
                      ? "bg-primary/5 border-primary/20 hover:border-primary/40"
                      : "bg-card border-border hover:bg-muted/40 hover:border-border/80"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className={cn(
                        "size-5 rounded-sm flex items-center justify-center font-bold text-[10px] shrink-0 tabular-nums",
                        isPrimary
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground border border-border"
                      )}
                    >
                      {idx + 1}
                    </span>
                    <span
                      className={cn(
                        "text-xs truncate",
                        isPrimary
                          ? "font-semibold text-foreground"
                          : "font-medium text-foreground"
                      )}
                      title={actionTitle}
                    >
                      {actionTitle}
                    </span>
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded-xs text-[9px] font-semibold border shrink-0",
                        urgencyClass
                      )}
                    >
                      {urgencyLabel}
                    </span>
                  </div>

                  <div className="shrink-0">
                    <Link href={item.href} title={fullActionLabel} aria-label={fullActionLabel}>
                      <Button
                        size="sm"
                        className={cn(
                          "h-7 px-2.5 rounded-sm text-xs cursor-pointer transition-colors inline-flex items-center gap-1 shadow-none",
                          isPrimary
                            ? "bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                            : "bg-background hover:bg-muted text-foreground font-normal border border-border"
                        )}
                      >
                        <span>{btnLabel}</span>
                        <ChevronRight className="size-2.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: AI Pipeline Intelligence */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between pb-0.5">
            <div className="flex items-center gap-1.5">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
              </span>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Executive Synthesis
              </h3>
            </div>
            <span className="text-[10px] font-mono font-medium bg-muted text-foreground px-2 py-0.5 rounded-sm border border-border tabular-nums">
              {activeCount} In Flight
            </span>
          </div>

          <div
            aria-label="AI Insight"
            className="flex-1 flex flex-col justify-between gap-2.5 p-3 rounded-[6px] border border-border bg-card"
          >
            <div>
              <h4 className="font-semibold text-xs sm:text-sm text-foreground leading-snug tracking-tight">
                {insightHeadline}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                {insightBody}
              </p>
            </div>

            {/* Projection Callout Banner - Solid, No Gradients */}
            <div className="rounded-[4px] bg-emerald-500/10 border border-emerald-500/20 p-2 sm:p-2.5 flex items-start gap-2.5">
              <div className="size-5 rounded-xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                <TrendingUp className="size-3 stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                  Projected Impact
                </span>
                <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200 leading-snug mt-0.5">
                  {projectionTip}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BlueprintCard>
  );
}
