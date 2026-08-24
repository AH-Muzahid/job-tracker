"use client"

import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Bell } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

import { AccountInfoCard } from "@/components/settings/AccountInfoCard"
import { PreferencesCard } from "@/components/settings/PreferencesCard"
import { DataManagementCard } from "@/components/settings/DataManagementCard"
import { GoogleSheetsIntegrationCard, type GoogleSheetsConfigData } from "@/components/settings/GoogleSheetsIntegrationCard"
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

export default function SettingsPage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const router = useRouter()

  const [bundle, setBundle] = useState<SettingsBundle | null>(null)
  const [loadingBundle, setLoadingBundle] = useState(true)

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in")
    }
  }, [isLoaded, isSignedIn, router])

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
      <div className="space-y-4 max-w-4xl mx-auto pb-10">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account preferences and AI Provider Keys.</p>
      </div>

      {/* Account Info */}
      <AccountInfoCard
        name={user?.fullName}
        email={user?.primaryEmailAddress?.emailAddress}
      />

      {/* Dark mode & Theme Preferences */}
      <PreferencesCard />

      {/* CSV Data Export */}
      <DataManagementCard />

      {/* Google Sheets Real-time Auto-Sync */}
      <GoogleSheetsIntegrationCard
        initialConfig={bundle?.googleSheets || null}
        isLoading={loadingBundle}
      />

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

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="h-4 w-4" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email Reminders</p>
              <p className="text-xs text-muted-foreground">Get notified about interview deadlines</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Coming Soon
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
