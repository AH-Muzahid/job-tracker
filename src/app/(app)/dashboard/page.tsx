"use client"

import { Suspense, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import BentoCommandZone from "@/components/dashboard/BentoCommandZone"
import BentoPipelineFunnel from "@/components/dashboard/BentoPipelineFunnel"
import BentoStatGrid from "@/components/dashboard/BentoStatGrid"
import BentoActivityStream from "@/components/dashboard/BentoActivityStream"
import BentoAnalytics from "@/components/dashboard/BentoAnalytics"
import { useStats, useWeeklyGoals } from "@/lib/api"

function DashboardContent() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const { data: stats, isLoading } = useStats()
  const { data: weeklyGoals, isLoading: goalsLoading } = useWeeklyGoals()

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/sign-in")
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded || isLoading) return <DashboardBentoSkeleton />
  if (!isSignedIn) return null

  const safeStats = {
    total: stats?.total ?? 0,
    saved: stats?.saved ?? 0,
    applied: stats?.applied ?? 0,
    assessment: stats?.assessment ?? 0,
    interview: stats?.interview ?? 0,
    rejected: stats?.rejected ?? 0,
    offer: stats?.offer ?? 0,
    recent: stats?.recent ?? [],
    trend: stats?.trend ?? [],
    bySource: stats?.bySource ?? [],
    followUpApps: stats?.followUpApps ?? [],
  }

  const activePipeline = safeStats.applied + safeStats.assessment + safeStats.interview
  const followUpApps = safeStats.followUpApps || []

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* 1. Bento Command Center Hero */}
      <BentoCommandZone
        activePipeline={activePipeline}
        totalThisWeek={safeStats.trend[safeStats.trend.length - 1]?.count || 0}
      />

      {/* 2. Step-by-Step Live Pipeline Bento */}
      <BentoPipelineFunnel stats={safeStats} />

      {/* 3. 4-Card Minimal Metrics Bento */}
      <BentoStatGrid stats={safeStats} />

      {/* 4. Live Activity Stream Bento (3/5) + Goals & AI Insights (2/5) */}
      <BentoActivityStream
        recentApps={safeStats.recent || []}
        followUpApps={followUpApps}
        weeklyGoals={weeklyGoals?.[0] || null}
        goalsLoading={goalsLoading}
        stats={safeStats}
      />

      {/* 5. Volume & Distribution Analytics Bento */}
      <BentoAnalytics stats={safeStats} />
    </div>
  )
}

function DashboardBentoSkeleton() {
  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-72 rounded-lg lg:col-span-3" />
        <Skeleton className="h-72 rounded-lg lg:col-span-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardBentoSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
