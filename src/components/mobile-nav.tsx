import { cn } from "@/lib/utils";
import React from "react";
import { Button } from "@/components/ui/button";
import { Portal, PortalBackdrop } from "@/components/portal";
import { navLinks } from "@/components/header";
import { XIcon, MenuIcon } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

interface MobileNavProps {
	onSignIn?: () => void;
}

export function MobileNav({ onSignIn }: MobileNavProps) {
	const [open, setOpen] = React.useState(false);
	const { isSignedIn } = useAuth();

	const close = () => setOpen(false);

	const handleSignIn = () => {
		close();
		onSignIn?.();
	};

	React.useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") close();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [open]);

	return (
		<div className="md:hidden">
			<Button
				aria-controls="mobile-menu"
				aria-expanded={open}
				aria-label="Toggle menu"
				className="md:hidden"
				onClick={() => setOpen(!open)}
				size="icon"
				variant="outline"
			>
				{open ? (
					<XIcon className="size-4.5" />
				) : (
					<MenuIcon className="size-4.5" />
				)}
			</Button>
			{open && (
				<Portal className="top-14" id="mobile-menu">
					<PortalBackdrop onClick={close} />
					<div
						className={cn(
							"data-[slot=open]:zoom-in-97 ease-out data-[slot=open]:animate-in",
							"size-full p-4"
						)}
						data-slot={open ? "open" : "closed"}
					>
						<div className="grid gap-y-2">
							{navLinks.map((link) => (
								<Button
									asChild
									className="justify-start"
									key={link.label}
									variant="ghost"
									onClick={close}
								>
									<a href={link.href}>{link.label}</a>
								</Button>
							))}
						</div>
						<div className="mt-12">
							{isSignedIn ? (
								<Button className="w-full" asChild onClick={close}>
									<Link href="/dashboard">Dashboard</Link>
								</Button>
							) : (
								<Button className="w-full" variant="outline" onClick={handleSignIn}>
									Sign In
								</Button>
							)}
						</div>
					</div>
				</Portal>
			)}
		</div>
	);
}
