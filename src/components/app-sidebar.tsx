"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenuButton,
} from "@/components/ui/sidebar";
import { navGroups } from "@/components/app-shared";
import { NavGroup } from "@/components/nav-group";

export function AppSidebar() {
	return (
		<Sidebar
			className={cn(
				"dark *:data-[slot=sidebar-inner]:bg-[#0c1322] *:data-[slot=sidebar-inner]:border-r *:data-[slot=sidebar-inner]:border-[#182338]",
				"**:data-[slot=sidebar-menu-button]:[&>span]:text-slate-200"
			)}
			collapsible="icon"
			variant="sidebar"
		>
			{/* Main CareerTrack Logo Header */}
			<SidebarHeader className="h-16 justify-center border-none px-4 pt-3 pb-1">
				<SidebarMenuButton asChild size="lg" className="hover:bg-transparent cursor-pointer">
					<Link href="/dashboard" className="flex items-center gap-2.5">
						<div className="flex size-7 items-center justify-center shrink-0">
							<svg viewBox="0 0 28 28" className="size-7 shrink-0">
								<defs>
									<linearGradient id="ctLogoGrad" x1="20%" y1="100%" x2="80%" y2="0%">
										<stop offset="0%" stopColor="#10b981" />
										<stop offset="50%" stopColor="#2dd4bf" />
										<stop offset="100%" stopColor="#5eead4" />
									</linearGradient>
								</defs>
								<circle cx="14" cy="14" r="14" fill="url(#ctLogoGrad)" />
								<path d="M 4 20.5 L 10.5 14 L 10.5 8 L 13 8 L 14.5 11 L 22.5 4.5 L 24 6 L 15 13.5 L 13.5 13.5 L 11.5 15.5 L 5 22 Z" fill="#0c1322" />
							</svg>
						</div>
						<div className="flex flex-col leading-none min-w-0 group-data-[collapsible=icon]:hidden">
							<span className="font-bold text-base text-white tracking-tight">CareerTrack</span>
						</div>
					</Link>
				</SidebarMenuButton>
			</SidebarHeader>

			{/* Main NavGroups */}
			<SidebarContent className="p-1">
				{navGroups.map((group, index) => (
					<NavGroup key={`sidebar-group-${index}`} {...group} />
				))}
			</SidebarContent>

			{/* Footer: Your Progress Momentum Card */}
			<SidebarFooter className="p-3 pt-0 pb-3 border-none bg-transparent">
				<div className="rounded-xl bg-[#131c2d] ring-1 ring-[#182338] p-4 group-data-[collapsible=icon]:hidden transition-all">
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold text-white tracking-tight">Your Progress</span>
					</div>
					<p className="text-[11px] text-[#94a3b8] mt-1 leading-snug">
						Keep going! You&apos;re building momentum.
					</p>
					<div className="mt-3 flex items-center gap-2.5">
						<div className="h-1.5 flex-1 rounded-full bg-[#1b2537] overflow-hidden">
							<div className="h-full rounded-full bg-[#10b981] w-[70%]" />
						</div>
						<span className="text-[11px] font-semibold text-white">70%</span>
					</div>
				</div>
			</SidebarFooter>
		</Sidebar>
	);
}
