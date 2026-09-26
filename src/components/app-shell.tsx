"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import CommandPalette from "@/components/CommandPalette";
import GlobalAISidebar from "@/components/ai/GlobalAISidebar";
import { UniversalJDEvaluatorModal } from "@/components/discovery/UniversalJDEvaluatorModal";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { useUI } from "@/lib/store";

export function AppShell({ children }: { children: React.ReactNode }) {
	const initTheme = useUI((s) => s.initTheme);
	const pathname = usePathname();
	const isFullscreen = pathname.startsWith("/ai-assistant");

	useEffect(() => {
		initTheme();
	}, [initTheme]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
				e.preventDefault();
				const current = useUI.getState().aiSidebarOpen;
				useUI.getState().setAiSidebarOpen(!current);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	return (
		<SidebarProvider className={cn("[--app-wrapper-max-width:86rem]")}>
			<div className="hidden md:contents">
				<AppSidebar />
			</div>
			<SidebarInset className="min-w-0 max-w-full flex flex-col bg-background">
				<AppHeader />
				<div
					className={cn(
						"flex flex-1 flex-col min-w-0 max-w-full",
						isFullscreen ? "p-0" : "px-3 sm:px-5 lg:px-6 py-3.5 sm:py-5 pb-20 md:pb-5",
						"mx-auto w-full max-w-(--app-wrapper-max-width)"
					)}
				>
					{children}
				</div>
				{!isFullscreen && <MobileBottomNav />}
			</SidebarInset>
			{!isFullscreen && <GlobalAISidebar />}
			<CommandPalette />
			<UniversalJDEvaluatorModal />
		</SidebarProvider>
	);
}
