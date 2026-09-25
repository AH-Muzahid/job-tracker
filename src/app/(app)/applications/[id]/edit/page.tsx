"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useUser } from "@clerk/nextjs"
import { PageContainer, PageHeader } from "@/components/primitives"
import { Button } from "@/components/ui/button"
import ApplicationForm, { type ApplicationFormData } from "@/components/ApplicationForm"
import { Skeleton } from "@/components/ui/skeleton"

export default function EditApplicationPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const params = useParams()
  const [application, setApplication] = useState<ApplicationFormData | null>(null)
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
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48 rounded-[4px]" />
          <Skeleton className="h-96 w-full rounded-[6px]" />
        </div>
      </PageContainer>
    )
  }

  if (!application) return null

  return (
    <PageContainer>
      <PageHeader
        overline="Intake Studio"
        title={`Edit Application: ${application.companyName}`}
        description={`Updating role parameters and interview notes for ${application.jobTitle}`}
        primaryAction={
          <Button asChild variant="outline" size="sm" className="rounded-[4px] h-8 text-xs font-medium">
            <Link href={`/applications/${params.id}`}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back to Workbench
            </Link>
          </Button>
        }
      />
      <div className="border border-border bg-card rounded-[6px] p-6 max-w-2xl">
        <ApplicationForm
          initialData={application}
          applicationId={params.id as string}
          initialTagIds={initialTagIds}
        />
      </div>
    </PageContainer>
  )
}
