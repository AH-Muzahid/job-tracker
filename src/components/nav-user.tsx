"use client";

import { UserButton } from "@clerk/nextjs";
import { User, Settings, Bot } from "lucide-react";

export function NavUser() {
	return (
		<div className="flex items-center">
			<UserButton
				appearance={{
					elements: {
						avatarBox: "size-8 ring-1 ring-border",
						userButtonTrigger: "focus:shadow-none focus:outline-none cursor-pointer",
					},
				}}
			>
				<UserButton.MenuItems>
					<UserButton.Link
						label="Profile Setup"
						labelIcon={<User className="size-4" />}
						href="/profile-setup"
					/>
					<UserButton.Link
						label="AI Assistant"
						labelIcon={<Bot className="size-4" />}
						href="/ai-assistant"
					/>
					<UserButton.Link
						label="Settings"
						labelIcon={<Settings className="size-4" />}
						href="/settings"
					/>
				</UserButton.MenuItems>
			</UserButton>
		</div>
	);
}
