"use client"

import {
  Briefcase,
  LayoutDashboard,
  Building2,
  Calendar,
  BrainCircuit,
  MessageSquare,
  FileText,
  User,
  Settings,
  Plus,
  HelpCircle,
  Search,
  Command,
  Sun,
  Moon,
  Bell,
  ArrowUpRight,
  TrendingUp,
  SlidersHorizontal,
  FolderGit2,
  ExternalLink,
  ChevronRight,
  Bot,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function HeroDashboardMockup() {
  return (
    <div className="w-full bg-background text-foreground text-left select-none font-sans overflow-hidden border border-border">
      {/* Top Application Bar */}
      <div className="flex h-12 items-center justify-between border-b border-border px-3 sm:px-4 bg-card/60 backdrop-blur-xs">
        {/* Left: Breadcrumb / Logo */}
        <div className="flex items-center gap-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold shadow-2xs">
            <Briefcase className="size-3.5" />
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <span>CareerTrack</span>
            <span className="text-muted-foreground/50">/</span>
            <span className="flex items-center gap-1 text-muted-foreground font-normal">
              <LayoutDashboard className="size-3" />
              Dashboard
            </span>
          </div>
        </div>

        {/* Right: Search & Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="hidden md:flex items-center gap-2 h-8 w-56 rounded-md border border-border bg-background/80 px-2.5 text-xs text-muted-foreground shadow-2xs">
            <Search className="size-3.5 text-muted-foreground/60" />
            <span className="flex-1 text-[11px]">Search commands...</span>
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">⌘K</kbd>
          </div>

          <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-primary/20 bg-primary/5 text-primary text-xs font-medium">
            <Bot className="size-3.5" />
            <span className="hidden sm:inline text-xs">Ask AI</span>
          </div>

          <div className="relative flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
            <Bell className="size-3.5" />
            <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-emerald-500 ring-2 ring-card" />
          </div>

          <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-violet-500 text-primary-foreground text-xs font-bold shadow-2xs">
            JD
          </div>
        </div>
      </div>

      {/* Main Body: Sidebar + Bento Canvas */}
      <div className="flex min-h-[460px] md:min-h-[500px]">
        {/* Left Sidebar Mock */}
        <aside className="hidden lg:flex w-52 flex-col justify-between border-r border-border bg-card/25 p-3 shrink-0">
          <div className="space-y-4">
            <div>
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5">
                Core Pipeline
              </p>
              <nav className="space-y-0.5 text-xs">
                <div className="flex items-center gap-2.5 rounded-md bg-muted/80 px-2.5 py-1.5 font-medium text-foreground">
                  <LayoutDashboard className="size-3.5 text-primary" />
                  <span>Dashboard</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-muted/40 transition-colors">
                  <Briefcase className="size-3.5" />
                  <span>Applications</span>
                  <Badge variant="secondary" className="ml-auto text-[9px] px-1 py-0 h-4 font-mono">11</Badge>
                </div>
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-muted/40 transition-colors">
                  <Building2 className="size-3.5" />
                  <span>Companies</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-muted/40 transition-colors">
                  <Calendar className="size-3.5" />
                  <span>Calendar</span>
                </div>
              </nav>
            </div>

            <div>
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5">
                AI & Prep
              </p>
              <nav className="space-y-0.5 text-xs">
                <div className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <BrainCircuit className="size-3.5 text-primary" />
                    <span>AI Assistant</span>
                  </div>
                  <span className="size-1.5 rounded-full bg-primary" />
                </div>
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-muted/40 transition-colors">
                  <MessageSquare className="size-3.5" />
                  <span>Interview Prep</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-muted/40 transition-colors">
                  <FileText className="size-3.5" />
                  <span>Resumes</span>
                </div>
              </nav>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 text-xs text-muted-foreground space-y-0.5">
            <div className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 hover:bg-muted/40 transition-colors">
              <User className="size-3.5" />
              <span>Profile Setup</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 hover:bg-muted/40 transition-colors">
              <Settings className="size-3.5" />
              <span>Settings</span>
            </div>
          </div>
        </aside>

        {/* Bento Content Area */}
        <main className="flex-1 p-3.5 sm:p-5 space-y-4 sm:space-y-5 bg-background overflow-hidden">
          {/* Top Banner Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono text-muted-foreground">Pipeline Status: Active</span>
            </div>
            <div className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-foreground text-background text-xs font-semibold shadow-2xs">
              <BrainCircuit className="size-3.5 text-primary-foreground fill-primary" />
              <span>Intake & Match with AI</span>
            </div>
          </div>

          {/* 4 KPI Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            <div className="p-3 sm:p-3.5 rounded-lg border border-border bg-card/50 shadow-2xs">
              <p className="text-[11px] font-medium text-muted-foreground">Active Pipeline</p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">11</span>
                <span className="inline-flex items-center text-[10px] font-medium text-emerald-500 font-mono">
                  <TrendingUp className="size-3 mr-0.5" /> +8.5%
                </span>
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-lg border border-border bg-card/50 shadow-2xs">
              <p className="text-[11px] font-medium text-muted-foreground">Total Applications</p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">24</span>
                <span className="inline-flex items-center text-[10px] font-medium text-emerald-500 font-mono">
                  <TrendingUp className="size-3 mr-0.5" /> +12.0%
                </span>
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-lg border border-border bg-card/50 shadow-2xs">
              <p className="text-[11px] font-medium text-muted-foreground">Interviews & Offers</p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">5</span>
                <span className="inline-flex items-center text-[10px] font-medium text-emerald-500 font-mono">
                  <TrendingUp className="size-3 mr-0.5" /> +5.2%
                </span>
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-lg border border-border bg-card/50 shadow-2xs">
              <p className="text-[11px] font-medium text-muted-foreground">Response Rate</p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">37.5%</span>
                <span className="inline-flex items-center text-[10px] font-medium text-emerald-500 font-mono">
                  <TrendingUp className="size-3 mr-0.5" /> +2.4%
                </span>
              </div>
            </div>
          </div>

          {/* Velocity Bar Chart & Funnel Breakdown Bento */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* Velocity Chart */}
            <div className="md:col-span-6 p-4 rounded-lg border border-border bg-card/50 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground">Application Velocity</span>
                    <span className="text-[10px] font-mono text-emerald-500 font-medium">↗ 29.2%</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Weekly submission pace & response rate</p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-border">
                  16 this week
                </Badge>
              </div>

              {/* Vector Bar Chart */}
              <div className="flex items-end justify-between gap-2 h-28 pt-4 pb-1 border-b border-border/60">
                {[
                  { day: "Mon", h: "45%" },
                  { day: "Tue", h: "70%" },
                  { day: "Wed", h: "25%" },
                  { day: "Thu", h: "100%" },
                  { day: "Fri", h: "60%" },
                  { day: "Sat", h: "28%" },
                  { day: "Sun", h: "50%" },
                ].map((item, idx) => (
                  <div key={item.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div
                      style={{ height: item.h }}
                      className="w-full max-w-[28px] rounded-t-sm bg-gradient-to-t from-primary/40 to-primary group-hover:from-primary/60 group-hover:to-primary transition-all"
                    />
                    <span className="text-[10px] font-mono text-muted-foreground">{item.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pipeline Funnel & Channels */}
            <div className="md:col-span-6 p-4 rounded-lg border border-border bg-card/50 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground">Pipeline Funnel & Sources</span>
                    <span className="text-[10px] font-mono text-emerald-500 font-medium">↗ 20.8%</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Conversion stages & candidate acquisition</p>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">20.8% rate</span>
              </div>

              {/* Progress bars */}
              <div className="space-y-2 text-xs font-mono">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="size-2 rounded-full bg-blue-500" /> Applied
                    </span>
                    <span className="text-muted-foreground">6 (25%)</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-1/4 rounded-full bg-blue-500" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="size-2 rounded-full bg-violet-500" /> Interview
                    </span>
                    <span className="text-muted-foreground">1 (4%)</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-[8%] rounded-full bg-violet-500" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="size-2 rounded-full bg-emerald-500" /> Offer
                    </span>
                    <span className="text-muted-foreground">4 (17%)</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-[17%] rounded-full bg-emerald-500" />
                  </div>
                </div>
              </div>

              {/* Source Channels Grid */}
              <div className="grid grid-cols-4 gap-1.5 pt-3 mt-3 border-t border-border/60 text-center font-mono">
                <div className="p-1.5 rounded bg-muted/40 border border-border/50">
                  <p className="text-[9px] text-muted-foreground truncate">LinkedIn</p>
                  <p className="text-[11px] font-bold text-foreground">11</p>
                </div>
                <div className="p-1.5 rounded bg-muted/40 border border-border/50">
                  <p className="text-[9px] text-muted-foreground truncate">Indeed</p>
                  <p className="text-[11px] font-bold text-foreground">4</p>
                </div>
                <div className="p-1.5 rounded bg-muted/40 border border-border/50">
                  <p className="text-[9px] text-muted-foreground truncate">Website</p>
                  <p className="text-[11px] font-bold text-foreground">3</p>
                </div>
                <div className="p-1.5 rounded bg-muted/40 border border-border/50">
                  <p className="text-[9px] text-muted-foreground truncate">Referral</p>
                  <p className="text-[11px] font-bold text-foreground">3</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row: Recent Applications Mini Feed */}
          <div className="p-3.5 sm:p-4 rounded-lg border border-border bg-card/50 shadow-2xs">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-foreground">Recent Pipeline Submissions</span>
              <span className="text-[10px] font-mono text-muted-foreground">Updated in real-time</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="flex items-center gap-2.5 p-2 rounded-md bg-background/80 border border-border">
                <div className="size-6 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 font-mono font-bold text-[10px] flex items-center justify-center border border-blue-500/30">
                  AT
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground text-[11px] truncate">Aidle Technologies</p>
                  <p className="text-[10px] text-muted-foreground truncate">Junior Software Developer</p>
                </div>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                  Interview
                </Badge>
              </div>

              <div className="flex items-center gap-2.5 p-2 rounded-md bg-background/80 border border-border">
                <div className="size-6 rounded bg-violet-500/15 text-violet-600 dark:text-violet-400 font-mono font-bold text-[10px] flex items-center justify-center border border-violet-500/30">
                  SF
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground text-[11px] truncate">Salesforce</p>
                  <p className="text-[10px] text-muted-foreground truncate">Software Engineer</p>
                </div>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono text-blue-600 bg-blue-500/10 border-blue-500/20">
                  Applied
                </Badge>
              </div>

              <div className="flex items-center gap-2.5 p-2 rounded-md bg-background/80 border border-border">
                <div className="size-6 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-[10px] flex items-center justify-center border border-emerald-500/30">
                  TW
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground text-[11px] truncate">Twitter / X</p>
                  <p className="text-[10px] text-muted-foreground truncate">Senior Frontend Engineer</p>
                </div>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono text-purple-600 bg-purple-500/10 border-purple-500/20">
                  Offer
                </Badge>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
