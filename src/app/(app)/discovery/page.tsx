"use client"

import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { JobDiscoveryHub } from "@/components/discovery/JobDiscoveryHub"

export default function DiscoveryPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      router.push("/login")
    }
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="p-6 max-w-7xl mx-auto animate-pulse space-y-6">
        <div className="h-28 rounded-xl bg-muted/40" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-52 rounded-xl bg-muted/30" />
          <div className="h-52 rounded-xl bg-muted/30" />
          <div className="h-52 rounded-xl bg-muted/30" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <JobDiscoveryHub />
    </div>
  )
}
