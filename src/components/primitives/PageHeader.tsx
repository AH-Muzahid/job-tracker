import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  overline?: React.ReactNode;
  primaryAction?: React.ReactNode;
  action?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  skeleton?: boolean;
  backHref?: string;
  backLabel?: string;
}

export function PageHeader({
  title,
  description,
  overline,
  primaryAction,
  action,
  secondaryActions,
  skeleton = false,
  backHref,
  backLabel,
  className,
  ...props
}: PageHeaderProps) {
  const activeAction = primaryAction || action;

  if (skeleton) {
    return (
      <div
        className={cn(
          "flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1 pb-1",
          className
        )}
        {...props}
      >
        <div className="space-y-1.5 min-w-0">
          <Skeleton className="h-4 w-20 rounded-[4px]" />
          <Skeleton className="h-8 w-56 rounded-[4px]" />
          <Skeleton className="h-4 w-96 max-w-full rounded-[4px]" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="h-9 w-32 rounded-[4px]" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1 pb-1",
        className
      )}
      {...props}
    >
      <div className="min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-2 group py-0.5 cursor-pointer select-none"
          >
            <ChevronLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>{backLabel || "Back"}</span>
          </Link>
        )}
        {overline && (
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            {overline}
          </div>
        )}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {(activeAction || secondaryActions) && (
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          {secondaryActions}
          {activeAction}
        </div>
      )}
    </div>
  );
}
