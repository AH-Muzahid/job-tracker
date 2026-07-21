"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import ApplicationForm, { type ApplicationFormData } from "@/components/ApplicationForm"
import { Skeleton } from "@/components/ui/skeleton"

export default function EditApplicationPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const params = useParams()
  const [application, setApplication] = useState<ApplicationFormData | null>(
    null
  )
  const [initialTagIds, setInitialTagIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      router.push("/login")
      return
    }

    fetch(`/api/applications/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found")
        return res.json()
      })
      .then((data) => {
        setApplication({
          companyName: data.companyName,
          jobTitle: data.jobTitle,
          jobUrl: data.jobUrl || "",
          source: data.source,
          applicationDate: data.applicationDate.split("T")[0],
          status: data.status,
          notes: data.notes || "",
        })
        setInitialTagIds((data.tags || []).map((t: { tag: { id: string } }) => t.tag.id))
        setLoading(false)
      })
      .catch(() => {
        router.push("/applications")
      })
  }, [isLoaded, isSignedIn, params.id, router])

  if (!isLoaded || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!application) return null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Application</h1>
      <ApplicationForm
        initialData={application}
        applicationId={params.id as string}
        initialTagIds={initialTagIds}
      />
    </div>
  )
}
