import { Delta, DeltaIcon, DeltaValue } from "@/components/delta";
import { DashboardCard } from "@/components/dashboard-card";

type Stat = {
	label: string;
	shortLabel?: string;
	value: string;
	delta: number;
	deltaText?: string;
};

export type DashboardStatsData = {
	total?: number;
	saved?: number;
	applied?: number;
	assessment?: number;
	interview?: number;
	rejected?: number;
	offer?: number;
};

export function DashboardStats({ data }: { data?: DashboardStatsData }) {
	const activePipeline = (data?.applied ?? 0) + (data?.assessment ?? 0) + (data?.interview ?? 0);
	const total = data?.total ?? 0;
	const interviewAndOffers = (data?.interview ?? 0) + (data?.offer ?? 0);
	const responseRate = total > 0 
		? (((data?.interview ?? 0) + (data?.assessment ?? 0) + (data?.offer ?? 0)) / total * 100).toFixed(1)
		: "0.0";

	const displayStats: Stat[] = data ? [
		{
			label: "Active Pipeline",
			shortLabel: "Active",
			value: String(activePipeline),
			delta: 8.5,
			deltaText: "in progress",
		},
		{
			label: "Total Applications",
			shortLabel: "Total",
			value: String(total),
			delta: 12.0,
			deltaText: "tracked",
		},
		{
			label: "Interviews & Offers",
			shortLabel: "Interviews",
			value: String(interviewAndOffers),
			delta: interviewAndOffers > 0 ? 5.2 : 0,
			deltaText: "stage 2+",
		},
		{
			label: "Response Rate",
			shortLabel: "Response",
			value: `${responseRate}%`,
			delta: Number(responseRate) >= 15 ? 2.4 : -0.5,
			deltaText: "rate",
		},
	] : [
		{
			label: "Active Pipeline",
			shortLabel: "Active",
			value: "14",
			delta: 8.5,
			deltaText: "progress",
		},
		{
			label: "Total Applications",
			shortLabel: "Total",
			value: "48",
			delta: 12.4,
			deltaText: "tracked",
		},
		{
			label: "Interviews & Offers",
			shortLabel: "Interviews",
			value: "6",
			delta: 4.2,
			deltaText: "stage 2+",
		},
		{
			label: "Response Rate",
			shortLabel: "Response",
			value: "22.5%",
			delta: 3.1,
			deltaText: "rate",
		},
	];

	return (
		<>
			{displayStats.map((s) => (
				<DashboardCard className="flex flex-col justify-between min-w-0" key={s.label}>
					<div className="p-3 sm:px-5 sm:pt-4 sm:pb-4 min-w-0">
						<p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
							<span className="sm:hidden">{s.shortLabel || s.label}</span>
							<span className="hidden sm:inline">{s.label}</span>
						</p>
						<p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-0.5 sm:mt-2">{s.value}</p>
					</div>
					<div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs px-3 sm:px-5 py-1.5 sm:py-2.5 border-t border-border bg-background font-mono min-w-0 overflow-hidden">
						<Delta value={s.delta}>
							<DeltaIcon />
							<DeltaValue />
						</Delta>
						<span className="text-muted-foreground truncate hidden xs:inline">{s.deltaText || "vs last week"}</span>
					</div>
				</DashboardCard>
			))}
		</>
	);
}

interface StatItem {
	value?: string;
	label?: string;
	subtext?: string;
}

interface StatsSectionProps {
	title?: string;
	description?: string;
	items?: StatItem[];
	className?: string;
}

export default function StatsSection({ title, description, items, className }: StatsSectionProps) {
	return (
		<section className={className}>
			<div className="mx-auto max-w-5xl space-y-4 px-6 md:space-y-6">
				{(title || description) && (
					<div className="relative z-10 mx-auto max-w-xl space-y-4 text-center">
						{title && <h2 className="text-3xl font-medium lg:text-4xl">{title}</h2>}
						{description && <p className="text-sm text-muted-foreground">{description}</p>}
					</div>
				)}

				{items && items.length > 0 && (
					<div
						className={
							"grid gap-6 divide-y *:text-center md:gap-0 md:divide-x md:divide-y-0" +
							(items.length === 3 ? " md:grid-cols-3" : "") +
							(items.length === 4 ? " md:grid-cols-4" : "") +
							(items.length === 5 ? " md:grid-cols-5" : "") +
							(items.length === 6 ? " md:grid-cols-6" : "")
						}
					>
						{items.map((item, i) => (
							<div key={i} className="space-y-1 py-4 md:py-0 md:px-4 first:pl-0 last:pr-0">
								{item.value && <div className="text-3xl font-bold">{item.value}</div>}
								{item.label && <p className="text-sm font-medium">{item.label}</p>}
								{item.subtext && <p className="text-xs text-muted-foreground">{item.subtext}</p>}
							</div>
						))}
					</div>
				)}
			</div>
		</section>
	);
}

