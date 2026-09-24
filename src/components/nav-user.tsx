"use client";

import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { ChevronDown } from "lucide-react";

export function NavUser() {
	const { user } = useUser();
	const displayName = user?.fullName || user?.firstName || "Candidate";
	const avatarUrl = user?.imageUrl || "/avatars/tanvir.png";

	return (
		<div className="flex items-center gap-2.5 cursor-pointer">
			<div className="relative size-8 rounded-full overflow-hidden ring-1 ring-slate-200/80 shadow-2xs shrink-0 bg-slate-100">
				<Image
					src={avatarUrl}
					alt={displayName}
					width={32}
					height={32}
					unoptimized={avatarUrl.startsWith("http")}
					className="w-full h-full object-cover"
				/>
			</div>
			<div className="hidden sm:flex flex-col text-left leading-tight select-none">
				<span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[130px]">
					{displayName}
				</span>
				<span className="text-[11px] text-slate-500 font-normal flex items-center gap-1 mt-0.5">
					Job Seeker <ChevronDown className="size-3 text-slate-400 stroke-[2.5]" />
				</span>
			</div>
		</div>
	);
}
