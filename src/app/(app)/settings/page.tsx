"use client"

import { useUser } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { Settings, Link2, Cpu } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer, PageHeader } from "@/components/primitives"
import { cn } from "@/lib/utils"

import { AccountInfoCard } from "@/components/settings/AccountInfoCard"
import { PreferencesCard } from "@/components/settings/PreferencesCard"
import { DataManagementCard } from "@/components/settings/DataManagementCard"
import { SystemNotificationsCard } from "@/components/settings/SystemNotificationsCard"
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
      <PageContainer className="pb-16 space-y-6">
        <PageHeader skeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Skeleton className="h-44 w-full rounded-[6px]" />
          <Skeleton className="h-44 w-full rounded-[6px]" />
        </div>
        <Skeleton className="h-32 w-full rounded-[6px]" />
      </PageContainer>
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
    <PageContainer className="pb-16">
      {/* Standardized Header */}
      <PageHeader
        overline="SYSTEM / CONFIG"
        title="Settings & Environment"
        description="Manage account identity, cloud data pipelines, and AI inference configuration."
        primaryAction={
          <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground border border-border/70 bg-card px-2.5 py-1 rounded-[4px] max-w-full truncate shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">Profile: {user?.primaryEmailAddress?.emailAddress || "Authorized"}</span>
          </div>
        }
      />

      {/* Stripe Segmented / Linear Tab Switcher */}
      <div
        role="tablist"
        aria-label="Settings Navigation"
        className="mt-6 flex border-b border-border/80 overflow-x-auto sm:overflow-x-visible overflow-y-hidden no-scrollbar gap-1"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon

          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "relative flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-4 py-2.5 min-h-[42px] text-xs font-mono uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap -mb-[1px] rounded-t-[4px] flex-1 sm:flex-initial",
                isActive
                  ? "border-foreground text-foreground bg-muted/60 font-semibold shadow-2xs"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <span className="text-[10px] text-muted-foreground font-mono hidden xs:inline">[{tab.code}]</span>
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="inline sm:hidden">{tab.shortLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge && (
                <span className="ml-0.5 text-[9px] font-mono px-1 py-0.2 rounded-[2px] border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Panels */}
      <div
        id="panel-general"
        role="tabpanel"
        aria-labelledby="tab-general"
        className={activeTab === "general" ? "space-y-6 pt-6 animate-in fade-in-50 duration-200" : "hidden"}
      >
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
        <SystemNotificationsCard />
      </div>

      <div
        id="panel-integrations"
        role="tabpanel"
        aria-labelledby="tab-integrations"
        className={activeTab === "integrations" ? "space-y-6 pt-6 animate-in fade-in-50 duration-200" : "hidden"}
      >
        {/* Personal Gmail OAuth Account Integration */}
        <GoogleAccountCard />

        {/* Google Sheets Real-time Auto-Sync */}
        <GoogleSheetsIntegrationCard
          initialConfig={bundle?.googleSheets || null}
          isLoading={loadingBundle}
        />
      </div>

      <div
        id="panel-ai"
        role="tabpanel"
        aria-labelledby="tab-ai"
        className={activeTab === "ai" ? "space-y-6 pt-6 animate-in fade-in-50 duration-200" : "hidden"}
      >
        {/* Multi-Profile AI Keys Management */}
        <AIConfigCard
          initialData={bundle?.ai || null}
          isLoading={loadingBundle}
        />

        {/* Semantic Memory & Constraints Manager */}
        <AIMemoryManager
          initialMemories={bundle?.memories || null}
          isLoading={loadingBundle}
        />
      </div>
    </PageContainer>
  )
}
