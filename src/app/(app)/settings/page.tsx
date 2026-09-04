"use client"

import { useUser } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { Bell, Settings, Link2, Cpu } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { DecorIcon } from "@/components/decor-icon"
import { cn } from "@/lib/utils"

import { AccountInfoCard } from "@/components/settings/AccountInfoCard"
import { PreferencesCard } from "@/components/settings/PreferencesCard"
import { DataManagementCard } from "@/components/settings/DataManagementCard"
import { GoogleSheetsIntegrationCard, type GoogleSheetsConfigData } from "@/components/settings/GoogleSheetsIntegrationCard"
import { GoogleAccountCard } from "@/components/settings/GoogleAccountCard"
import { AIConfigCard, type AIProfile } from "@/components/settings/AIConfigCard"
import { AIMemoryManager } from "@/components/settings/AIMemoryManager"

interface SettingsBundle {
  googleSheets: GoogleSheetsConfigData
  ai: { activeId: string | null; profiles: AIProfile[] }
  memories: Array<{
    id: string
    category: string
    content: string
    source?: string
    createdAt: string
  }>
}

type SettingsTab = "general" | "integrations" | "ai"

export default function SettingsPage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  // Determine initial tab from query string or URL state
  const initialTab: SettingsTab = (() => {
    const tabParam = searchParams?.get("tab")
    if (tabParam === "general" || tabParam === "integrations" || tabParam === "ai") {
      return tabParam
    }
    // Auto-focus integrations if returned from OAuth
    if (searchParams?.get("connected") === "google" || searchParams?.get("error")) {
      return "integrations"
    }
    return "general"
  })()

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab)
  const [bundle, setBundle] = useState<SettingsBundle | null>(null)
  const [loadingBundle, setLoadingBundle] = useState(true)

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/")
    }
  }, [isLoaded, isSignedIn, router])

  // Sync tab state from URL params if changed externally
  useEffect(() => {
    const tabParam = searchParams?.get("tab")
    if (tabParam === "general" || tabParam === "integrations" || tabParam === "ai") {
      setActiveTab(tabParam)
    } else if (searchParams?.get("connected") === "google" || searchParams?.get("error")) {
      setActiveTab("integrations")
    }
  }, [searchParams])

  function handleTabChange(tab: SettingsTab) {
    setActiveTab(tab)
    startTransition(() => {
      const url = new URL(window.location.href)
      url.searchParams.set("tab", tab)
      window.history.replaceState({}, "", url.toString())
    })
  }

  // Fetch unified settings bundle in 1 single fast roundtrip
  useEffect(() => {
    if (!isSignedIn) return
    let isMounted = true

    async function loadBundle() {
      try {
        const res = await fetch("/api/settings/bundle")
        if (res.ok && isMounted) {
          const data: SettingsBundle = await res.json()
          setBundle(data)
        }
      } catch (err) {
        console.error("Failed to load settings bundle:", err)
      } finally {
        if (isMounted) setLoadingBundle(false)
      }
    }

    loadBundle()
    return () => {
      isMounted = false
    }
  }, [isSignedIn])

  if (!isLoaded) {
    return (
      <div className="space-y-4 w-full min-w-0 pb-10">
        <Skeleton className="h-8 w-48 rounded-none" />
        <Skeleton className="h-40 w-full rounded-none" />
      </div>
    )
  }

  const tabs: { id: SettingsTab; label: string; shortLabel: string; code: string; icon: typeof Settings; badge?: string }[] = [
    { id: "general", label: "General & Identity", shortLabel: "General", code: "01", icon: Settings },
    {
      id: "integrations",
      label: "Integrations & Pipelines",
      shortLabel: "Integrations",
      code: "02",
      icon: Link2,
      badge: bundle?.googleSheets.autoSyncEnabled ? "Live" : undefined,
    },
    {
      id: "ai",
      label: "AI Engine & Vault",
      shortLabel: "AI Engine",
      code: "03",
      icon: Cpu,
      badge: bundle?.ai.activeId ? "Active" : undefined,
    },
  ]

  return (
    <div className="space-y-6 w-full min-w-0 pb-16">
      {/* Blueprint Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5 bg-muted/20">
                SYSTEM / CONFIG
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
                Settings & Environment
              </h1>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Manage account identity, cloud data pipelines, and AI inference configuration.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center font-mono text-[11px] text-muted-foreground border border-border/70 bg-card/60 px-2.5 py-1 max-w-full truncate">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">Profile: {user?.primaryEmailAddress?.emailAddress || "Authorized"}</span>
          </div>
        </div>

        {/* Blueprint Linear Tab Switcher */}
        <div className="mt-6 flex border-b border-border/80 overflow-x-auto sm:overflow-x-visible overflow-y-hidden no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "relative flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-4 py-2.5 min-h-[44px] text-xs font-mono uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap -mb-[2px] flex-1 sm:flex-initial",
                  isActive
                    ? "border-foreground text-foreground bg-muted/40 font-semibold shadow-xs"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20"
                )}
              >
                <span className="text-[10px] text-muted-foreground font-mono hidden xs:inline">[{tab.code}]</span>
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="inline sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.badge && (
                  <span className="ml-0.5 text-[9px] font-mono px-1 py-0.2 border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Panels */}
      <div className={activeTab === "general" ? "space-y-6 animate-in fade-in-50 duration-200" : "hidden"}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Account Info */}
          <AccountInfoCard
            name={user?.fullName}
            email={user?.primaryEmailAddress?.emailAddress}
          />

          {/* Dark mode & Theme Preferences */}
          <PreferencesCard />
        </div>

        {/* CSV Data Export */}
        <DataManagementCard />

        {/* Notifications Card */}
        <div className="relative rounded-none border border-border bg-card/60 backdrop-blur-xl p-4 sm:p-6 transition-colors">
          <DecorIcon position="top-right" />
          <DecorIcon position="bottom-left" />

          <div className="flex items-center justify-between pb-4 border-b border-border/70">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center border border-border bg-muted/40 text-foreground">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">NOTIF / 04</span>
                <h3 className="text-sm font-semibold tracking-tight text-foreground">System Notifications</h3>
              </div>
            </div>

            <span className="font-mono text-[10px] uppercase text-muted-foreground border border-border px-1.5 py-0.5">
              In Development
            </span>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Automated email digests and browser alerts for scheduled interviews and follow-up deadlines.
              </p>
              <span className="text-[10px] font-mono text-muted-foreground mt-1 inline-block">
                Webhook delivery & daily cadence options coming in upcoming release
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border bg-muted/30 font-mono text-xs text-muted-foreground rounded-none">
              Coming Soon
            </span>
          </div>
        </div>
      </div>

      <div className={activeTab === "integrations" ? "space-y-6 animate-in fade-in-50 duration-200" : "hidden"}>
        {/* Personal Gmail OAuth Account Integration */}
        <GoogleAccountCard />

        {/* Google Sheets Real-time Auto-Sync */}
        <GoogleSheetsIntegrationCard
          initialConfig={bundle?.googleSheets || null}
          isLoading={loadingBundle}
        />
      </div>

      <div className={activeTab === "ai" ? "space-y-6 animate-in fade-in-50 duration-200" : "hidden"}>
        {/* Multi-Profile AI Keys Management */}
        <AIConfigCard
          initialData={bundle?.ai || null}
          isLoading={loadingBundle}
        />

        {/* Persistent AI Semantic Memory */}
        <AIMemoryManager
          initialMemories={bundle?.memories || null}
          isLoading={loadingBundle}
        />
      </div>
    </div>
  )
}
