"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DecorIcon } from "@/components/decor-icon";
import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { navLinks } from "@/components/app-shared";
import { CustomSidebarTrigger } from "@/components/custom-sidebar-trigger";
import { NavUser } from "@/components/nav-user";
import { SearchIcon, SunIcon, MoonIcon, BellIcon, Bot } from "lucide-react";
import { useUI } from "@/lib/store";
import Link from "next/link";

export function AppHeader() {
	const pathname = usePathname();
	const dark = useUI((s) => s.dark);
	const toggleTheme = useUI((s) => s.toggleTheme);
	const setSearchOpen = useUI((s) => s.setSearchOpen);

	const activeItem = navLinks.find(
		(item) => item.path && (pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path)))
	) || {
		title: pathname.split("/").filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" / ") || "Dashboard",
	};

	return (
		<header
			className={cn(
				"sticky top-0 z-50 flex h-14 w-full shrink-0 items-center justify-between gap-2 border-b border-border px-3 sm:px-4 md:px-6",
				"bg-background/90 backdrop-blur-md supports-backdrop-filter:bg-background/70"
			)}
		>
			<DecorIcon className="hidden md:block" position="bottom-left" />
			<div className="flex items-center gap-2 sm:gap-3 min-w-0">
				<CustomSidebarTrigger />
				<Separator
					className="mr-1 sm:mr-2 h-4 data-[orientation=vertical]:self-center shrink-0"
					orientation="vertical"
				/>
				<div className="min-w-0 truncate">
					<AppBreadcrumbs page={activeItem} />
				</div>
			</div>
			<div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
				<button
					onClick={() => setSearchOpen(true)}
					className="hidden md:flex items-center gap-2 h-8 rounded-md border bg-muted/40 px-2.5 text-xs text-muted-foreground hover:bg-muted/70 transition-colors w-44 lg:w-56 cursor-pointer"
				>
					<SearchIcon className="h-3.5 w-3.5 shrink-0" />
					<span className="truncate">Search commands...</span>
					<kbd className="ml-auto pointer-events-none inline-flex h-4.5 select-none items-center gap-0.5 rounded border bg-background px-1 font-mono text-[9px] font-medium text-muted-foreground">
						⌘K
					</kbd>
				</button>

				{/* Mobile Search Icon Trigger */}
				<Button
					aria-label="Search"
					className="md:hidden size-8 cursor-pointer"
					onClick={() => setSearchOpen(true)}
					size="icon"
					variant="ghost"
				>
					<SearchIcon className="size-4" />
				</Button>

				<Button
					asChild
					className="hidden sm:inline-flex text-xs h-8 gap-1.5 bg-muted/40 border border-border text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
					size="sm"
					variant="ghost"
				>
					<Link href="/ai-assistant">
						<Bot className="size-3.5" />
						<span>Ask AI</span>
					</Link>
				</Button>

				<Button
					aria-label="Toggle theme"
					className="size-8 cursor-pointer"
					onClick={toggleTheme}
					size="icon"
					variant="ghost"
				>
					{dark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
				</Button>

				<Button
					aria-label="Notifications"
					className="size-8 cursor-pointer relative"
					size="icon"
					variant="ghost"
				>
					<BellIcon className="size-4" />
					<span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-success" />
				</Button>

				<Separator
					className="h-4 data-[orientation=vertical]:self-center"
					orientation="vertical"
				/>
				<NavUser />
			</div>
		</header>
	);
}

