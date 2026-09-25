import * as React from "react";
import { cn } from "@/lib/utils";

export interface BlueprintCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "flat" | "subtle";
  interactive?: boolean;
}

export function BlueprintCard({
  variant = "default",
  interactive = false,
  className,
  children,
  ...props
}: BlueprintCardProps) {
  return (
    <div
      className={cn(
        "transition-colors",
        variant === "default" &&
          "bg-card text-card-foreground border border-border rounded-[6px]",
        variant === "flat" &&
          "bg-background text-foreground border-0 rounded-none",
        variant === "subtle" &&
          "bg-muted/40 text-foreground border border-border/80 rounded-[6px]",
        interactive &&
          "hover:border-foreground/25 cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function BlueprintCardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-border/60",
        className
      )}
      {...props}
    />
  );
}

export function BlueprintCardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-sm sm:text-base font-semibold tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  );
}

export function BlueprintCardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xs text-muted-foreground mt-0.5", className)}
      {...props}
    />
  );
}

export function BlueprintCardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 sm:p-5", className)} {...props} />;
}

export function BlueprintCardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 sm:p-5 border-t border-border/60 text-xs text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

// StripeCard alias for exact semantic compliance
export const StripeCard = BlueprintCard;
export const StripeCardHeader = BlueprintCardHeader;
export const StripeCardTitle = BlueprintCardTitle;
export const StripeCardDescription = BlueprintCardDescription;
export const StripeCardContent = BlueprintCardContent;
export const StripeCardFooter = BlueprintCardFooter;
