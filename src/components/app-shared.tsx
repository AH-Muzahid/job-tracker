import type { ReactNode } from "react";
import {
	User,
	Settings,
	PlusCircle,
	HelpCircle,
	Home,
	Compass,
	Briefcase,
	CalendarDays,
	FileText,
	Target,
	Database,
	Layers,
	SlidersHorizontal,
	TrendingUp,
} from "lucide-react";

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
				icon: <Home className="size-4" />,
			},
			{
				title: "Discovery",
				path: "/discovery",
				icon: <Compass className="size-4" />,
			},
			{
				title: "Applications",
				path: "/applications",
				icon: <Briefcase className="size-4" />,
			},
			{
				title: "Interviews",
				path: "/interview-prep",
				icon: <CalendarDays className="size-4" />,
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
				title: "Resume Studio",
				path: "/resumes",
				icon: <FileText className="size-4" />,
			},
			{
				title: "Weekly Goals",
				path: "/weekly-goals",
				icon: <Target className="size-4" />,
			},
			{
				title: "AI Memory",
				path: "/ai-memory",
				icon: <Database className="size-4" />,
			},
			{
				title: "Career Brain",
				path: "/brain",
				icon: <Layers className="size-4" />,
			},
			{
				title: "Upskill & Roadmap",
				path: "/upskill",
				icon: <TrendingUp className="size-4" />,
			},
			{
				title: "Integrations",
				path: "/integrations",
				icon: <SlidersHorizontal className="size-4" />,
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
