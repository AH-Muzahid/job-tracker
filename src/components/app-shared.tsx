import type { ReactNode } from "react";
import {
	User,
	Settings,
	PlusCircle,
	HelpCircle,
} from "lucide-react";

// Exact SVGs matching reference screenshot
function DashboardNavIcon({ active }: { active?: boolean }) {
	return (
		<svg
			viewBox="0 0 24 24"
			className="size-3.5 shrink-0"
			fill={active ? "#0c1322" : "currentColor"}
		>
			<path d="M 5 18 L 8.5 18 L 8.5 14 C 8.5 13 9.5 12.5 11 12.5 L 11 8.5 L 12 5.5 L 13 8.5 L 13 12.5 C 14.5 12.5 15.5 13 15.5 14 L 15.5 18 L 19 18 L 19 13 C 19 11 17.5 9.5 15.5 9.5 L 13 9.5 L 13 8 L 12 4.5 L 11 8 L 11 9.5 L 8.5 9.5 C 6.5 9.5 5 11 5 13 Z" />
		</svg>
	);
}

function OpportunitiesNavIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			className="size-4 shrink-0"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M12 3 L3 7.5 V18.5 C3 19.3 3.7 20 4.5 20 H19.5 C20.3 20 21 19.3 21 18.5 V7.5 L12 3 Z" />
			<path d="M3 7.5 L12 12.5 L21 7.5" />
			<path d="M12 12.5 V20" />
		</svg>
	);
}

function ApplicationsNavIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			className="size-4 shrink-0"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<rect width="18" height="18" x="3" y="3" rx="3.5" />
			<path d="M5.5 7.5 L12 12.5 L18.5 7.5" />
		</svg>
	);
}

function InterviewsNavIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			className="size-4 shrink-0"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<rect width="18" height="18" x="3" y="3" rx="4" />
			<line x1="3" y1="9" x2="21" y2="9" />
			<line x1="12" y1="9" x2="12" y2="16" />
		</svg>
	);
}

export type SidebarNavItem = {
	title: string;
	path?: string;
	icon?: ReactNode;
	activeIcon?: ReactNode;
	isActive?: boolean;
	hasDrilldown?: boolean;
	subItems?: SidebarNavItem[];
};

export type SidebarNavGroup = {
	label?: string;
	items: SidebarNavItem[];
};

export const navGroups: SidebarNavGroup[] = [
	{
		label: undefined,
		items: [
			{
				title: "Dashboard",
				path: "/dashboard",
				icon: <DashboardNavIcon />,
				activeIcon: <DashboardNavIcon active />,
			},
			{
				title: "Opportunities",
				path: "/discovery",
				icon: <OpportunitiesNavIcon />,
			},
			{
				title: "Applications",
				path: "/applications",
				icon: <ApplicationsNavIcon />,
			},
			{
				title: "Interviews",
				path: "/interview-prep",
				icon: <InterviewsNavIcon />,
			},
		],
	},
	{
		label: "TOOLS",
		items: [
			{
				title: "Career Profile",
				path: "/profile-setup",
				icon: <User className="size-4" />,
			},
			{
				title: "Settings",
				path: "/settings",
				icon: <Settings className="size-4" />,
			},
		],
	},
];

export const footerNavLinks: SidebarNavItem[] = [
	{
		title: "New Application",
		path: "/applications/new",
		icon: <PlusCircle className="size-4" />,
	},
	{
		title: "Help & Guide",
		path: "/profile-setup",
		icon: <HelpCircle className="size-4" />,
	},
];

export const navLinks: SidebarNavItem[] = [
	...navGroups.flatMap((group) =>
		group.items.flatMap((item) =>
			item.subItems?.length ? [item, ...item.subItems] : [item]
		)
	),
	...footerNavLinks,
];
