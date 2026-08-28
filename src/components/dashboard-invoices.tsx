"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { DashboardCard } from "@/components/dashboard-card";
import StatusBadge from "@/components/StatusBadge";
import { ArrowRightIcon } from "lucide-react";

export type RecentApp = {
	id: string;
	companyName: string;
	jobTitle: string;
	status: string;
	applicationDate?: string | Date | null;
};

const defaultRecent: RecentApp[] = [
	{
		id: "1",
		companyName: "Stripe",
		jobTitle: "Senior Frontend Engineer",
		status: "Interview",
	},
	{
		id: "2",
		companyName: "Vercel",
		jobTitle: "Fullstack Systems Dev",
		status: "Assessment",
	},
	{
		id: "3",
		companyName: "Linear",
		jobTitle: "Product Engineer",
		status: "Applied",
	},
	{
		id: "4",
		companyName: "Supabase",
		jobTitle: "Developer Advocate",
		status: "Offer",
	},
];

export function DashboardInvoices({ applications }: { applications?: RecentApp[] }) {
	const list = applications && applications.length > 0 ? applications : defaultRecent;

	return (
		<DashboardCard className="relative gap-0 md:col-span-2">
			<div className="flex items-center justify-between px-5 h-12 border-b border-border shrink-0">
				<h3 className="text-sm font-semibold text-foreground">Recent Applications</h3>
				<Link href="/applications" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
					View All →
				</Link>
			</div>
			<div className="mask-b-from-50% mask-b-to-100% px-0 pb-10">
				<Table>
					<TableCaption className="sr-only">
						Recent job applications with company, role, and current status.
					</TableCaption>
					<TableHeader>
						<TableRow>
							<TableHead className="ps-5">Company</TableHead>
							<TableHead>Role</TableHead>
							<TableHead className="pe-5 text-right">
								Status
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{list.map((app) => (
							<TableRow className="h-12" key={app.id}>
								<TableCell className="max-w-40 truncate ps-5 font-medium text-foreground">
									<Link href={`/applications/${app.id}`} className="hover:underline">
										{app.companyName}
									</Link>
								</TableCell>
								<TableCell className="text-muted-foreground truncate max-w-48 text-xs">
									{app.jobTitle}
								</TableCell>
								<TableCell className="pe-5 text-right">
									<StatusBadge status={app.status} />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
			<div className="mask-t-from-30% absolute inset-x-0 bottom-0 flex h-1/5 items-center justify-center bg-background">
				<Button asChild className="relative" variant="ghost">
					<Link href="/applications">
						View All Applications
						<ArrowRightIcon aria-hidden="true" />
					</Link>
				</Button>
			</div>
		</DashboardCard>
	);
}



