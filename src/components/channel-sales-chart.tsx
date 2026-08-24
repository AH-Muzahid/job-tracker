"use client";

import { useStats } from "@/lib/api";
import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { DashboardCard } from "@/components/dashboard-card";
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta";
import { cn } from "@/lib/utils";

interface StageItem {
	key: string;
	label: string;
	count: number;
	dotColor: string;
	percentage: number;
}

export function ChannelSalesChart() {
	const { data: stats } = useStats();

	const total = Math.max(stats?.total ?? 0, 1);
	const savedCount = stats?.saved ?? 3;
	const appliedCount = stats?.applied ?? 8;
	const assessmentCount = stats?.assessment ?? 2;
	const interviewCount = stats?.interview ?? 3;
	const offerCount = stats?.offer ?? 1;
	const rejectedCount = stats?.rejected ?? 2;

	const stages: StageItem[] = [
		{
			key: "applied",
			label: "Applied",
			count: appliedCount,
			dotColor: "bg-[var(--status-applied)]",
			percentage: Math.round((appliedCount / total) * 100),
		},
		{
			key: "interview",
			label: "Interview",
			count: interviewCount,
			dotColor: "bg-[var(--status-interview)]",
			percentage: Math.round((interviewCount / total) * 100),
		},
		{
			key: "assessment",
			label: "Assessment",
			count: assessmentCount,
			dotColor: "bg-[var(--status-assessment)]",
			percentage: Math.round((assessmentCount / total) * 100),
		},
		{
			key: "offer",
			label: "Offer",
			count: offerCount,
			dotColor: "bg-[var(--status-offer)]",
			percentage: Math.round((offerCount / total) * 100),
		},
		{
			key: "saved",
			label: "Saved",
			count: savedCount,
			dotColor: "bg-[var(--status-saved)]",
			percentage: Math.round((savedCount / total) * 100),
		},
		{
			key: "rejected",
			label: "Rejected",
			count: rejectedCount,
			dotColor: "bg-[var(--status-rejected)]",
			percentage: Math.round((rejectedCount / total) * 100),
		},
	];

	// Top Acquisition Channels / Sources
	const sources = stats?.bySource?.length
		? stats.bySource.slice(0, 4)
		: [
				{ source: "LinkedIn", count: 7 },
				{ source: "Indeed", count: 4 },
				{ source: "Company Website", count: 3 },
				{ source: "Referral", count: 2 },
		  ];

	const interviewRate = total > 0 ? (((interviewCount + offerCount) / total) * 100).toFixed(1) : "18.8";

	return (
		<DashboardCard className="gap-0 md:col-span-2">
			<CardHeader className="px-5 pt-4 pb-3 border-b">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="space-y-0.5">
						<div className="flex items-center gap-2">
							<CardTitle className="text-base font-semibold">Pipeline Funnel & Sources</CardTitle>
							<Delta value={Number(interviewRate)} variant="badge">
								<DeltaIcon variant="trend" />
								<DeltaValue />
							</Delta>
						</div>
						<CardDescription className="text-xs text-muted-foreground">
							Conversion stages & candidate acquisition breakdown
						</CardDescription>
					</div>
					<div className="text-xs font-mono text-muted-foreground">
						<span className="text-foreground font-medium">{interviewRate}%</span> interview rate
					</div>
				</div>
			</CardHeader>

			<CardContent className="p-5 flex flex-col justify-between gap-4">
				{/* Horizontal Funnel Progress Bars */}
				<div className="space-y-2.5">
					{stages.slice(0, 4).map((stage) => (
						<div key={stage.key} className="space-y-1">
							<div className="flex items-center justify-between text-xs">
								<span className="flex items-center gap-2 font-medium text-foreground">
									<span className={cn("size-1.5 rounded-full shrink-0", stage.dotColor)} />
									{stage.label}
								</span>
								<span className="font-mono text-muted-foreground tabular-nums">
									{stage.count} <span className="text-[10px] text-muted-foreground/60">({stage.percentage}%)</span>
								</span>
							</div>
							<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
								<div
									className="h-full rounded-full bg-foreground/80 transition-all duration-500"
									style={{ width: `${Math.max(stage.percentage, 4)}%` }}
								/>
							</div>
						</div>
					))}
				</div>

				{/* Channels Breakdown Footer */}
				<div className="border-t border-border/80 pt-3">
					<div className="flex items-center justify-between mb-2">
						<span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
							Top Channels
						</span>
						<span className="text-[11px] font-mono text-muted-foreground/80">
							Submissions
						</span>
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
						{sources.map((item: { source: string; count: number }) => (
							<div
								key={item.source}
								className="flex flex-col rounded-md border border-border bg-muted/30 px-2.5 py-1.5"
							>
								<span className="truncate text-[11px] font-medium text-foreground">
									{item.source}
								</span>
								<span className="font-mono text-[11px] text-muted-foreground tabular-nums">
									{item.count} apps
								</span>
							</div>
						))}
					</div>
				</div>
			</CardContent>
		</DashboardCard>
	);
}
