"use client";

import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { DashboardCard } from "@/components/dashboard-card";
import { BriefcaseIcon, Bot, CalendarIcon, AwardIcon } from "lucide-react";

const items = [
	{
		title: "Applied to Senior Frontend Engineer at Stripe",
		time: "About 2 hours ago",
		icon: <BriefcaseIcon className="size-4" />,
	},
	{
		title: "AI Analysis: 92% match for Vercel Dev role",
		time: "This morning",
		icon: <Bot className="size-4" />,
	},
	{
		title: "Interview scheduled with Linear team",
		time: "Yesterday",
		icon: <CalendarIcon className="size-4" />,
	},
	{
		title: "Weekly target reached: 10 applications sent",
		time: "2 days ago",
		icon: <AwardIcon className="size-4" />,
	},
] as const;

export function DashboardActivity() {
	return (
		<DashboardCard className="gap-0">
			<CardHeader className="p-6 border-b">
				<CardTitle className="text-base font-semibold">Activity</CardTitle>
				<CardDescription className="text-xs text-muted-foreground mt-1">
					Latest updates in your career search.
				</CardDescription>
			</CardHeader>
			<CardContent className="px-0">
				<ul className="flex flex-col divide-y divide-border">
					{items.map((item) => (
						<li className="flex h-16 items-center gap-3 px-6" key={item.title}>
							<span
								aria-hidden="true"
								className="flex size-10 shrink-0 items-center justify-center [&_svg]:size-4"
							>
								{item.icon}
							</span>
							<div className="min-w-0 flex-1 space-y-1">
								<p className="line-clamp-1 text-pretty text-foreground text-sm leading-snug">
									{item.title}
								</p>
								<p className="text-muted-foreground text-xs">{item.time}</p>
							</div>
						</li>
					))}
				</ul>
			</CardContent>
		</DashboardCard>
	);
}


