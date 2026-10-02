"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import type { SidebarNavGroup, SidebarNavItem } from "@/components/app-shared";
import { ChevronRightIcon } from "lucide-react";

function NavCollapsibleItem({ item, pathname }: { item: SidebarNavItem; pathname: string }) {
	const isItemActive = item.path
		? pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path))
		: false;
	const hasActiveSubItem = Boolean(
		item.subItems?.some(
			(i) => i.path && (pathname === i.path || pathname.startsWith(i.path))
		)
	);
	const [isOpen, setIsOpen] = useState(hasActiveSubItem || isItemActive);

	useEffect(() => {
		if (hasActiveSubItem || isItemActive) {
			setIsOpen(true);
		}
	}, [hasActiveSubItem, isItemActive]);

	return (
		<Collapsible
			open={isOpen}
			onOpenChange={setIsOpen}
			className="group/collapsible"
		>
			<SidebarMenuItem className="relative">
				{/* Active indicator pill when any subItem is active */}
				{(isItemActive || hasActiveSubItem) && (
					<span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5.5 bg-[#4f70e8] rounded-r-full z-10" />
				)}

				<CollapsibleTrigger asChild>
					<SidebarMenuButton
						isActive={isItemActive || hasActiveSubItem}
						tooltip={item.title}
						className={cn(
							"h-10 px-3 rounded-lg text-[13px] transition-all duration-150 cursor-pointer border-0 ring-0 outline-none shadow-none w-full",
							hasActiveSubItem || isItemActive
								? "bg-[#152033] text-white font-medium hover:bg-[#152033]"
								: "text-[#94a3b8] hover:text-white hover:bg-[#152033]/50 font-normal"
						)}
					>
						<div className="flex items-center gap-3 w-full">
							<span
								className={cn(
									"shrink-0 transition-colors",
									hasActiveSubItem || isItemActive ? "text-[#4f70e8]" : "text-[#94a3b8]"
								)}
							>
								{item.icon}
							</span>
							<span className="truncate flex-1 text-left">{item.title}</span>
							<ChevronRightIcon className="ml-auto size-3.5 text-[#64748b] transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
						</div>
					</SidebarMenuButton>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<SidebarMenuSub className="border-l border-[#182338] ml-5 pl-2.5 my-1 space-y-0.5">
						{item.subItems?.map((subItem) => {
							const isSubActive = subItem.path
								? pathname === subItem.path || (subItem.path !== "/" && pathname.startsWith(subItem.path))
								: false;
							return (
								<SidebarMenuSubItem key={subItem.title} className="relative">
									{isSubActive && (
										<span className="absolute -left-3 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-[#4f70e8] rounded-r-full z-10" />
									)}
									<SidebarMenuSubButton
										asChild
										isActive={isSubActive}
										size="sm"
										className={cn(
											"h-8 px-2.5 rounded-md text-[12px] transition-all cursor-pointer w-full",
											isSubActive
												? "bg-[#152033] text-white font-medium"
												: "text-[#94a3b8] hover:text-white hover:bg-[#152033]/40 font-normal"
										)}
									>
										<Link href={subItem.path || "#"} className="flex items-center gap-2.5 w-full">
											<span
												className={cn(
													"shrink-0 transition-colors",
													isSubActive ? "text-[#4f70e8]" : "text-[#64748b]"
												)}
											>
												{subItem.icon}
											</span>
											<span className="truncate">{subItem.title}</span>
										</Link>
									</SidebarMenuSubButton>
								</SidebarMenuSubItem>
							);
						})}
					</SidebarMenuSub>
				</CollapsibleContent>
			</SidebarMenuItem>
		</Collapsible>
	);
}

export function NavGroup({ label, items }: SidebarNavGroup) {
	const pathname = usePathname();

	return (
		<SidebarGroup className="p-0">
			{label && (
				<>
					<div className="h-px bg-[#182338] mx-3 my-3" />
					<SidebarGroupLabel className="text-[11px] font-semibold text-[#64748b] tracking-wider uppercase px-3 py-1">
						{label}
					</SidebarGroupLabel>
				</>
			)}
			<SidebarMenu className="space-y-1 px-2">
				{items.map((item) => {
					if (item.subItems?.length) {
						return <NavCollapsibleItem key={item.title} item={item} pathname={pathname} />;
					}

					const isItemActive = item.path
						? pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path))
						: false;

					return (
						<SidebarMenuItem className="relative" key={item.title}>
							{/* Sleek vertical active indicator pill on far left */}
							{isItemActive && (
								<span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5.5 bg-[#4f70e8] rounded-r-full z-10" />
							)}

							<SidebarMenuButton
								asChild
								isActive={isItemActive}
								tooltip={item.title}
								className={cn(
									"h-10 px-3 rounded-lg text-[13px] transition-all duration-150 cursor-pointer border-0 ring-0 outline-none shadow-none",
									isItemActive
										? "bg-[#152033]! text-white! font-medium hover:bg-[#152033]!"
										: "text-[#94a3b8]! hover:text-white! hover:bg-[#152033]/50! font-normal"
								)}
							>
								<Link href={item.path || "#"} className="flex items-center gap-3 w-full">
									{isItemActive ? (
										<div className="size-6.5 rounded-lg bg-[#4f70e8] flex items-center justify-center text-white shrink-0 shadow-xs">
											{item.icon}
										</div>
									) : (
										<span className="shrink-0 text-[#94a3b8]">{item.icon}</span>
									)}
									<span className="truncate">{item.title}</span>
									{item.hasDrilldown && (
										<ChevronRightIcon className="ml-auto size-3.5 text-slate-500 transition-transform group-hover/collapsible:translate-x-0.5" />
									)}
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
