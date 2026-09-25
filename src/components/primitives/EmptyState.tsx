import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: React.ComponentType<{ className?: string }>;
  };
  dashed?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  dashed = true,
  className,
  ...props
}: EmptyStateProps) {
  const ActionIcon = action?.icon;

  return (
    <div
      className={cn(
        "rounded-[6px] p-8 sm:p-12 text-center bg-card text-card-foreground",
        dashed ? "border border-dashed border-border" : "border border-border",
        className
      )}
      {...props}
    >
      <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-sm bg-muted text-muted-foreground">
        <Icon className="size-5 stroke-[1.75]" />
      </div>
      <h3 className="text-sm sm:text-base font-semibold text-foreground tracking-tight">
        {title}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
        {description}
      </p>

      {action && (
        <div className="mt-4 flex justify-center">
          {action.href ? (
            <Button asChild size="sm" className="rounded-sm text-xs cursor-pointer shadow-none">
              <Link href={action.href}>
                {ActionIcon && <ActionIcon className="size-3.5 mr-1.5" />}
                {action.label}
              </Link>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={action.onClick}
              className="rounded-sm text-xs cursor-pointer shadow-none"
            >
              {ActionIcon && <ActionIcon className="size-3.5 mr-1.5" />}
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
