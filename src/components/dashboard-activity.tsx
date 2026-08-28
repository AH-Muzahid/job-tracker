"use client";

import Link from "next/link";
import { DashboardCard } from "@/components/dashboard-card";

type Application = {
	id: string;
	companyName: string;
	jobTitle: string;
	status: string;
	applicationDate: string;
};

function timeAgo(dateStr: string): string {
	const now = Date.now();
	const then = new Date(dateStr).getTime();
	const diffMs = now - then;
	const mins = Math.floor(diffMs / 60000);
	if (mins < 1) return "Just now";
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	return `${Math.floor(days / 7)}w ago`;
}

export function DashboardActivity({ recent }: { recent?: Application[] }) {
	const items = recent ?? [];

	return (
		<DashboardCard className="gap-0 h-full">
			<div className="flex items-center justify-between px-5 h-12 border-b border-border shrink-0">
				<h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
			</div>
			<div className="px-5 py-2 flex-1">
				{items.length > 0 ? (
					<ul className="space-y-1">
						{items.map((app) => (
							<li key={app.id}>
								<Link
									href={`/applications/${app.id}`}
									className="flex items-center justify-between py-2 rounded-md hover:bg-muted/50 transition-colors"
								>
									<div className="min-w-0 flex-1">
										<p className="text-xs font-medium text-foreground truncate leading-snug">
											{app.jobTitle}
										</p>
										<p className="text-[11px] text-muted-foreground truncate">
											{app.companyName}
										</p>
									</div>
									<span className="text-[11px] text-muted-foreground shrink-0 ml-3">
										{timeAgo(app.applicationDate)}
									</span>
								</Link>
							</li>
						))}
					</ul>
				) : (
					<div className="py-3">
						<p className="text-xs text-muted-foreground">No activity yet</p>
					</div>
				)}
			</div>
		</DashboardCard>
	);
}
