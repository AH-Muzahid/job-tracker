import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: "default" | "narrow" | "full";
}

export function PageContainer({
  children,
  maxWidth = "default",
  className,
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "w-full min-w-0 max-w-full space-y-6 pb-12 overflow-x-clip",
        maxWidth === "default" && "max-w-7xl mx-auto",
        maxWidth === "narrow" && "max-w-4xl mx-auto",
        maxWidth === "full" && "max-w-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
