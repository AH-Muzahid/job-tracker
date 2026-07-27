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
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <Button variant="outline" onClick={() => router.push("/applications")}>
          Back to Applications
        </Button>
      </div>
    )
  }

  if (!application) return null

  return (
    <div className="space-y-6">
      <ApplicationDetailHeader
        companyName={application.companyName}
        jobTitle={application.jobTitle}
        applicationId={application.id}
        onDelete={() => setDialogOpen(true)}
      />

      <ApplicationWorkbench
        application={application}
        analysis={analysis}
        analysisLoading={analysisLoading}
        onTriggerAnalysis={triggerAnalysis}
        onDelete={() => setDialogOpen(true)}
        onUpdate={setApplication}
      />

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
