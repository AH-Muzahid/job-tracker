"use client";

import { useId } from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { formatDate } from "@/components/formater";
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

const VISIBLE_DAYS = 7;

type ChannelSalesChartRow = {
	date: string;
	retail: number;
	online: number;
};

const chartData: ChannelSalesChartRow[] = [
	{ date: "2026-04-07", retail: 82, online: 38 },
	{ date: "2026-04-08", retail: 96, online: 46 },
	{ date: "2026-04-09", retail: 92, online: 69 },
	{ date: "2026-04-10", retail: 96, online: 62 },
	{ date: "2026-04-11", retail: 112, online: 75 },
	{ date: "2026-04-12", retail: 101, online: 77 },
	{ date: "2026-04-13", retail: 112, online: 78 },
];

const chartRows = chartData.slice(-VISIBLE_DAYS);

const chartConfig = {
	retail: {
		label: "Retail",
		color: "var(--chart-2)",
	},
	online: {
		label: "Online",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

export function ChannelSalesChart() {
	const chartUid = useId().replace(/:/g, "");
	const idLineGlow = `channel-sales-line-glow-${chartUid}`;
	const growthPctNum = 58.3;

	return (
		<DashboardCard className="gap-0 md:col-span-2">
			<CardHeader className="p-6 pb-2">
				<div className="min-w-0 space-y-1">
					<div className="flex flex-wrap items-center gap-2">
						<CardTitle className="text-base font-semibold">Source & Outreach Channels</CardTitle>
						<Delta value={growthPctNum} variant="badge">
							<DeltaIcon variant="trend" />
							<DeltaValue />
						</Delta>
					</div>
					<CardDescription className="text-xs text-muted-foreground mt-1">
						Application sources & response trajectory, last {VISIBLE_DAYS} days.
					</CardDescription>
				</div>
			</CardHeader>
			<CardContent className="p-6 pt-2">
				<ChartContainer
					className="aspect-auto h-60 w-full p-0 md:h-80"
					config={chartConfig}
				>
					<LineChart
						accessibilityLayer
						data={chartRows}
						margin={{
							left: 12,
							right: 12,
							top: 8,
						}}
					>
						<CartesianGrid className="stroke-border" vertical={false} />
						<XAxis
							axisLine={false}
							dataKey="date"
							interval={0}
							tickFormatter={(value) => formatDate(String(value), "day-month")}
							tickLine={false}
							tickMargin={8}
						/>
						<ChartTooltip
							content={<ChartTooltipContent hideLabel />}
							cursor={false}
						/>
						<defs>
							<filter
								height="140%"
								id={idLineGlow}
								width="140%"
								x="-20%"
								y="-20%"
							>
								<feGaussianBlur result="blur" stdDeviation="8" />
								<feComposite in="SourceGraphic" in2="blur" operator="over" />
							</filter>
						</defs>
						<Line
							dataKey="online"
							dot={false}
							filter={`url(#${idLineGlow})`}
							stroke="#ffffff"
							strokeWidth={2}
							type="step"
						/>
						<Line
							dataKey="retail"
							dot={false}
							filter={`url(#${idLineGlow})`}
							stroke="rgba(255, 255, 255, 0.65)"
							strokeWidth={2}
							type="step"
						/>
					</LineChart>
				</ChartContainer>
			</CardContent>
		</DashboardCard>
	);
}


