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
      <div className="w-full animate-pulse space-y-6">
        <div className="h-32 rounded-xl bg-muted/40" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-56 rounded-xl bg-muted/30" />
          <div className="h-56 rounded-xl bg-muted/30" />
          <div className="h-56 rounded-xl bg-muted/30" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <JobDiscoveryHub />
    </div>
  )
}
