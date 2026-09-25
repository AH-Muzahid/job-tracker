"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Application, WorkbenchAnalysis } from "@/components/applications/types"
import ApplicationDetailHeader from "@/components/applications/ApplicationDetailHeader"
import ApplicationDeleteDialog from "@/components/applications/ApplicationDeleteDialog"
import { ApplicationWorkbench } from "@/components/applications/ApplicationWorkbench"

import { PageContainer, KPIStrip } from "@/components/primitives"

export default function ApplicationDetailPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const params = useParams()
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [analysis, setAnalysis] = useState<WorkbenchAnalysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push("/login"); return }

    fetch(`/api/applications/${params.id}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("Application not found")
          throw new Error("Failed to load")
        }
        return res.json()
      })
      .then(setApplication)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))

    fetchAnalysis()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, params.id, router])

  useEffect(() => {
    if (!application) return
    const isAnalyzing = localStorage.getItem(`analyzing_${params.id}`) === "true" || application.companyName === "Analyzing..."
    
    if (isAnalyzing && !analysis && !analysisLoading) {
      setAnalysisLoading(true)
      let attempts = 0
      const maxAttempts = 30 // 60 seconds
      
      const pollInterval = setInterval(async () => {
        attempts++
        try {
          const res = await fetch(`/api/applications/${params.id}/analysis`)
          if (res.ok) {
            const data = await res.json()
            if (data && data.id) {
              setAnalysis(data)
              setAnalysisLoading(false)
              localStorage.removeItem(`analyzing_${params.id}`)
              clearInterval(pollInterval)
              
              // Refetch parent application to get updated companyName and jobTitle
              const appRes = await fetch(`/api/applications/${params.id}`)
              if (appRes.ok) {
                const appData = await appRes.json()
                setApplication(appData)
              }
              toast.success("AI analysis & extraction complete!")
            }
          }
        } catch (e) {
          console.error(e)
        }
        
        if (attempts >= maxAttempts) {
          setAnalysisLoading(false)
          localStorage.removeItem(`analyzing_${params.id}`)
          clearInterval(pollInterval)
          toast.error("AI analysis timed out. You can trigger it manually.")
        }
      }, 2000)

      return () => clearInterval(pollInterval)
    }
  }, [application, analysis, analysisLoading, params.id])

  async function fetchAnalysis() {
    try {
      const res = await fetch(`/api/applications/${params.id}/analysis`)
      if (res.ok) {
        const data = await res.json()
        if (data && data.id) {
          setAnalysis(data)
        }
      }
    } catch {}
  }

  async function triggerAnalysis() {
    setAnalysisLoading(true)
    try {
      const app = application
      const jdText = `Company: ${app?.companyName}\nRole: ${app?.jobTitle}\nDescription: ${app?.notes || "No JD text provided"}\nURL: ${app?.jobUrl || "N/A"}`
      const res = await fetch("/api/ai/scan-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText, applicationId: params.id }),
      })
      if (res.ok) {
        const data = await res.json()
        setAnalysis(data)
        toast.success("Analysis complete!")
        await fetchAnalysis()
      } else {
        const err = await res.json()
        toast.error(err.error || "Analysis failed. Configure AI in Settings first.")
      }
    } catch {
      toast.error("Analysis failed")
    } finally {
      setAnalysisLoading(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/applications/${params.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Application deleted")
      router.push("/applications")
      router.refresh()
    } catch {
      toast.error("Failed to delete application")
      setDeleting(false)
      setDialogOpen(false)
    }
  }

  if (!isLoaded || loading) {
    return (
      <PageContainer>
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-[6px] border border-border bg-card">
          <div className="flex items-start gap-4">
            <Skeleton className="size-11 rounded-[6px] shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Skeleton className="h-6 w-44 rounded-[4px]" />
                <Skeleton className="h-5 w-20 rounded-[4px]" />
              </div>
              <Skeleton className="h-4 w-56 rounded-[4px]" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20 rounded-[4px]" />
            <Skeleton className="h-8 w-20 rounded-[4px]" />
          </div>
        </div>

        {/* 4 Stat Strip Skeleton */}
        <div className="relative border border-border bg-border rounded-[6px] overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 sm:p-5 bg-background space-y-2.5">
                <Skeleton className="h-3 w-20 rounded-[4px]" />
                <Skeleton className="h-5 w-24 rounded-[4px]" />
              </div>
            ))}
          </div>
        </div>

        {/* 2-Column Workbench Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 rounded-[6px] border border-border bg-card space-y-4">
              <Skeleton className="h-5 w-36 rounded-[4px] pb-2 border-b border-border" />
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-full rounded-[4px]" />
                <Skeleton className="h-3.5 w-5/6 rounded-[4px]" />
                <Skeleton className="h-3.5 w-4/5 rounded-[4px]" />
                <Skeleton className="h-3.5 w-full rounded-[4px]" />
              </div>
            </div>
          </div>
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-[6px] border border-border bg-card space-y-4">
              <Skeleton className="h-5 w-40 rounded-[4px] pb-2 border-b border-border" />
              <div className="flex items-center justify-center py-4">
                <Skeleton className="size-24 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-full rounded-[4px]" />
                <Skeleton className="h-3 w-3/4 rounded-[4px]" />
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer>
        <div className="text-center py-12 border border-border bg-background rounded-[6px] p-8 max-w-md mx-auto">
          <p className="text-destructive mb-4 text-xs font-mono">{error}</p>
          <Button variant="outline" size="sm" onClick={() => router.push("/applications")} className="rounded-[4px] text-xs font-medium">
            Back to Applications
          </Button>
        </div>
      </PageContainer>
    )
  }

  if (!application) return null

  const daysActive = Math.max(1, Math.floor((Date.now() - new Date(application.applicationDate).getTime()) / (1000 * 60 * 60 * 24)))

  return (
    <PageContainer>
      {/* 1. Detail Header */}
      <ApplicationDetailHeader
        companyName={application.companyName}
        jobTitle={application.jobTitle}
        applicationId={application.id}
        interviewDate={application.interviewDate}
        interviewRound={application.interviewRound}
        interviewMeetingUrl={application.interviewMeetingUrl}
        interviewNotes={application.interviewNotes}
        onScheduleUpdate={(updated) => {
          setApplication((prev) => (prev ? { ...prev, ...updated } : null))
        }}
        onDelete={() => setDialogOpen(true)}
      />

      {/* 2. Top KPI Metric Grid */}
      <KPIStrip
        columns={4}
        items={[
          {
            id: "stage",
            label: "Current Stage",
            value: application.status,
            subtext: `${daysActive}d active in pipeline`,
          },
          {
            id: "matchScore",
            label: "AI Match Score",
            value: analysis?.matchScore ? `${analysis.matchScore}%` : "—",
            delta: analysis?.matchScore ? (analysis.matchScore >= 75 ? 12 : 0) : undefined,
            subtext: analysis?.matchScore ? (analysis.matchScore >= 80 ? "Strong Fit" : "Moderate Fit") : "Run Assessment",
          },
          {
            id: "source",
            label: "Source Channel",
            value: application.source || "Direct",
            subtext: application.jobUrl ? "URL attached" : "Manual intake",
          },
          {
            id: "applied",
            label: "Applied On",
            value: new Date(application.applicationDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
            subtext: `${application.statusChanges?.length || 1} history event(s)`,
          },
        ]}
      />

      {/* 3. Workbench & AI Analysis */}
      <ApplicationWorkbench
        application={application}
        analysis={analysis}
        analysisLoading={analysisLoading}
        onTriggerAnalysis={triggerAnalysis}
        onDelete={() => setDialogOpen(true)}
        onUpdate={setApplication}
      />

      {/* 4. Delete Confirmation Dialog */}
      <ApplicationDeleteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        companyName={application.companyName}
        deleting={deleting}
        onConfirm={handleDelete}
      />
    </PageContainer>
  )
}
