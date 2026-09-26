"use client"

import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect, use } from "react"
import { PageContainer } from "@/components/primitives"
import { OpportunityDetailPage } from "@/components/discovery/OpportunityDetailPage"

export default function OpportunityDetailRoutePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) router.push("/login")
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded || !isSignedIn) {
    return (
      <PageContainer>
        <div className="w-full animate-pulse space-y-6 py-4">
          <div className="h-6 w-36 rounded-sm bg-muted/30" />
          <div className="h-44 rounded-[6px] bg-muted/20" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 h-96 rounded-[6px] bg-muted/20" />
            <div className="lg:col-span-4 h-96 rounded-[6px] bg-muted/20" />
          </div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <OpportunityDetailPage id={id} />
    </PageContainer>
  )
}
