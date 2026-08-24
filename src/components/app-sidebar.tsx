"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { footerNavLinks, navGroups } from "@/components/app-shared";
import { LatestChange } from "@/components/latest-change";
import { NavGroup } from "@/components/nav-group";
import { BriefcaseIcon } from "lucide-react";

export function AppSidebar() {
	const pathname = usePathname();

	return (
		<Sidebar
			className={cn(
				"*:data-[slot=sidebar-inner]:bg-background",
				"*:data-[slot=sidebar-inner]:dark:bg-[radial-gradient(60%_18%_at_10%_0%,--theme(--color-foreground/.08),transparent)]",
				"**:data-[slot=sidebar-menu-button]:[&>span]:text-foreground/75"
			)}
			collapsible="icon"
			variant="sidebar"
		>
			<SidebarHeader className="h-14 justify-center border-b px-2">
				<SidebarMenuButton asChild size="lg" className="hover:bg-transparent">
					<Link href="/dashboard" className="flex items-center gap-2.5">
						<div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs shadow-xs">
							<BriefcaseIcon className="size-4" />
						</div>
						<div className="flex flex-col gap-0.5 leading-none">
							<span className="font-bold text-sm text-foreground tracking-tight">CareerTrack</span>
							<span className="text-[10px] text-muted-foreground">AI Job Search</span>
						</div>
					</Link>
				</SidebarMenuButton>
			</SidebarHeader>
			<SidebarContent>
				{navGroups.map((group, index) => (
					<NavGroup key={`sidebar-group-${index}`} {...group} />
				))}
			</SidebarContent>
			<SidebarFooter className="gap-0 p-0">
				<LatestChange />
				<SidebarMenu className="border-t p-2">
					{footerNavLinks.map((item) => {
						const isFooterActive = item.path ? pathname === item.path : false;
						return (
							<SidebarMenuItem key={item.title}>
								<SidebarMenuButton
									asChild
									className="text-muted-foreground hover:text-foreground"
									isActive={isFooterActive}
									size="sm"
								>
									<Link href={item.path || "#"}>
										{item.icon}
										<span>{item.title}</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						);
					})}
				</SidebarMenu>
				<div className="px-4 pt-3 pb-2 transition-opacity group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0">
					<p className="text-nowrap text-[9px] text-muted-foreground">
						© {new Date().getFullYear()} CareerTrack AI
					</p>
				</div>
			</SidebarFooter>
		</Sidebar>
	);
}

