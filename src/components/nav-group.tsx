"use client";

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
import type { SidebarNavGroup } from "@/components/app-shared";
import { ChevronRightIcon } from "lucide-react";

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
					const isItemActive = item.path ? pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path)) : false;
					const hasActiveSubItem = item.subItems?.some(
						(i) => i.path && (pathname === i.path || pathname.startsWith(i.path))
					);

					return (
						<Collapsible
							asChild
							className="group/collapsible"
							defaultOpen={isItemActive || hasActiveSubItem}
							key={item.title}
						>
							<SidebarMenuItem className="relative">
								{/* Sleek vertical active indicator pill on far left */}
								{isItemActive && (
									<span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5.5 bg-[#4f70e8] rounded-r-full z-10" />
								)}

								{item.subItems?.length ? (
									<>
										<CollapsibleTrigger asChild>
											<SidebarMenuButton isActive={isItemActive || hasActiveSubItem}>
												{item.icon}
												<span>{item.title}</span>
												<ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
											</SidebarMenuButton>
										</CollapsibleTrigger>
										<CollapsibleContent>
											<SidebarMenuSub>
												{item.subItems?.map((subItem) => {
													const isSubActive = subItem.path ? pathname === subItem.path : false;
													return (
														<SidebarMenuSubItem key={subItem.title}>
															<SidebarMenuSubButton
																asChild
																isActive={isSubActive}
															>
																<Link href={subItem.path || "#"}>
																	{subItem.icon}
																	<span>{subItem.title}</span>
																</Link>
															</SidebarMenuSubButton>
														</SidebarMenuSubItem>
													);
												})}
											</SidebarMenuSub>
										</CollapsibleContent>
									</>
								) : (
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
								)}
							</SidebarMenuItem>
						</Collapsible>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
