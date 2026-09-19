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
import { navGroups } from "@/components/app-shared";
import { NavGroup } from "@/components/nav-group";
import { useAI } from "@/lib/store";
import {
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
		staleTime: 0,
		refetchOnMount: true,
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
		(s) => (s._count.messages > 0 && s.title !== "New Chat") || s.id === activeChatId
	);

	const filteredSessions = searchQuery.trim()
		? visibleSessions.filter((s) =>
				s.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
		  )
		: visibleSessions;

	return (
		<Sidebar
			className={cn(
				"dark *:data-[slot=sidebar-inner]:bg-[#0c1322] *:data-[slot=sidebar-inner]:border-r *:data-[slot=sidebar-inner]:border-[#182338]",
				"**:data-[slot=sidebar-menu-button]:[&>span]:text-slate-200"
			)}
			collapsible="icon"
			variant="sidebar"
		>
			{/* Header: Vercel drill-down (< AI Assistant) or Main CareerTrack logo */}
			{isAIAssistant ? (
				<SidebarHeader className="h-16 justify-center border-b border-[#182338] px-3">
					<SidebarMenuButton
						asChild
						size="lg"
						tooltip="Back to Dashboard"
						className="hover:bg-slate-800/60 font-medium text-slate-200 cursor-pointer group"
					>
						<Link href="/dashboard" className="flex items-center gap-2.5">
							<div className="flex size-7 items-center justify-center rounded-lg bg-slate-800 text-slate-200 shrink-0 transition-transform group-hover:-translate-x-0.5 border border-slate-700">
								<ChevronLeft className="size-4" />
							</div>
							<div className="flex flex-col gap-0.5 leading-none min-w-0 group-data-[collapsible=icon]:hidden">
								<span className="font-bold text-sm text-white tracking-tight truncate">AI Assistant</span>
								<span className="text-[10px] text-slate-400 truncate">Back to Dashboard</span>
							</div>
						</Link>
					</SidebarMenuButton>
				</SidebarHeader>
			) : (
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
				<SidebarFooter className="p-3 pt-0 pb-3 border-none bg-transparent">
					{/* Your Progress Momentum Card matching mockup */}
					<div className="rounded-2xl bg-[#131c2d] ring-1 ring-[#182338] p-4 group-data-[collapsible=icon]:hidden transition-all">
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
			)}
		</Sidebar>
	);
}
