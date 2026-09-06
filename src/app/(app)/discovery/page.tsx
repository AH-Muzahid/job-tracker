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
      <div className="w-full animate-pulse space-y-6">
        <div className="h-14 rounded-none bg-muted/30" />
        <div className="h-9 rounded-none bg-muted/20" />
        <div className="flex gap-6">
          <div className="hidden lg:block w-64 h-80 rounded-none bg-muted/20" />
          <div className="flex-1 space-y-2">
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
