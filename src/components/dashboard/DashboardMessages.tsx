"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/dashboard-card";

function getGreeting(): string {
	const hour = new Date().getHours();
	if (hour < 12) return "Good morning";
	if (hour < 17) return "Good afternoon";
	return "Good evening";
}

export function DashboardMessages() {
	const { user } = useUser();
	const firstName = user?.firstName || "there";
	const greeting = getGreeting();

	return (
		<DashboardCard className="gap-0 h-full">
			<div className="flex flex-col justify-between h-full p-4">
				<div className="space-y-1">
					<p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
						{greeting}
					</p>
					<h2 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
						Welcome, {firstName}
					</h2>
					<p className="text-sm text-muted-foreground leading-relaxed max-w-md">
						Here&apos;s your job search overview. Track applications, prep for interviews, and land your next role.
					</p>
				</div>

				<div className="flex flex-wrap gap-2 mt-6">
					<Button asChild variant="outline" size="sm" className="text-xs h-8 rounded-none cursor-pointer">
						<Link href="/applications">
							My Applications →
						</Link>
					</Button>
					<Button asChild variant="outline" size="sm" className="text-xs h-8 rounded-none cursor-pointer">
						<Link href="/interview-prep">
							Interview Prep
						</Link>
					</Button>
					<Button asChild variant="outline" size="sm" className="text-xs h-8 rounded-none cursor-pointer">
						<Link href="/ai-assistant">
							AI Assistant
						</Link>
					</Button>
				</div>
			</div>
		</DashboardCard>
	);
}
