"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import {
  LayoutDashboard, Briefcase, Building2,
  Brain, FileText, CalendarDays,
  PanelLeftClose, PanelLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/applications", label: "Applications", icon: Briefcase },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/interview-prep", label: "Prep", icon: Brain },
  { href: "/resumes", label: "Resumes", icon: FileText },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const { isSignedIn } = useUser()

  if (!isSignedIn) return null

  const renderNav = (isMobile: boolean) => {
    const isCollapsed = isMobile ? false : collapsed
    return (
      <>
        <div className={cn("flex h-14 items-center border-b px-3", isCollapsed ? "justify-center" : "justify-between")}>
          <Link href="/dashboard" className="flex items-center gap-2.5 group" onClick={onMobileClose}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm transition-transform group-hover:scale-105">C</div>
            {!isCollapsed && <span className="text-base font-bold tracking-tight">CareerTrack</span>}
          </Link>
          <div className="hidden lg:block">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggle}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                >
                  {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right" sideOffset={8}>Expand</TooltipContent>}
            </Tooltip>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-3">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const link = (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all",
                  isActive ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && item.label}
              </Link>
            )

            if (isCollapsed && !isMobile) {
              return (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>{item.label}</TooltipContent>
                </Tooltip>
              )
            }
            return link
          })}
        </nav>
      </>
    )
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col border-r bg-background transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-56"
      )}>
        <div className="flex h-full flex-col">
          {renderNav(false)}
        </div>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 lg:hidden"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(4px)" }}
            onClick={onMobileClose}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r bg-background shadow-xl lg:hidden animate-in slide-in-from-left duration-200">
            {renderNav(true)}
          </aside>
        </>
      )}
    </>
  )
}
