"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton, useUser } from "@clerk/nextjs"
import {
  Moon, Sun, LayoutDashboard, Briefcase, Building2,
  Brain, FileText, CalendarDays, Settings,
  PanelLeftClose, PanelLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useEffect, useState } from "react"

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
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const isDark = stored ? stored === "dark" : prefersDark
    setDark(isDark)
    document.documentElement.classList.toggle("dark", isDark)
  }, [])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("theme", next ? "dark" : "light")
  }

  useEffect(() => { onMobileClose() }, [pathname, onMobileClose])

  if (!isSignedIn) return null

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-14 items-center border-b px-3", collapsed ? "justify-center" : "gap-2.5")}>
        <Link href="/dashboard" className="flex items-center gap-2.5 group" onClick={onMobileClose}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm transition-transform group-hover:scale-105">C</div>
          {!collapsed && <span className="text-base font-bold tracking-tight">CareerTrack</span>}
        </Link>
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
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          )

          if (collapsed) {
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

      <div className="border-t px-2 py-3 space-y-1">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={toggleTheme}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all",
                collapsed && "justify-center px-2"
              )}
            >
              {dark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
              {!collapsed && (dark ? "Light Mode" : "Dark Mode")}
            </button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right" sideOffset={8}>{dark ? "Light Mode" : "Dark Mode"}</TooltipContent>}
        </Tooltip>

        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              href="/settings"
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all",
                pathname === "/settings" ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                collapsed && "justify-center px-2"
              )}
            >
              <Settings className="h-4 w-4 shrink-0" />
              {!collapsed && "Settings"}
            </Link>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right" sideOffset={8}>Settings</TooltipContent>}
        </Tooltip>

        <div className={cn("flex items-center gap-2.5 px-2.5 py-2", collapsed && "justify-center px-2")}>
          <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
          {!collapsed && <span className="text-xs text-muted-foreground truncate">Account</span>}
        </div>
      </div>

      <div className="border-t px-2 py-2 hidden lg:block">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={onToggle}
              className="flex w-full items-center justify-center rounded-lg px-2 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            >
              {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right" sideOffset={8}>Expand</TooltipContent>}
        </Tooltip>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col border-r bg-background transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-56"
      )}>
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={onMobileClose} />
          <aside className="fixed inset-y-0 left-0 z-50 w-56 border-r bg-background shadow-xl lg:hidden animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
