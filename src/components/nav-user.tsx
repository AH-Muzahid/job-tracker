"use client";

import Image from "next/image";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { ChevronDown } from "lucide-react";

export function NavUser() {
	const { user } = useUser();
	const displayName = user?.fullName || user?.firstName || "Candidate";
	const avatarUrl = user?.imageUrl || "/avatars/tanvir.png";

	return (
		<Link
			href="/profile"
			className="flex items-center gap-2.5 cursor-pointer rounded-full p-1 hover:bg-muted/50 transition-colors group select-none"
			title="View Profile & Account Hub"
		>
			<div className="relative size-8 rounded-full overflow-hidden ring-1 ring-border shadow-2xs shrink-0 bg-muted">
				<Image
					src={avatarUrl}
					alt={displayName}
					width={32}
					height={32}
					unoptimized={avatarUrl.startsWith("http")}
					className="w-full h-full object-cover"
				/>
			</div>
			<div className="hidden sm:flex flex-col text-left leading-tight">
				<span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-[130px]">
					{displayName}
				</span>
				<span className="text-[11px] text-muted-foreground font-normal flex items-center gap-1 mt-0.5">
					Job Seeker <ChevronDown className="size-3 text-muted-foreground stroke-[2.5]" />
				</span>
			</div>
		</Link>
	);
}
