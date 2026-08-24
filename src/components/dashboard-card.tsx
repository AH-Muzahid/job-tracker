import { cn } from "@/lib/utils";
import type * as React from "react";

export function DashboardCard({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex flex-col h-full w-full flex-1 rounded-none border-0 bg-background text-card-foreground shadow-none ring-0",
				className
			)}
			{...props}
		/>
	);
}
