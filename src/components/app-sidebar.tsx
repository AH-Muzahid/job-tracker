"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { footerNavLinks, navGroups } from "@/components/app-shared";
import { LatestChange } from "@/components/latest-change";
import { NavGroup } from "@/components/nav-group";
import { useAI } from "@/lib/store";
import {
	BriefcaseIcon,
	ChevronLeft,
	Search,
	SquarePen,
	Brain,
	FileText,
	MessageSquare,
	Trash2,
	Settings,
} from "lucide-react";

interface ChatSession {
	id: string;
	title: string;
	mode: string | null;
	updatedAt: string;
	_count: { messages: number };
}

export function AppSidebar() {
	const pathname = usePathname();
	const router = useRouter();
	const { isLoaded, isSignedIn } = useUser();
	const queryClient = useQueryClient();
	const isAIAssistant = pathname.startsWith("/ai-assistant");
	const { activeChatId, setActiveChatId } = useAI();
	const [searchQuery, setSearchQuery] = useState("");

	const { data: sessions = [] } = useQuery({
		queryKey: ["ai", "sessions"],
		queryFn: async () => {
			const res = await fetch("/api/ai/sessions");
			if (res.ok) return (await res.json()) as ChatSession[];
			return [];
		},
		enabled: isAIAssistant && isLoaded && !!isSignedIn,
		staleTime: 5 * 60 * 1000,
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			await fetch(`/api/ai/sessions/${id}`, { method: "DELETE" });
		},
		onSuccess: (_, id) => {
			queryClient.setQueryData<ChatSession[]>(["ai", "sessions"], (old = []) =>
				old.filter((s) => s.id !== id)
			);
			if (activeChatId === id) {
				setActiveChatId(null);
				router.push("/ai-assistant");
			}
		},
	});

	const visibleSessions = sessions.filter(
		(s) => s._count.messages > 0 && s.title !== "New Chat"
	);

	const filteredSessions = searchQuery.trim()
		? visibleSessions.filter((s) =>
				s.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
		  )
		: visibleSessions;

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
			{/* Header: Vercel drill-down (< AI Assistant) or Main CareerTrack logo */}
			{isAIAssistant ? (
				<SidebarHeader className="h-14 justify-center border-b px-2">
					<SidebarMenuButton
						asChild
						size="lg"
						tooltip="Back to Dashboard"
						className="hover:bg-sidebar-accent font-medium text-sidebar-foreground cursor-pointer group"
					>
						<Link href="/dashboard" className="flex items-center gap-2.5">
							<div className="flex size-7 items-center justify-center rounded-md bg-muted text-foreground shrink-0 transition-transform group-hover:-translate-x-0.5 border border-border">
								<ChevronLeft className="size-4" />
							</div>
							<div className="flex flex-col gap-0.5 leading-none min-w-0 group-data-[collapsible=icon]:hidden">
								<span className="font-bold text-sm text-foreground tracking-tight truncate">AI Assistant</span>
								<span className="text-[10px] text-muted-foreground truncate">Back to Dashboard</span>
							</div>
						</Link>
					</SidebarMenuButton>
				</SidebarHeader>
			) : (
				<SidebarHeader className="h-14 justify-center border-b px-2">
					<SidebarMenuButton asChild size="lg" className="hover:bg-transparent">
						<Link href="/dashboard" className="flex items-center gap-2.5">
							<div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs shadow-xs">
								<BriefcaseIcon className="size-4" />
							</div>
							<div className="flex flex-col gap-0.5 leading-none min-w-0 group-data-[collapsible=icon]:hidden">
								<span className="font-bold text-sm text-foreground tracking-tight">CareerTrack</span>
								<span className="text-[10px] text-muted-foreground">AI Job Search</span>
							</div>
						</Link>
					</SidebarMenuButton>
				</SidebarHeader>
			)}

			{/* Content: AI Assistant submenu OR Main NavGroups */}
			<SidebarContent className="p-1">
				{isAIAssistant ? (
					<div className="flex flex-col gap-1">
						{/* Actions / Sub-navigation */}
						<SidebarGroup className="py-1">
							<SidebarMenu>
								<SidebarMenuItem>
									<SidebarMenuButton
										isActive={!activeChatId}
										onClick={() => {
											setActiveChatId(null);
											router.push("/ai-assistant");
										}}
										tooltip="New Chat"
										className="cursor-pointer"
									>
										<SquarePen className="size-4" />
										<span>New chat</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton
										asChild
										isActive={pathname === "/interview-prep"}
										tooltip="Interview Prep"
										className="cursor-pointer"
									>
										<Link href="/interview-prep">
											<Brain className="size-4" />
											<span>Interview Prep</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton
										asChild
										isActive={pathname === "/resumes"}
										tooltip="Resumes"
										className="cursor-pointer"
									>
										<Link href="/resumes">
											<FileText className="size-4" />
											<span>Resumes</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroup>

						{/* Search chats - hidden when collapsed to icon */}
						<div className="px-2 py-1 group-data-[collapsible=icon]:hidden">
							<div className="relative flex items-center">
								<Search className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none" />
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Find chats..."
									aria-label="Find chats"
									className="w-full h-8 pl-8 pr-2.5 text-xs rounded-md bg-muted/40 border border-sidebar-border placeholder:text-muted-foreground text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all"
								/>
							</div>
						</div>

						{/* Chats list - hidden when collapsed to icon */}
						<SidebarGroup className="flex-1 min-h-0 overflow-y-auto py-1 group-data-[collapsible=icon]:hidden">
							<SidebarGroupLabel className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 px-2">
								Chats
							</SidebarGroupLabel>
							<SidebarMenu>
								{filteredSessions.length === 0 ? (
									<div className="px-3 py-2 text-xs text-muted-foreground">
										{searchQuery ? "No chats match" : "No recent chats"}
									</div>
								) : (
									filteredSessions.map((session) => {
										const isActive = session.id === activeChatId;
										return (
											<SidebarMenuItem key={session.id} className="group/chat-item relative">
												<SidebarMenuButton
													isActive={isActive}
													onClick={() => {
														setActiveChatId(session.id);
														router.push(`/ai-assistant?id=${session.id}`);
													}}
													tooltip={session.title}
													className={cn(
														"cursor-pointer pr-7 text-xs",
														isActive && "font-medium"
													)}
												>
													<MessageSquare className="size-3.5 shrink-0 opacity-70" />
													<span className="truncate">{session.title}</span>
												</SidebarMenuButton>

												{/* Delete button — shown on hover */}
												<button
													type="button"
													aria-label="Delete chat"
													onClick={(e) => {
														e.stopPropagation();
														deleteMutation.mutate(session.id);
													}}
													className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden size-5 items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors cursor-pointer group-hover/chat-item:flex"
												>
													<Trash2 className="size-3" />
												</button>
											</SidebarMenuItem>
										);
									})
								)}
							</SidebarMenu>
						</SidebarGroup>
					</div>
				) : (
					navGroups.map((group, index) => (
						<NavGroup key={`sidebar-group-${index}`} {...group} />
					))
				)}
			</SidebarContent>

			{/* Footer */}
			{isAIAssistant ? (
				<SidebarFooter className="gap-0 p-0">
					<SidebarMenu className="border-t p-2">
						<SidebarMenuItem>
							<SidebarMenuButton
								asChild
								tooltip="Configure AI"
								className="text-muted-foreground hover:text-foreground cursor-pointer"
								size="sm"
							>
								<Link href="/settings">
									<Settings className="size-4" />
									<span>Configure AI</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
					<div className="px-4 pt-2 pb-2 transition-opacity group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0">
						<p className="text-nowrap text-[9px] text-muted-foreground">
							© {new Date().getFullYear()} CareerTrack AI
						</p>
					</div>
				</SidebarFooter>
			) : (
				<SidebarFooter className="gap-0 p-0">
					<LatestChange />
					<SidebarMenu className="border-t p-2">
						{footerNavLinks.map((item) => {
							const isFooterActive = item.path ? pathname === item.path : false;
							return (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton
										asChild
										tooltip={item.title}
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
			)}
		</Sidebar>
	);
}
