"use client";

import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserIcon, SettingsIcon, BotIcon, LogOutIcon } from "lucide-react";

export function NavUser() {
	const { user, isLoaded } = useUser();
	const { signOut } = useClerk();

	if (!isLoaded || !user) {
		return (
			<div className="size-8 rounded-full bg-muted animate-pulse" />
		);
	}

	const name = user.fullName || user.username || "Job Seeker";
	const email = user.primaryEmailAddress?.emailAddress || "";
	const avatar = user.imageUrl || "";
	const initials = (name.charAt(0) || "U").toUpperCase();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer">
					<Avatar className="size-8">
						<AvatarImage alt={name} src={avatar} />
						<AvatarFallback>{initials}</AvatarFallback>
					</Avatar>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-60">
				<div className="flex items-center gap-3 p-2">
					<Avatar className="size-10">
						<AvatarImage alt={name} src={avatar} />
						<AvatarFallback>{initials}</AvatarFallback>
					</Avatar>
					<div className="min-w-0 flex-1">
						<span className="font-medium text-foreground text-sm block truncate">{name}</span>
						<div className="text-muted-foreground text-xs truncate">
							{email}
						</div>
					</div>
				</div>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem asChild className="cursor-pointer">
						<Link href="/profile-setup">
							<UserIcon className="size-4 mr-2" />
							Profile Setup
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild className="cursor-pointer">
						<Link href="/ai-assistant">
							<BotIcon className="size-4 mr-2" />
							AI Career Agent
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild className="cursor-pointer">
						<Link href="/settings">
							<SettingsIcon className="size-4 mr-2" />
							Settings
						</Link>
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem
						className="w-full cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
						onClick={() => signOut({ redirectUrl: "/sign-in" })}
					>
						<LogOutIcon className="size-4 mr-2" />
						Log out
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

