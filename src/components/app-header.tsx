"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { CustomSidebarTrigger } from "@/components/custom-sidebar-trigger";
import { NavUser } from "@/components/nav-user";
import { SearchIcon, Zap, Bot } from "lucide-react";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useUI } from "@/lib/store";

export function AppHeader() {
	const setSearchOpen = useUI((s) => s.setSearchOpen);
	const setEvaluatorModal = useUI((s) => s.setEvaluatorModal);
	const aiSidebarOpen = useUI((s) => s.aiSidebarOpen);
	const setAiSidebarOpen = useUI((s) => s.setAiSidebarOpen);

	return (
		<header
			className={cn(
				"sticky top-0 z-40 flex h-14 sm:h-15 w-full shrink-0 items-center justify-between gap-3 border-b border-border px-3.5 sm:px-6",
				"bg-background/95 backdrop-blur-md"
			)}
		>
			{/* Mobile View Navbar (< md): CareerTrack Brand Mark matching prototype Screen 1 */}
			<div className="flex items-center gap-2 md:hidden">
				<Link
					href="/dashboard"
					className="flex items-center gap-2 font-bold text-sm text-foreground select-none"
					aria-label="CareerTrack Home"
				>
					<div className="flex size-7 items-center justify-center rounded-[6px] bg-primary text-primary-foreground font-mono font-bold text-xs shadow-2xs">
						CT
					</div>
					<span className="font-semibold text-sm sm:text-base tracking-tight text-foreground">
						CareerTrack
					</span>
				</Link>
			</div>

			{/* Desktop View Navbar (>= md): Sidebar Trigger + Search Bar + Quick Evaluator + Copilot */}
			<div className="hidden md:flex items-center gap-3 min-w-0 flex-1">
				{/* Desktop Sidebar Trigger */}
				<div className="shrink-0">
					<CustomSidebarTrigger />
				</div>

				{/* Desktop Search Bar */}
				<button
					onClick={() => setSearchOpen(true)}
					className="flex items-center gap-2.5 h-9.5 sm:h-10 rounded-full border border-border bg-muted/40 hover:bg-muted/70 px-4 text-xs text-muted-foreground transition-colors w-64 sm:w-80 md:w-[380px] cursor-pointer shadow-2xs"
					aria-label="Search jobs, companies, or anything"
				>
					<SearchIcon className="h-4 w-4 text-muted-foreground shrink-0 stroke-[2]" />
					<span className="truncate text-muted-foreground font-normal">
						Search jobs, companies, or anything...
					</span>
					<kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded-md border border-border bg-background px-1.5 font-sans text-[10px] font-medium text-muted-foreground shadow-2xs">
						⌘ K
					</kbd>
				</button>

				{/* Universal Evaluator Quick Intake Pill */}
				<button
					onClick={() => setEvaluatorModal(true)}
					className="hidden lg:flex items-center gap-1.5 h-9.5 sm:h-10 rounded-full border border-border bg-background hover:bg-muted px-3.5 text-xs font-medium text-foreground transition-colors cursor-pointer shadow-2xs"
					title="Evaluate external job posting or paste JD"
				>
					<Zap className="h-3.5 w-3.5 text-primary" />
					<span>Evaluate Job</span>
				</button>

				{/* Ambient Copilot Trigger Pill (CAG-11) */}
				<button
					onClick={() => setAiSidebarOpen(!aiSidebarOpen)}
					className="flex items-center gap-1.5 h-9.5 sm:h-10 rounded-full border border-border bg-background hover:bg-muted px-3 text-xs font-medium text-foreground transition-colors cursor-pointer shadow-2xs"
					title="Open Career Copilot (⌘J / Ctrl+J)"
				>
					<Bot className="h-3.5 w-3.5 text-primary" />
					<span>Copilot</span>
					<kbd className="ml-1 pointer-events-none inline-flex h-4 select-none items-center rounded border border-border px-1 font-sans text-[10px] text-muted-foreground">
						⌘J
					</kbd>
				</button>
			</div>

			{/* Right side: On Mobile (< md): Search + Copilot + Notification Bell + User Profile */}
			<div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
				{/* Mobile Search Button */}
				<button
					onClick={() => setSearchOpen(true)}
					className="md:hidden flex size-8 sm:size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shadow-2xs"
					title="Search"
					aria-label="Search"
				>
					<SearchIcon className="size-4" />
				</button>

				{/* Mobile Copilot Trigger Icon */}
				<button
					onClick={() => setAiSidebarOpen(!aiSidebarOpen)}
					className="md:hidden flex size-8 sm:size-9 items-center justify-center rounded-full border border-border bg-background text-foreground hover:bg-muted transition-colors cursor-pointer shadow-2xs"
					title="Open Career Copilot"
					aria-label="Open Career Copilot"
				>
					<Bot className="size-4 text-primary" />
				</button>

				<NotificationCenter />
				<NavUser />
			</div>
		</header>
	);
}
