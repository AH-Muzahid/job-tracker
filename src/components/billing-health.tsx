import Link from "next/link";
import { DashboardCard } from "@/components/dashboard-card";

export type FollowUpApp = {
	id: string;
	companyName: string;
	jobTitle: string;
	status: string;
};

export function BillingHealth({ followUps }: { followUps?: FollowUpApp[] }) {
	const hasFollowUps = followUps && followUps.length > 0;

	return (
		<DashboardCard className="gap-0 h-full">
			<div className="flex items-center justify-between px-5 h-12 border-b border-border shrink-0">
				<h3 className="text-sm font-semibold text-foreground">Pipeline Health</h3>
				<Link href="/applications" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
					View →
				</Link>
			</div>
			<div className="px-5 py-3 flex-1">
				{hasFollowUps ? (
					<ul className="space-y-2">
						{followUps.slice(0, 3).map((app) => (
							<li key={app.id}>
								<Link
									href={`/applications/${app.id}`}
									className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
								>
									<div className="min-w-0 flex-1">
										<p className="text-xs font-medium text-foreground truncate">{app.jobTitle}</p>
										<p className="text-[11px] text-muted-foreground truncate">{app.companyName}</p>
									</div>
									<span className="text-[11px] text-muted-foreground shrink-0 ml-3">{app.status}</span>
								</Link>
							</li>
						))}
					</ul>
				) : (
					<div className="py-3">
						<p className="text-xs text-muted-foreground">No pending follow-ups</p>
					</div>
				)}
			</div>
		</DashboardCard>
	);
}
