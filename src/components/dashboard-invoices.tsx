"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
			<CardHeader className="px-5 pt-4 pb-4 border-b">
				<CardTitle className="text-base font-semibold">Recent Applications</CardTitle>
				<CardDescription className="text-xs text-muted-foreground mt-1">
					Latest pipeline submissions & stage updates.
				</CardDescription>
			</CardHeader>
			<CardContent className="mask-b-from-50% mask-b-to-100% px-0 pb-10">
				<Table>
					<TableCaption className="sr-only">
						Recent job applications with company, role, and current status.
					</TableCaption>
					<TableHeader>
						<TableRow>
							<TableHead className="ps-6">Company</TableHead>
							<TableHead>Role</TableHead>
							<TableHead className="pe-6 text-right">
								Status
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{list.map((app) => (
							<TableRow className="h-12" key={app.id}>
								<TableCell className="max-w-40 truncate ps-6 font-medium text-foreground">
									<Link href={`/applications/${app.id}`} className="hover:underline">
										{app.companyName}
									</Link>
								</TableCell>
								<TableCell className="text-muted-foreground truncate max-w-48 text-xs">
									{app.jobTitle}
								</TableCell>
								<TableCell className="pe-6 text-right">
									<StatusBadge status={app.status} />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
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



