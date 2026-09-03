"use client";

import { useId } from "react";
import type * as React from "react";
import { Bar, BarChart, XAxis } from "recharts";
import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta";
import { DashboardCard } from "@/components/dashboard-card";
import { useStats } from "@/lib/api";

const defaultWeeklyActivity = [
	{ day: "Mon", applications: 2, responses: 1 },
	{ day: "Tue", applications: 3, responses: 0 },
	{ day: "Wed", applications: 1, responses: 2 },
	{ day: "Thu", applications: 4, responses: 1 },
	{ day: "Fri", applications: 3, responses: 1 },
	{ day: "Sat", applications: 1, responses: 0 },
	{ day: "Sun", applications: 2, responses: 1 },
];

const chartConfig = {
	applications: {
		label: "Applications",
		color: "var(--chart-2)",
	},
	responses: {
		label: "Responses",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

function CustomGradientBar(
	props: React.SVGProps<SVGRectElement> & {
		index?: number;
		dataKey?: string | number;
		uniquePrefix?: string;
	}
) {
	const {
		fill = "var(--chart-2)",
		x = 0,
		y = 0,
		width = 0,
		height = 0,
		dataKey = "applications",
		index = 0,
		uniquePrefix = "bar",
	} = props;
	const gid = `gradient-${uniquePrefix}-${String(dataKey)}-${index}`;

	return (
		<>
			<rect
				fill={`url(#${gid})`}
				height={height}
				stroke="none"
				width={width}
				x={x}
				y={y}
			/>
			<rect fill={fill} height={2} stroke="none" width={width} x={x} y={y} />
			<defs>
				<linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
					<stop offset="0%" stopColor={fill} stopOpacity={0.5} />
					<stop offset="100%" stopColor={fill} stopOpacity={0.05} />
				</linearGradient>
			</defs>
		</>
	);
}

export function NetRevenueChart() {
	const chartUid = useId().replace(/:/g, "");
	const { data: stats } = useStats();

	// Calculate velocity from stats or fallback to recent 7-day pattern
	const total = stats?.total ?? 16;
	const active = (stats?.applied ?? 0) + (stats?.interview ?? 0);
	const weeklyTotal = defaultWeeklyActivity.reduce((acc, curr) => acc + curr.applications, 0);
	const growthPct = total > 0 ? ((active / total) * 100).toFixed(1) : "14.2";

	return (
		<DashboardCard className="gap-0 md:col-span-2">
			<CardHeader className="px-5 pt-4 pb-2">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="space-y-0.5">
						<div className="flex items-center gap-2">
							<CardTitle className="text-base font-semibold">Application Velocity</CardTitle>
							<Delta value={Number(growthPct)} variant="badge">
								<DeltaIcon variant="trend" />
								<DeltaValue />
							</Delta>
						</div>
						<CardDescription className="text-xs text-muted-foreground">
							Weekly submission pace & interview response rate
						</CardDescription>
					</div>
					<div className="hidden sm:flex items-center gap-3 text-xs font-mono text-muted-foreground">
						<span className="flex items-center gap-1.5">
							<span className="size-2 rounded-xs bg-[var(--chart-2)]" />
							{weeklyTotal} submitted this week
						</span>
					</div>
				</div>
			</CardHeader>
			<CardContent className="p-5 pt-3">
				<ChartContainer
					className="aspect-auto h-56 w-full md:h-72"
					config={chartConfig}
				>
					<BarChart accessibilityLayer data={defaultWeeklyActivity}>
						<XAxis
							axisLine={false}
							dataKey="day"
							interval={0}
							tickFormatter={(value) => String(value)}
							tickLine={false}
							tickMargin={10}
							className="font-mono text-xs text-muted-foreground"
						/>
						<ChartTooltip
							content={<ChartTooltipContent />}
							cursor={false}
						/>
						<Bar
							dataKey="applications"
							fill="var(--chart-2)"
							shape={<CustomGradientBar uniquePrefix={chartUid} />}
						/>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</DashboardCard>
	);
}
