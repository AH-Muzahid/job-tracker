import type React from "react";

export const LogoIcon = (props: React.ComponentProps<"svg">) => (
	<svg fill="none" viewBox="0 0 32 32" {...props}>
		<rect width="32" height="32" rx="8" fill="currentColor" className="text-foreground" />
		<path
			d="M9 12.5C9 11.1193 10.1193 10 11.5 10H13.5C14.8807 10 16 11.1193 16 12.5V14H9V12.5Z"
			className="fill-background"
		/>
		<path
			d="M16 14V12.5C16 11.1193 17.1193 10 18.5 10H20.5C21.8807 10 23 11.1193 23 12.5V14H16Z"
			className="fill-background/70"
		/>
		<path
			d="M8 15.5H24V21C24 22.1046 23.1046 23 22 23H10C8.89543 23 8 22.1046 8 21V15.5Z"
			className="fill-background"
		/>
		<circle cx="16" cy="19" r="1.5" className="fill-foreground" />
	</svg>
);

export const Logo = (props: React.ComponentProps<"span">) => (
	<span
		className="inline-flex items-center gap-2"
		{...props}
	>
		<svg fill="none" viewBox="0 0 32 32" className="h-6 w-6">
			<rect width="32" height="32" rx="8" className="fill-foreground" />
			<path
				d="M9 12.5C9 11.1193 10.1193 10 11.5 10H13.5C14.8807 10 16 11.1193 16 12.5V14H9V12.5Z"
				className="fill-background"
			/>
			<path
				d="M16 14V12.5C16 11.1193 17.1193 10 18.5 10H20.5C21.8807 10 23 11.1193 23 12.5V14H16Z"
				className="fill-background/70"
			/>
			<path
				d="M8 15.5H24V21C24 22.1046 23.1046 23 22 23H10C8.89543 23 8 22.1046 8 21V15.5Z"
				className="fill-background"
			/>
			<circle cx="16" cy="19" r="1.5" className="fill-foreground" />
		</svg>
		<span className="text-lg font-bold tracking-tight text-foreground">
			Career<span className="font-extrabold">Track</span>
		</span>
	</span>
);
