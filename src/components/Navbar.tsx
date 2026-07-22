"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton, useUser } from "@clerk/nextjs"
import {
  Moon, Sun, Menu, X, Search, Bell,
  LayoutDashboard, Briefcase, Building2, Brain,
  FileText, CalendarDays, Settings, ChevronRight, Bot,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useUI } from "@/lib/store"

const pageMap: Record<string, { title: string; icon: React.ReactNode }> = {
  "/dashboard": { title: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  "/applications": { title: "Applications", icon: <Briefcase className="h-4 w-4" /> },
  "/companies": { title: "Companies", icon: <Building2 className="h-4 w-4" /> },
  "/interview-prep": { title: "Interview Prep", icon: <Brain className="h-4 w-4" /> },
  "/resumes": { title: "Resumes", icon: <FileText className="h-4 w-4" /> },
  "/calendar": { title: "Calendar", icon: <CalendarDays className="h-4 w-4" /> },
  "/settings": { title: "Settings", icon: <Settings className="h-4 w-4" /> },
}

export default function Navbar() {
  const pathname = usePathname()
  const { isSignedIn } = useUser()
  const dark = useUI((s) => s.dark)
  const toggleTheme = useUI((s) => s.toggleTheme)
  const mobileOpen = useUI((s) => s.mobileOpen)
  const setMobileOpen = useUI((s) => s.setMobileOpen)

  if (!isSignedIn) return null

  const isFullscreen = pathname.startsWith("/ai-assistant")
  const segments = pathname.split("/").filter(Boolean)
  const currentPage = pageMap["/" + segments[0]] || { title: segments[0], icon: null }

  if (isFullscreen) {
    return (
      <header className="sticky top-0 z-30 flex h-12 items-center border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
            <Bot className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium">AI Assistant</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={toggleTheme}>
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <div className="h-5 w-px bg-border hidden sm:block" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg p-1 hover:bg-muted transition-colors">
                <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs text-muted-foreground cursor-default">CareerTrack v1.0</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6 gap-3">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      <div className="flex items-center gap-1.5 min-w-0">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-[10px]">C</div>
          <span className="text-xs font-medium hidden sm:inline">CareerTrack</span>
        </Link>
        <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
        <div className="flex items-center gap-1.5 min-w-0">
          {currentPage.icon}
          <span className="text-sm font-semibold truncate">{currentPage.title}</span>
        </div>
      </div>

      <div className="flex-1" />

      <button className="hidden sm:flex items-center gap-2 h-8 rounded-lg border bg-muted/50 px-3 text-xs text-muted-foreground hover:bg-muted transition-colors w-56">
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span>Search...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-[11px]">&#8984;</span>K
        </kbd>
      </button>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={toggleTheme}>
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground hover:text-foreground">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground">Notifications</div>
            <DropdownMenuSeparator />
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">No new notifications</div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-5 w-px bg-border mx-1 hidden sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg p-1 hover:bg-muted transition-colors">
              <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs text-muted-foreground cursor-default">CareerTrack v1.0</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
