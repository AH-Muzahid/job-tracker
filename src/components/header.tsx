"use client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { useScroll } from "@/hooks/use-scroll";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/mobile-nav";
import { SignInModal } from "@/components/sign-in-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@clerk/nextjs";

export const navLinks = [
	{
		label: "Features",
		href: "#features",
	},
	{
		label: "Testimonials",
		href: "#testimonials",
	},
	{
		label: "FAQs",
		href: "#faqs",
	},
];

export function Header() {
	const scrolled = useScroll(10);
	const { isSignedIn } = useAuth();
	const [signInOpen, setSignInOpen] = useState(false);

	return (
		<>
			<header
				className={cn(
					"sticky top-0 z-50 mx-auto w-full max-w-4xl border-transparent border-b md:my-2 md:rounded-md md:border md:transition-all md:ease-out",
					{
						"border-border bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/50 md:top-2 md:max-w-3xl md:shadow":
							scrolled,
					}
				)}
			>
				<nav
					className={cn(
						"flex h-14 w-full items-center justify-between px-4 md:h-12 md:transition-all md:ease-out",
						{
							"md:px-2": scrolled,
						}
					)}
				>
					<Link
						className="rounded-md p-2 hover:bg-muted dark:hover:bg-muted/50"
						href="/"
					>
						<Logo />
					</Link>
					<div className="hidden items-center gap-2 md:flex">
						<div>
							{navLinks.map((link) => (
								<Button asChild key={link.label} size="sm" variant="ghost">
									<a href={link.href}>{link.label}</a>
								</Button>
							))}
						</div>
						<ThemeToggle />
						{isSignedIn ? (
							<Button size="sm" asChild>
								<Link href="/dashboard">Dashboard</Link>
							</Button>
						) : (
							<Button size="sm" variant="outline" onClick={() => setSignInOpen(true)}>
								Sign In
							</Button>
						)}
					</div>
					<div className="flex items-center gap-2 md:hidden">
						<ThemeToggle />
						<MobileNav onSignIn={() => setSignInOpen(true)} />
					</div>
				</nav>
			</header>
			<SignInModal open={signInOpen} onOpenChange={setSignInOpen} />
		</>
	);
}
