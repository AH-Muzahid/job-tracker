"use client";

import Image from "next/image";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import {
	ChevronDown,
	User,
	FileText,
	Target,
	Database,
	SlidersHorizontal,
	Settings,
	LogOut,
	UserCheck,
} from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NavUser() {
	const { user } = useUser();
	const { signOut } = useClerk();
	const displayName = user?.fullName || user?.firstName || "Candidate";
	const email = user?.primaryEmailAddress?.emailAddress || "";
	const avatarUrl = user?.imageUrl || "/avatars/tanvir.png";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="flex items-center gap-2.5 cursor-pointer rounded-full p-1 hover:bg-muted/50 transition-colors group select-none outline-none border-0"
					title="Account & Workspace Tools"
					aria-label="User profile menu"
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
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56" align="end" sideOffset={8}>
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col space-y-1">
						<p className="text-xs font-semibold leading-none text-foreground truncate">{displayName}</p>
						{email && (
							<p className="text-[11px] leading-none text-muted-foreground truncate">{email}</p>
						)}
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem asChild>
						<Link href="/profile" className="flex items-center gap-2.5 cursor-pointer">
							<User className="size-4 text-muted-foreground" />
							<span>Profile & Account Hub</span>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link href="/profile-setup" className="flex items-center gap-2.5 cursor-pointer">
							<UserCheck className="size-4 text-muted-foreground" />
							<span>Career Profile</span>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link href="/resumes" className="flex items-center gap-2.5 cursor-pointer">
							<FileText className="size-4 text-muted-foreground" />
							<span>Resume Studio</span>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link href="/weekly-goals" className="flex items-center gap-2.5 cursor-pointer">
							<Target className="size-4 text-muted-foreground" />
							<span>Weekly Goals</span>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link href="/ai-memory" className="flex items-center gap-2.5 cursor-pointer">
							<Database className="size-4 text-muted-foreground" />
							<span>AI Knowledge & Memory</span>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link href="/integrations" className="flex items-center gap-2.5 cursor-pointer">
							<SlidersHorizontal className="size-4 text-muted-foreground" />
							<span>Integrations & AI Keys</span>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link href="/settings" className="flex items-center gap-2.5 cursor-pointer">
							<Settings className="size-4 text-muted-foreground" />
							<span>System Settings</span>
						</Link>
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={() => signOut({ redirectUrl: "/" })}
					className="flex items-center gap-2.5 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
				>
					<LogOut className="size-4" />
					<span>Sign Out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
