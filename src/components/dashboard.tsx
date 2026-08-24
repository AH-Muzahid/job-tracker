"use client";

import { useStats } from "@/lib/api";
import { BillingHealth } from "@/components/billing-health";
import { ChannelSalesChart } from "@/components/channel-sales-chart";
import { DashboardActivity } from "@/components/dashboard-activity";
import { DashboardInvoices } from "@/components/dashboard-invoices";
import { NetRevenueChart } from "@/components/net-revenue-chart";
import { DashboardStats } from "@/components/stats";
import { DecorIcon } from "@/components/decor-icon";

export function Dashboard() {
	const { data: stats } = useStats();

	return (
		<div className="relative border border-border bg-border w-full max-w-full overflow-hidden">
			<DecorIcon className="hidden md:block" position="top-left" />
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
				<DashboardStats data={stats} />
				<div className="col-span-2 lg:col-span-2 flex flex-col h-full bg-background">
					<NetRevenueChart />
				</div>
				<div className="col-span-2 lg:col-span-2 flex flex-col h-full bg-background">
					<ChannelSalesChart />
				</div>
				<div className="col-span-2 lg:col-span-2 flex flex-col h-full bg-background">
					<DashboardInvoices applications={stats?.recent} />
				</div>
				<div className="col-span-2 lg:col-span-1 flex flex-col h-full bg-background">
					<BillingHealth followUps={stats?.followUpApps} />
				</div>
				<div className="col-span-2 lg:col-span-1 flex flex-col h-full bg-background">
					<DashboardActivity />
				</div>
			</div>
		</div>
	);
}
