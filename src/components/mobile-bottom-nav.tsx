"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Compass, FileText, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutGrid,
    isActive: (pathname) => pathname === "/dashboard" || pathname === "/",
  },
  {
    label: "Opportunities",
    href: "/discovery",
    icon: Compass,
    isActive: (pathname) => pathname.startsWith("/discovery"),
  },
  {
    label: "Applications",
    href: "/applications",
    icon: FileText,
    isActive: (pathname) => pathname.startsWith("/applications"),
  },
  {
    label: "Interviews",
    href: "/interview-prep",
    icon: Calendar,
    isActive: (pathname) => pathname.startsWith("/interview-prep") || pathname.startsWith("/calendar"),
  },
  {
    label: "Profile",
    href: "/settings",
    icon: User,
    isActive: (pathname) => pathname.startsWith("/settings") || pathname.startsWith("/profile"),
  },
];

export function MobileBottomNav() {
  const pathname = usePathname() || "";

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-border bg-background/95 backdrop-blur-md px-1 flex items-center justify-around pb-safe"
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = item.isActive(pathname);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full min-w-0 transition-colors py-1 cursor-pointer select-none",
              active
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground font-normal"
            )}
            aria-current={active ? "page" : undefined}
          >
            <div
              className={cn(
                "flex items-center justify-center size-7 rounded-sm transition-colors",
                active && "bg-primary/10"
              )}
            >
              <Icon
                className={cn(
                  "size-4.5 stroke-[1.85]",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              />
            </div>
            <span
              className={cn(
                "text-[10px] tracking-tight truncate mt-0.5",
                active ? "text-primary font-medium" : "text-muted-foreground"
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
