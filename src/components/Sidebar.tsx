"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import {
  LayoutDashboard, Briefcase, Building2,
  Brain, FileText, CalendarDays, Bot, UserCircle2, Settings,
  PanelLeftClose, PanelLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useUI } from "@/lib/store"
import { useEffect } from "react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/applications", label: "Applications", icon: Briefcase },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/interview-prep", label: "Prep", icon: Brain },
  { href: "/ai-assistant", label: "AI Assistant", icon: Bot },
  { href: "/resumes", label: "Resumes", icon: FileText },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/profile-setup", label: "Profile", icon: UserCircle2 },
  { href: "/settings", label: "Settings", icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { isSignedIn } = useUser()
  const collapsed = useUI((s) => s.collapsed)
  const mobileOpen = useUI((s) => s.mobileOpen)
  const toggleCollapsed = useUI((s) => s.toggleCollapsed)
  const setMobileOpen = useUI((s) => s.setMobileOpen)

  useEffect(() => { setMobileOpen(false) }, [pathname, setMobileOpen])

  if (!isSignedIn) return null

  const renderNav = (isMobile: boolean) => {
    const isCollapsed = isMobile ? false : collapsed
    return (
      <>
        <div className={cn("flex h-14 items-center border-b border-border/50 px-3 group/header", isCollapsed ? "justify-center" : "justify-between")}>
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm transition-transform hover:scale-105 shadow-xs">C</div>
            {!isCollapsed && <span className="text-sm font-bold tracking-tight text-foreground font-sans">CareerTrack</span>}
          </Link>
          <div className="hidden lg:block opacity-0 group-hover/header:opacity-100 transition-opacity">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleCollapsed}
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                >
                  {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right" sideOffset={8}>Expand Sidebar</TooltipContent>}
            </Tooltip>
          </div>
        </div>

        <nav aria-label="Main Navigation" className="flex-1 space-y-1 px-2 py-3">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const link = (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-all relative group",
                  isActive
                    ? "text-primary bg-primary/10 font-bold border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                {!isCollapsed && <span>{item.label}</span>}
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
      <aside
        role="navigation"
        aria-label="Desktop Main Sidebar"
        className={cn(
          "hidden lg:flex flex-col border-r border-border/50 bg-card/40 backdrop-blur-xl transition-all duration-300 shrink-0",
          collapsed ? "w-16" : "w-56"
        )}
      >
        <div className="flex h-full flex-col">{renderNav(false)}</div>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 lg:hidden"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(4px)" }}
            onClick={() => setMobileOpen(false)}
          />
          <aside
            role="navigation"
            aria-label="Mobile Main Sidebar"
            className="fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-border/50 bg-background shadow-xl lg:hidden animate-in slide-in-from-left duration-200"
          >
            {renderNav(true)}
          </aside>
        </>
      )}
    </>
  )
}
