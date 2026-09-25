import * as React from "react";
import { cn } from "@/lib/utils";
import { DecorIcon } from "@/components/decor-icon";

export interface BlueprintGridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2 | 3 | 4;
  withDecorIcon?: boolean;
}

export function BlueprintGrid({
  columns = 4,
  withDecorIcon = true,
  className,
  children,
  ...props
}: BlueprintGridProps) {
  const colClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
  }[columns];

  return (
    <div
      className={cn(
        "relative border border-border bg-border w-full overflow-hidden",
        className
      )}
      {...props}
    >
      {withDecorIcon && (
        <DecorIcon className="hidden md:block pointer-events-none" position="top-left" />
      )}
      <div className={cn("grid gap-px bg-border", colClass)}>
        {children}
      </div>
    </div>
  );
}
