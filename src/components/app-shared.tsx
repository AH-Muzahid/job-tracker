import type { ReactNode } from "react";
import {
	LayoutGridIcon,
	BriefcaseIcon,
	Building2Icon,
	TargetIcon,
	CalendarDaysIcon,
	BotIcon,
	BrainIcon,
	FileTextIcon,
	UserCircle2Icon,
	SettingsIcon,
	PlusCircleIcon,
	HelpCircleIcon,
} from "lucide-react";

export type SidebarNavItem = {
	title: string;
	path?: string;
	icon?: ReactNode;
	isActive?: boolean;
	subItems?: SidebarNavItem[];
};

export type SidebarNavGroup = {
	label?: string;
	items: SidebarNavItem[];
};

export const navGroups: SidebarNavGroup[] = [
	{
		label: "Core Pipeline",
		items: [
			{
				title: "Dashboard",
				path: "/dashboard",
				icon: <LayoutGridIcon className="size-4" />,
			},
			{
				title: "Applications",
				path: "/applications",
				icon: <BriefcaseIcon className="size-4" />,
			},
			{
				title: "Companies",
				path: "/companies",
				icon: <Building2Icon className="size-4" />,
			},
			{
				title: "Weekly Goals",
				path: "/weekly-goals",
				icon: <TargetIcon className="size-4" />,
			},
			{
				title: "Calendar",
				path: "/calendar",
				icon: <CalendarDaysIcon className="size-4" />,
			},
		],
	},
	{
		label: "AI & Preparation",
		items: [
			{
				title: "AI Assistant",
				path: "/ai-assistant",
				icon: <BotIcon className="size-4" />,
			},
			{
				title: "Interview Prep",
				path: "/interview-prep",
				icon: <BrainIcon className="size-4" />,
			},
			{
				title: "Resumes",
				path: "/resumes",
				icon: <FileTextIcon className="size-4" />,
			},
		],
	},
	{
		label: "Account",
		items: [
			{
				title: "Profile Setup",
				path: "/profile-setup",
				icon: <UserCircle2Icon className="size-4" />,
			},
			{
				title: "Settings",
				path: "/settings",
				icon: <SettingsIcon className="size-4" />,
			},
		],
	},
];

export const footerNavLinks: SidebarNavItem[] = [
	{
		title: "New Application",
		path: "/applications/new",
		icon: <PlusCircleIcon className="size-4" />,
	},
	{
		title: "Help & Guide",
		path: "/profile-setup",
		icon: <HelpCircleIcon className="size-4" />,
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

