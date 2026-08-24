import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { DashboardCard } from "@/components/dashboard-card";
import { CircleCheckIcon, ArrowRightIcon } from "lucide-react";

export type FollowUpApp = {
	id: string;
	companyName: string;
	jobTitle: string;
	status: string;
};

export function BillingHealth({ followUps }: { followUps?: FollowUpApp[] }) {
	const hasFollowUps = followUps && followUps.length > 0;

	return (
		<DashboardCard className="gap-0">
			<CardHeader className="p-6 border-b">
				<CardTitle className="text-balance text-base font-semibold">Pipeline Health</CardTitle>
				<CardDescription className="text-pretty text-xs text-muted-foreground mt-1">
					{hasFollowUps ? `${followUps.length} follow-up(s) waiting` : "Nothing urgent needs your attention."}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex h-full items-center px-0">
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<CircleCheckIcon aria-hidden="true" />
						</EmptyMedia>
						<EmptyTitle>You&apos;re caught up.</EmptyTitle>
						<EmptyDescription className="text-xs">
							{hasFollowUps
								? `Follow up with ${followUps[0].companyName} on your recent application.`
								: "All active applications and interviews are up to date."}
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button asChild variant="ghost">
							<Link href="/applications">
								Review pipeline
								<ArrowRightIcon aria-hidden="true" />
							</Link>
						</Button>
					</EmptyContent>
				</Empty>
			</CardContent>
		</DashboardCard>
	);
}


