"use client"

import { useUser } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer, PageHeader } from "@/components/primitives"
import { AIConfigCard, type AIProfile } from "@/components/settings/AIConfigCard"
import { GoogleSheetsIntegrationCard, type GoogleSheetsConfigData } from "@/components/settings/GoogleSheetsIntegrationCard"
import { GoogleAccountCard } from "@/components/settings/GoogleAccountCard"

interface IntegrationsBundle {
  googleSheets: GoogleSheetsConfigData | null
  ai: { activeId: string | null; profiles: AIProfile[] }
}

export default function IntegrationsPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [bundle, setBundle] = useState<IntegrationsBundle | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/")
    }
  }, [isLoaded, isSignedIn, router])

  // Handle OAuth redirect notifications
  useEffect(() => {
    const connected = searchParams?.get("connected")
    const error = searchParams?.get("error")

    if (connected === "google") {
      toast.success("Google Account successfully connected!")
    } else if (error) {
      toast.error(`Integration connection failed: ${error}`)
    }
  }, [searchParams])

  // Load bundle with Google Sheets and AI profiles
  useEffect(() => {
    if (!isSignedIn) return
    let isMounted = true

    async function loadBundle() {
      try {
        const res = await fetch("/api/settings/bundle")
        if (res.ok && isMounted) {
          const data = await res.json()
          setBundle({
            googleSheets: data.googleSheets,
            ai: data.ai,
          })
        }
      } catch (err) {
        console.error("Failed to load integrations bundle:", err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadBundle()
    return () => {
      isMounted = false
    }
  }, [isSignedIn])

  if (!isLoaded) {
    return (
      <PageContainer maxWidth="narrow" className="pb-16 space-y-6">
        <PageHeader skeleton />
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-[6px]" />
          <Skeleton className="h-48 w-full rounded-[6px]" />
          <Skeleton className="h-64 w-full rounded-[6px]" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer maxWidth="narrow" className="pb-16 space-y-6">
      {/* Standardized Header with Back to Profile */}
      <PageHeader
        backHref="/profile"
        backLabel="Back to Profile"
        overline="INTEGRATIONS & CONNECTIVITY"
        title="Integrations & AI Services"
        description="Manage AI model provider keys, sync application tracking with Google Sheets, and connect Gmail for automated recruiter updates."
      />

      <div className="space-y-6">
        {/* Multi-Profile AI Keys Management (OpenAI, Gemini, Anthropic, OpenRouter) */}
        <AIConfigCard
          initialData={bundle?.ai || null}
          isLoading={loading}
        />

        {/* Personal Gmail OAuth Account Integration */}
        <GoogleAccountCard />

        {/* Google Sheets Real-time Auto-Sync */}
        <GoogleSheetsIntegrationCard
          initialConfig={bundle?.googleSheets || null}
          isLoading={loading}
        />
      </div>
    </PageContainer>
  )
}
