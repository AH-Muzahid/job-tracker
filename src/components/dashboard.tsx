"use client";

import dynamic from "next/dynamic";
import { useStats } from "@/lib/api";
import { DashboardQuickIntake } from "@/components/dashboard/DashboardQuickIntake";
import { DashboardMessages } from "@/components/dashboard/DashboardMessages";
import { BillingHealth } from "@/components/billing-health";
import { DashboardActivity } from "@/components/dashboard-activity";
import { DashboardInvoices } from "@/components/dashboard-invoices";
import { DashboardStats } from "@/components/stats";
import { DecorIcon } from "@/components/decor-icon";

const NetRevenueChart = dynamic(
	() => import("@/components/net-revenue-chart").then((m) => m.NetRevenueChart),
	{ ssr: false, loading: () => <div className="h-[200px] animate-pulse bg-muted/20" /> }
);

const ChannelSalesChart = dynamic(
	() => import("@/components/channel-sales-chart").then((m) => m.ChannelSalesChart),
	{ ssr: false, loading: () => <div className="h-[200px] animate-pulse bg-muted/20" /> }
);

export function Dashboard() {
	const { data: stats } = useStats();

	return (
		<div className="relative border border-border bg-border w-full max-w-full overflow-hidden">
			<DecorIcon className="hidden md:block" position="top-left" />
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
				{/* 2-Column Top: Messages + Quick Intake */}
				<div className="col-span-2 lg:col-span-2 flex flex-col h-full bg-background">
					<DashboardMessages />
				</div>
				<div className="col-span-2 lg:col-span-2 flex flex-col h-full bg-background">
					<DashboardQuickIntake />
				</div>

				{/* 4 Core Metrics */}
				<DashboardStats data={stats} />

				{/* Velocity & Pipeline Funnel */}
				<div className="col-span-2 lg:col-span-2 flex flex-col h-full bg-background">
					<NetRevenueChart />
				</div>
				<div className="col-span-2 lg:col-span-2 flex flex-col h-full bg-background">
					<ChannelSalesChart />
				</div>

				{/* Recent Applications & Health/Activity */}
				<div className="col-span-2 lg:col-span-2 flex flex-col h-full bg-background">
					<DashboardInvoices applications={stats?.recent} />
				</div>
				<div className="col-span-2 lg:col-span-1 flex flex-col h-full bg-background">
					<BillingHealth followUps={stats?.followUpApps} />
				</div>
				<div className="col-span-2 lg:col-span-1 flex flex-col h-full bg-background">
					<DashboardActivity recent={stats?.recent} />
				</div>
			</div>
		</div>
	);
}
