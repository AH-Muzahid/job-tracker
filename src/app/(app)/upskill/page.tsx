"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { PageContainer, PageHeader, EmptyState } from "@/components/primitives"
import { SkillGapHeatmap } from "@/components/career/SkillGapHeatmap"
import { SalaryUploadDropzone } from "@/components/salary/SalaryUploadDropzone"
import { Button } from "@/components/ui/button"
import { RefreshCw, BrainCircuit, ArrowRight } from "lucide-react"
import { HeatmapItem, LearningRoadmapItem } from "@/lib/ai/upskill-engine"

export default function UpskillPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [data, setData] = useState<{
    heatmap: HeatmapItem[]
    roadmap: LearningRoadmapItem[]
    stats?: {
      totalAnalyzedJobs: number
      totalIdentifiedGaps: number
      candidateKnownSkillsCount: number
    }
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) router.push("/login")
  }, [isLoaded, isSignedIn, router])

  const fetchUpskillData = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch("/api/career/upskill")
      if (!res.ok) {
        throw new Error(`Failed to fetch career upskill data: ${res.statusText}`)
      }
      const json = await res.json()
      if (json.success) {
        setData({
          heatmap: json.heatmap || [],
          roadmap: json.roadmap || [],
          stats: json.stats,
        })
      } else {
        throw new Error(json.error || "Analysis failed")
      }
    } catch (err: unknown) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Failed to load upskill data")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (isSignedIn) {
      void fetchUpskillData()
    }
  }, [isSignedIn, fetchUpskillData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchUpskillData()
  }

  if (!isLoaded || !isSignedIn) {
    return (
      <PageContainer>
        <div className="w-full animate-pulse space-y-6">
          <div className="h-14 rounded-[6px] bg-muted/30" />
          <div className="h-20 rounded-[6px] bg-muted/20" />
          <div className="h-64 rounded-[6px] bg-muted/20" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        overline="Market Intelligence"
        title="Skill Gap Heatmap & Learning Roadmap"
        description="Continuous intelligence aggregating skill demands across your tracked opportunities vs. verified candidate graph"
        primaryAction={
          <Button
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-[4px] font-medium text-xs cursor-pointer h-8 sm:h-9 px-3 sm:px-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-none transition-all"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Analyzing..." : "Re-evaluate Gaps"}</span>
          </Button>
        }
      />

      {isLoading ? (
        <div className="py-16 text-center space-y-3">
          <div className="size-8 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-muted-foreground">
            Auditing opportunities and synthesizing learning priorities...
          </p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-[6px] border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs">
          <p className="font-semibold mb-1">Analysis Error</p>
          <p>{error}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            className="mt-3 text-xs rounded-[4px]"
          >
            Retry
          </Button>
        </div>
      ) : data && data.heatmap.length > 0 ? (
        <SkillGapHeatmap
          heatmap={data.heatmap}
          roadmap={data.roadmap}
          stats={data.stats}
        />
      ) : (
        <EmptyState
          icon={BrainCircuit}
          title="No skill gaps detected yet"
          description="Track or save opportunities in Discovery to aggregate market skill demands and generate a tailored study roadmap."
          action={{
            label: "Explore Opportunities",
            href: "/discovery",
            icon: ArrowRight,
          }}
        />
      )}

      <div className="mt-10 border-t border-border pt-8">
        <SalaryUploadDropzone />
      </div>
    </PageContainer>
  )
}
