"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import ApplicationDetailHeader from "@/components/applications/ApplicationDetailHeader"
import ApplicationDeleteDialog from "@/components/applications/ApplicationDeleteDialog"
import ApplicationDetailsCard from "@/components/applications/ApplicationDetailsCard"
import ApplicationAnalysisSection from "@/components/applications/ApplicationAnalysisSection"

interface StatusChange {
  id: string
  fromStatus: string | null
  toStatus: string
  changedAt: string
}

interface TagItem {
  tag: { id: string; name: string }
}

interface Application {
  id: string
  companyName: string
  jobTitle: string
  jobUrl: string | null
  source: string
  applicationDate: string
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  tags: TagItem[]
  statusChanges: StatusChange[]
}

export default function ApplicationDetailPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const params = useParams()
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)

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

  async function fetchAnalysis() {
    try {
      const res = await fetch(`/api/applications/${params.id}/analysis`)
      if (res.ok) {
        const data = await res.json()
        if (data && data.id) {
          setAnalysis(data)
          setShowAnalysis(true)
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
        setShowAnalysis(true)
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

      <ApplicationDetailsCard
        companyName={application.companyName}
        jobTitle={application.jobTitle}
        source={application.source}
        status={application.status}
        applicationDate={application.applicationDate}
        jobUrl={application.jobUrl}
        tags={application.tags}
        notes={application.notes}
        statusChanges={application.statusChanges}
        createdAt={application.createdAt}
        updatedAt={application.updatedAt}
      />

      <ApplicationAnalysisSection
        analysis={analysis}
        showAnalysis={showAnalysis}
        analysisLoading={analysisLoading}
        onTriggerAnalysis={triggerAnalysis}
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
