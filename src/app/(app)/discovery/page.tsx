"use client"

import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { DiscoveryPage } from "@/components/discovery/DiscoveryPage"

export default function DiscoveryPageWrapper() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) router.push("/login")
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="w-full animate-pulse space-y-4">
        <div className="h-20 sm:h-24 rounded-none bg-muted/40" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 sm:h-24 rounded-none bg-muted/30" />)}
        </div>
        <div className="h-9 sm:h-10 rounded-none bg-muted/30" />
        <div className="flex gap-6">
          <div className="hidden lg:block w-60 h-64 rounded-none bg-muted/30" />
          <div className="flex-1 space-y-1">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-16 rounded-none bg-muted/20" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <DiscoveryPage />
    </div>
  )
}
