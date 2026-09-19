"use client";

import { cn } from "@/lib/utils";
import { CustomSidebarTrigger } from "@/components/custom-sidebar-trigger";
import { NavUser } from "@/components/nav-user";
import { SearchIcon } from "lucide-react";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useUI } from "@/lib/store";

export function AppHeader() {
	const setSearchOpen = useUI((s) => s.setSearchOpen);

	return (
		<header
			className={cn(
				"sticky top-0 z-40 flex h-14 sm:h-15 w-full shrink-0 items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 px-4 sm:px-6",
				"bg-white/95 dark:bg-slate-900/90 backdrop-blur-md"
			)}
		>
			<div className="flex items-center gap-3 min-w-0">
				{/* Mobile Sidebar Trigger */}
				<div className="md:hidden">
					<CustomSidebarTrigger />
				</div>

				{/* Rounded Pill Search Bar matching reference screenshot */}
				<button
					onClick={() => setSearchOpen(true)}
					className="flex items-center gap-2.5 h-9.5 sm:h-10 rounded-full border border-slate-200/70 dark:border-slate-800 bg-[#f1f5f9]/80 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 px-4 text-xs text-slate-400 transition-colors w-64 sm:w-80 md:w-[380px] cursor-pointer shadow-2xs"
				>
					<SearchIcon className="h-4 w-4 text-slate-400 shrink-0 stroke-[2]" />
					<span className="truncate text-slate-400 font-normal">Search jobs, companies, or anything...</span>
					<kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded-md border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 font-sans text-[10px] font-medium text-slate-500 shadow-2xs">
						⌘ K
					</kbd>
				</button>
			</div>

			{/* Right side: Notification Bell + User Profile */}
			<div className="flex items-center gap-4 shrink-0">
				<NotificationCenter />
				<NavUser />
			</div>
		</header>
	);
}
