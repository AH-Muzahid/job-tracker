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

import { DecorIcon } from "@/components/decor-icon"
import { DashboardCard } from "@/components/dashboard-card"
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta"
import StatusBadge from "@/components/StatusBadge"

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
      <div className="space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-64 rounded-md" />
        <div className="relative border border-border bg-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-6 bg-background space-y-3">
                <Skeleton className="h-4 w-20 rounded-sm" />
                <Skeleton className="h-8 w-16 rounded-sm" />
                <Skeleton className="h-3 w-28 rounded-sm mt-4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 border border-border bg-background p-8 max-w-md mx-auto">
        <p className="text-destructive mb-4 text-xs font-mono">{error}</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/applications")}>
          Back to Applications
        </Button>
      </div>
    )
  }

  if (!application) return null

  const daysActive = Math.max(1, Math.floor((Date.now() - new Date(application.applicationDate).getTime()) / (1000 * 60 * 60 * 24)))

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Detail Header */}
      <ApplicationDetailHeader
        companyName={application.companyName}
        jobTitle={application.jobTitle}
        applicationId={application.id}
        onDelete={() => setDialogOpen(true)}
      />

      {/* 2. Top Efferd 4-Stat Metric Grid */}
      <div className="relative border border-border bg-border">
        <DecorIcon className="hidden md:block" position="top-left" />
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Status */}
          <DashboardCard className="flex flex-col justify-between">
            <div className="px-6 pt-5 pb-5">
              <p className="text-sm font-normal text-muted-foreground">Current Stage</p>
              <div className="mt-2">
                <StatusBadge status={application.status} />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs px-6 py-3 border-t border-border bg-background font-mono text-muted-foreground">
              <span>{daysActive}d active in pipeline</span>
            </div>
          </DashboardCard>

          {/* Card 2: AI Fit Score */}
          <DashboardCard className="flex flex-col justify-between">
            <div className="px-6 pt-5 pb-5">
              <p className="text-sm font-normal text-muted-foreground">AI Match Score</p>
              <p className="text-3xl font-bold tracking-tight text-foreground mt-2">
                {analysis?.matchScore ? `${analysis.matchScore}%` : "—"}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs px-6 py-3 border-t border-border bg-background">
              {analysis?.matchScore ? (
                <Delta value={analysis.matchScore >= 75 ? 12 : 0}>
                  <DeltaIcon />
                  <DeltaValue />
                </Delta>
              ) : null}
              <span className="text-muted-foreground">
                {analysis?.matchScore ? (analysis.matchScore >= 80 ? "Strong Fit" : "Moderate Fit") : "Run Assessment"}
              </span>
            </div>
          </DashboardCard>

          {/* Card 3: Source */}
          <DashboardCard className="flex flex-col justify-between">
            <div className="px-6 pt-5 pb-5">
              <p className="text-sm font-normal text-muted-foreground">Source Channel</p>
              <p className="text-2xl font-bold tracking-tight text-foreground mt-2 truncate">
                {application.source || "Direct"}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs px-6 py-3 border-t border-border bg-background font-mono text-muted-foreground truncate">
              <span>{application.jobUrl ? "URL attached" : "Manual intake"}</span>
            </div>
          </DashboardCard>

          {/* Card 4: Date Applied */}
          <DashboardCard className="flex flex-col justify-between">
            <div className="px-6 pt-5 pb-5">
              <p className="text-sm font-normal text-muted-foreground">Applied On</p>
              <p className="text-xl font-bold tracking-tight text-foreground mt-2 font-mono">
                {new Date(application.applicationDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs px-6 py-3 border-t border-border bg-background font-mono text-muted-foreground">
              <span>{application.statusChanges?.length || 1} history event(s)</span>
            </div>
          </DashboardCard>
        </div>
      </div>

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
    </div>
  )
}
