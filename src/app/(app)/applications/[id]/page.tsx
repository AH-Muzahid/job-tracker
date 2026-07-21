"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import StatusBadge from "@/components/StatusBadge"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

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

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      router.push("/login")
      return
    }

    fetch(`/api/applications/${params.id}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("Application not found")
          throw new Error("Failed to load")
        }
        return res.json()
      })
      .then(setApplication)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn, params.id, router])

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/applications/${params.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Application deleted")
      router.push("/applications")
      router.refresh()
    } catch {
      toast.error("Failed to delete application")
      setError("Failed to delete application")
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{application.companyName}</h1>
          <p className="text-muted-foreground">{application.jobTitle}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/applications/${application.id}/edit`}>Edit</Link>
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Application</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this application for{" "}
                  <strong>{application.companyName}</strong>? This action cannot
                  be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Company</p>
              <p className="font-medium">{application.companyName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Job Title</p>
              <p className="font-medium">{application.jobTitle}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Source</p>
              <p className="font-medium">{application.source}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <StatusBadge status={application.status} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Applied Date</p>
              <p className="font-medium">
                {new Date(application.applicationDate).toLocaleDateString()}
              </p>
            </div>
            {application.jobUrl && (
              <div>
                <p className="text-sm text-muted-foreground">Job URL</p>
                <a
                  href={application.jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  View posting
                </a>
              </div>
            )}
          </div>

          {application.notes && (
            <div>
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="whitespace-pre-wrap">{application.notes}</p>
            </div>
          )}

          <div className="pt-3 text-xs text-muted-foreground">
            Created: {new Date(application.createdAt).toLocaleString()}
            <br />
            Updated: {new Date(application.updatedAt).toLocaleString()}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
