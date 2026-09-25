import * as React from "react";
import { cn } from "@/lib/utils";
import { DecorIcon } from "@/components/decor-icon";
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta";

export interface KPIItem {
  id: string;
  label: string;
  value: string | number;
  delta?: number | null;
  deltaLabel?: string;
  badge?: {
    text: string;
    isPositive?: boolean | null;
  } | null;
  subtext?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconBg?: string;
}

export interface KPIStripProps {
  items: KPIItem[];
  isLoading?: boolean;
  columns?: 2 | 3 | 4;
  variant?: "grid" | "cards";
  className?: string;
}

export function KPIStrip({
  items,
  isLoading = false,
  columns = 4,
  variant = "grid",
  className,
}: KPIStripProps) {
  const colClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
  }[columns];

  if (isLoading) {
    if (variant === "cards") {
      return (
        <div className={cn("grid gap-3.5", colClass, className)}>
          {Array.from({ length: columns }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-[6px] border border-border bg-card p-4 animate-pulse"
            />
          ))}
        </div>
      );
    }

    return (
      <div className={cn("relative border border-border bg-border w-full overflow-hidden", className)}>
        <div className={cn("grid gap-px bg-border", colClass)}>
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="h-24 bg-background p-4 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className={cn("grid gap-3.5", colClass, className)}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="rounded-[6px] border border-border bg-card p-3.5 sm:p-4 hover:border-foreground/20 transition-colors flex items-center gap-3.5"
            >
              {Icon && (
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-sm shrink-0",
                    item.iconBg || "bg-muted text-foreground"
                  )}
                >
                  <Icon className="size-5 stroke-[1.75]" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">
                  {item.label}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-2xl font-bold tracking-tight text-foreground leading-none tabular-nums">
                    {item.value}
                  </span>
                  {item.badge && item.badge.text !== "—" ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-[11px] font-medium leading-none tabular-nums",
                        item.badge.isPositive === false
                          ? "bg-destructive/10 text-destructive"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {item.badge.text}
                    </span>
                  ) : item.delta !== undefined && item.delta !== null ? (
                    <Delta value={item.delta}>
                      <DeltaIcon />
                      <DeltaValue />
                    </Delta>
                  ) : null}
                </div>
                {item.subtext && (
                  <p className="mt-1 text-[11px] text-muted-foreground truncate font-normal">
                    {item.subtext}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Default: Architectural 1px hairline grid
  return (
    <div
      className={cn(
        "relative border border-border bg-border w-full overflow-hidden",
        className
      )}
    >
      <DecorIcon className="hidden md:block pointer-events-none" position="top-left" />
      <div className={cn("grid gap-px bg-border", colClass)}>
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col justify-between min-w-0 bg-background"
          >
            <div className="p-3 sm:px-5 sm:pt-4 sm:pb-4 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                {item.label}
              </p>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-0.5 sm:mt-2 tabular-nums">
                {item.value}
              </p>
            </div>
            {(item.subtext || item.delta !== undefined || item.badge) && (
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs px-3 sm:px-5 py-1.5 sm:py-2.5 border-t border-border bg-background font-mono min-w-0 overflow-hidden text-muted-foreground">
                {item.delta !== undefined && item.delta !== null ? (
                  <Delta value={item.delta}>
                    <DeltaIcon />
                    <DeltaValue />
                  </Delta>
                ) : item.badge ? (
                  <span
                    className={cn(
                      "font-sans font-medium px-1.5 py-0.5 rounded-sm text-[11px]",
                      item.badge.isPositive === false
                        ? "bg-destructive/10 text-destructive"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {item.badge.text}
                  </span>
                ) : null}
                {item.subtext && (
                  <span className="truncate font-sans">{item.subtext}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
