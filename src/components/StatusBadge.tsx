import * as React from "react";
import { cn } from "@/lib/utils";

export type JobStatusType =
  | "staged"
  | "saved"
  | "applied"
  | "assessment"
  | "interview"
  | "interviewing"
  | "offer"
  | "accepted"
  | "rejected"
  | "archived"
  | string;

interface StatusConfig {
  label: string;
  pillClasses: string;
  dotColor: string;
}

const STATUS_CONFIGS: Record<string, StatusConfig> = {
  staged: {
    label: "Staged",
    pillClasses: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
    dotColor: "bg-purple-500",
  },
  saved: {
    label: "Saved",
    pillClasses: "bg-muted text-muted-foreground border-border",
    dotColor: "bg-muted-foreground",
  },
  applied: {
    label: "Applied",
    pillClasses: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    dotColor: "bg-blue-500",
  },
  assessment: {
    label: "In Review",
    pillClasses: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    dotColor: "bg-amber-500",
  },
  interview: {
    label: "Interviewing",
    pillClasses: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
    dotColor: "bg-indigo-500",
  },
  interviewing: {
    label: "Interviewing",
    pillClasses: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
    dotColor: "bg-indigo-500",
  },
  offer: {
    label: "Offer",
    pillClasses: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    dotColor: "bg-emerald-500",
  },
  accepted: {
    label: "Accepted",
    pillClasses: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    dotColor: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    pillClasses: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    dotColor: "bg-rose-500",
  },
  archived: {
    label: "Archived",
    pillClasses: "bg-muted/60 text-muted-foreground border-border/60",
    dotColor: "bg-muted-foreground/60",
  },
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: JobStatusType;
  customLabel?: string;
  variant?: "pill" | "dot" | "clean";
  size?: "sm" | "default";
}

export function StatusBadge({
  status,
  customLabel,
  variant = "pill",
  size = "default",
  className,
  ...props
}: StatusBadgeProps) {
  const normalized = (status || "").toLowerCase().trim();
  
  // Fuzzy match if status contains keywords
  let matchedKey = "saved";
  if (normalized.includes("stage")) matchedKey = "staged";
  else if (normalized.includes("sent") || normalized.includes("applied")) matchedKey = "applied";
  else if (normalized.includes("review") || normalized.includes("assessment")) matchedKey = "assessment";
  else if (normalized.includes("interview")) matchedKey = "interviewing";
  else if (normalized.includes("accept")) matchedKey = "accepted";
  else if (normalized.includes("offer")) matchedKey = "offer";
  else if (normalized.includes("reject")) matchedKey = "rejected";
  else if (normalized.includes("archive")) matchedKey = "archived";
  else if (normalized.includes("save")) matchedKey = "saved";

  const config = STATUS_CONFIGS[matchedKey] || {
    label: status,
    pillClasses: "bg-muted text-muted-foreground border-border",
    dotColor: "bg-muted-foreground",
  };

  const displayLabel = customLabel || (status.length > 0 && status !== matchedKey ? status : config.label);

  if (variant === "clean") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-medium whitespace-nowrap",
          size === "sm" ? "text-[11px]" : "text-xs",
          config.pillClasses.split(" ").filter((c) => c.startsWith("text-")).join(" "),
          className
        )}
        {...props}
      >
        <span className={cn("size-1.5 rounded-full shrink-0", config.dotColor)} />
        <span>{displayLabel}</span>
      </span>
    );
  }

  if (variant === "dot") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-medium whitespace-nowrap text-foreground",
          size === "sm" ? "text-[11px]" : "text-xs",
          className
        )}
        {...props}
      >
        <span className={cn("size-1.5 rounded-full shrink-0", config.dotColor)} />
        <span>{displayLabel}</span>
      </span>
    );
  }

  // Default: Stripe-standard solid pill
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border font-medium whitespace-nowrap leading-none transition-colors",
        size === "sm" ? "h-5 px-1.5 text-[10px]" : "h-5.5 px-2 text-[11px]",
        config.pillClasses,
        className
      )}
      {...props}
    >
      <span className={cn("size-1 rounded-full shrink-0", config.dotColor)} />
      <span>{displayLabel}</span>
    </span>
  );
}

export default StatusBadge;
