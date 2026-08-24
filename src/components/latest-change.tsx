"use client";

import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";

const STORAGE_KEY = "career-track-promo-seen-v1";

const latestChange = {
	badge: "AI FEATURE",
	title: "Smart JD Intake & Match",
	description: "Analyze job fit in seconds.",
	readMore: { href: "/ai-assistant", label: "Try AI Assistant" },
} as const;

export function LatestChange() {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [mounted, setMounted] = useState<boolean>(false);

	useEffect(() => {
		setMounted(true);
		const hasSeen = localStorage.getItem(STORAGE_KEY);
		if (!hasSeen) {
			setIsOpen(true);
		}
	}, []);

	const handleDismiss = () => {
		setIsOpen(false);
		localStorage.setItem(STORAGE_KEY, "true");
	};

	if (!mounted || !isOpen) {
		return null;
	}

	return (
		<div
			className={cn(
				"group/latest-change size-full min-h-27 justify-center border-t border-sidebar-border/60",
				"relative flex size-full flex-col gap-1 overflow-hidden px-4 pt-3 pb-1 *:text-nowrap",
				"transition-opacity group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0"
			)}
		>
			<span className="font-light font-mono text-[10px] text-muted-foreground tracking-wider uppercase">
				{latestChange.badge}
			</span>
			<p className="font-medium text-xs text-sidebar-foreground">{latestChange.title}</p>
			<span className="text-[10px] text-muted-foreground">
				{latestChange.description}
			</span>
			<Button
				asChild
				className="w-max px-0 font-light text-xs text-sidebar-foreground hover:underline"
				size="sm"
				variant="link"
				onClick={handleDismiss}
			>
				<Link href={latestChange.readMore.href}>{latestChange.readMore.label}</Link>
			</Button>
			<Button
				className="absolute top-2 right-2 z-10 size-6 rounded-full opacity-60 hover:opacity-100 transition-opacity"
				onClick={handleDismiss}
				size="icon-sm"
				variant="ghost"
				title="Dismiss notice"
			>
				<XIcon className="size-3.5 text-muted-foreground" />
			</Button>
		</div>
	);
}
