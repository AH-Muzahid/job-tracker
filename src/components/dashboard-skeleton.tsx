import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { DecorIcon } from "@/components/decor-icon";

export function DashboardSkeleton() {
	return (
		<div className="relative border border-border bg-border w-full max-w-full overflow-hidden">
			<DecorIcon className="hidden md:block" position="top-left" />
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
				{/* Top Command Zone Skeleton */}
				<div className="col-span-2 lg:col-span-4 bg-background p-4 sm:p-6 space-y-4">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
						<div className="flex items-center gap-2.5">
							<Skeleton className="size-7 rounded-md shrink-0" />
							<div className="space-y-1.5">
								<Skeleton className="h-4 w-44 rounded-sm" />
								<Skeleton className="h-3 w-64 rounded-sm" />
							</div>
						</div>
						<div className="flex items-center gap-2 w-full sm:w-auto">
							<Skeleton className="h-8 flex-1 sm:w-24 rounded-md" />
							<Skeleton className="h-8 flex-1 sm:w-24 rounded-md" />
						</div>
					</div>

					<div className="space-y-3">
						<div className="flex items-center gap-1 p-1 rounded-lg border border-border bg-muted/40 w-full sm:w-64">
							<Skeleton className="h-6 flex-1 rounded-md" />
							<Skeleton className="h-6 flex-1 rounded-md" />
							<Skeleton className="h-6 flex-1 rounded-md" />
						</div>
						<Skeleton className="h-28 w-full rounded-lg" />
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
							<Skeleton className="h-3 w-36 rounded-sm order-2 sm:order-1" />
							<Skeleton className="h-8 w-full sm:w-44 rounded-md order-1 sm:order-2" />
						</div>
					</div>
				</div>

				{/* 4 Stat Cards */}
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="col-span-1 bg-background p-4 sm:p-5 space-y-3">
						<div className="flex items-center justify-between">
							<Skeleton className="h-3.5 w-20 rounded-sm" />
							<Skeleton className="h-4 w-12 rounded-full" />
						</div>
						<Skeleton className="h-7 w-16 rounded-sm" />
						<Skeleton className="h-2.5 w-24 rounded-sm" />
					</div>
				))}

				{/* 2 Charts (Velocity & Pipeline Funnel) */}
				<div className="col-span-2 lg:col-span-2 bg-background p-5 space-y-4">
					<div className="flex items-center justify-between pb-2 border-b border-border">
						<div className="space-y-1">
							<Skeleton className="h-4 w-36 rounded-sm" />
							<Skeleton className="h-3 w-48 rounded-sm" />
						</div>
						<Skeleton className="h-4 w-16 rounded-sm" />
					</div>
					<div className="h-52 flex items-end justify-between gap-2 pt-6">
						{Array.from({ length: 7 }).map((_, i) => (
							<Skeleton
								key={i}
								className="flex-1 rounded-t-sm"
								style={{ height: `${30 + ((i * 17) % 65)}%` }}
							/>
						))}
					</div>
				</div>

				<div className="col-span-2 lg:col-span-2 bg-background p-5 space-y-4">
					<div className="flex items-center justify-between pb-2 border-b border-border">
						<div className="space-y-1">
							<Skeleton className="h-4 w-40 rounded-sm" />
							<Skeleton className="h-3 w-52 rounded-sm" />
						</div>
						<Skeleton className="h-4 w-20 rounded-sm" />
					</div>
					<div className="space-y-3 pt-2">
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className="space-y-1">
								<div className="flex justify-between">
									<Skeleton className="h-3 w-20 rounded-sm" />
									<Skeleton className="h-3 w-12 rounded-sm" />
								</div>
								<Skeleton className="h-1.5 w-full rounded-full" />
							</div>
						))}
					</div>
				</div>

				{/* 3 Bottom Cards */}
				<div className="col-span-2 lg:col-span-2 bg-background p-5 space-y-3">
					<div className="flex items-center justify-between pb-2 border-b border-border">
						<Skeleton className="h-4 w-36 rounded-sm" />
						<Skeleton className="h-3 w-24 rounded-sm" />
					</div>
					<div className="space-y-2 pt-1">
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
								<div className="space-y-1">
									<Skeleton className="h-3.5 w-28 rounded-sm" />
									<Skeleton className="h-3 w-40 rounded-sm" />
								</div>
								<Skeleton className="h-5 w-16 rounded-full" />
							</div>
						))}
					</div>
				</div>

				<div className="col-span-2 lg:col-span-1 bg-background p-5 flex flex-col justify-between">
					<div className="pb-3 border-b border-border space-y-1">
						<Skeleton className="h-4 w-28 rounded-sm" />
						<Skeleton className="h-3 w-36 rounded-sm" />
					</div>
					<div className="flex flex-col items-center justify-center py-6 space-y-2.5">
						<Skeleton className="size-10 rounded-full" />
						<Skeleton className="h-4 w-24 rounded-sm" />
						<Skeleton className="h-3 w-40 rounded-sm" />
						<Skeleton className="h-7 w-28 rounded-md mt-2" />
					</div>
				</div>

				<div className="col-span-2 lg:col-span-1 bg-background p-5 space-y-3">
					<div className="pb-3 border-b border-border space-y-1">
						<Skeleton className="h-4 w-24 rounded-sm" />
						<Skeleton className="h-3 w-32 rounded-sm" />
					</div>
					<div className="space-y-3 pt-1">
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className="flex items-center gap-3">
								<Skeleton className="size-7 rounded-md shrink-0" />
								<div className="space-y-1 flex-1">
									<Skeleton className="h-3.5 w-full rounded-sm" />
									<Skeleton className="h-2.5 w-16 rounded-sm" />
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
