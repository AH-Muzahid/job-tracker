"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import CommandPalette from "@/components/CommandPalette";
import GlobalAISidebar from "@/components/ai/GlobalAISidebar";
import { useUI } from "@/lib/store";

export function AppShell({ children }: { children: React.ReactNode }) {
	const initTheme = useUI((s) => s.initTheme);
	const pathname = usePathname();
	const isFullscreen = pathname.startsWith("/ai-assistant");

	useEffect(() => {
		initTheme();
	}, [initTheme]);

	return (
		<SidebarProvider className={cn("[--app-wrapper-max-width:86rem]")}>
			<AppSidebar />
			<SidebarInset className="min-w-0 max-w-full flex flex-col">
				<AppHeader />
				<div
					className={cn(
						"flex flex-1 flex-col min-w-0 max-w-full",
						isFullscreen ? "p-0" : "p-2.5 sm:p-4 md:p-6",
						"mx-auto w-full max-w-(--app-wrapper-max-width)"
					)}
				>
					{children}
				</div>
			</SidebarInset>
			{!isFullscreen && <GlobalAISidebar />}
			<CommandPalette />
		</SidebarProvider>
	);
}
