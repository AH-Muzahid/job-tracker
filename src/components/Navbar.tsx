"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton, useUser } from "@clerk/nextjs"
import {
  Moon, Sun, LayoutDashboard, Briefcase, Building2,
  Brain, FileText, CalendarDays, Settings, Menu, X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/applications", label: "Applications", icon: Briefcase },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/analytics", label: "Analytics", icon: LayoutDashboard },
  { href: "/interview-prep", label: "Prep", icon: Brain },
  { href: "/resumes", label: "Resumes", icon: FileText },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
]

export default function Navbar() {
  const pathname = usePathname()
  const { isSignedIn } = useUser()
  const [dark, setDark] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

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

  useEffect(() => { setMobileOpen(false) }, [pathname])

  if (!isSignedIn) return null

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm transition-transform group-hover:scale-105">
            C
          </div>
          <span className="text-base font-bold tracking-tight hidden sm:inline">CareerTrack</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                  isActive ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <div className="h-5 w-px bg-border mx-1 hidden sm:block" />
          <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
          <Link href="/settings" className="hidden sm:flex">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <>
          <div className="fixed inset-0 top-14 z-40 bg-black/20 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
          <nav className="fixed left-0 right-0 top-14 z-50 border-b bg-background/95 backdrop-blur-xl lg:hidden px-4 py-2 space-y-1 shadow-lg max-h-[calc(100vh-56px)] overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    isActive ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                pathname === "/settings" ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </nav>
        </>
      )}
    </header>
  )
}
