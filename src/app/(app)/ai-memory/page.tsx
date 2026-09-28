"use client"

import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer, PageHeader } from "@/components/primitives"
import { AIMemoryManager } from "@/components/settings/AIMemoryManager"

interface MemoryItem {
  id: string
  category: string
  content: string
  source?: string
  createdAt: string
}

export default function AIMemoryPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()

  const [memories, setMemories] = useState<MemoryItem[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/")
    }
  }, [isLoaded, isSignedIn, router])

  // Load memories from bundle
  useEffect(() => {
    if (!isSignedIn) return
    let isMounted = true

    async function loadMemories() {
      try {
        const res = await fetch("/api/settings/bundle")
        if (res.ok && isMounted) {
          const data = await res.json()
          setMemories(data.memories || [])
        }
      } catch (err) {
        console.error("Failed to load AI memories:", err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadMemories()
    return () => {
      isMounted = false
    }
  }, [isSignedIn])

  if (!isLoaded) {
    return (
      <PageContainer maxWidth="narrow" className="pb-16 space-y-6">
        <PageHeader skeleton />
        <div className="space-y-6">
          <Skeleton className="h-96 w-full rounded-[6px]" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer maxWidth="narrow" className="pb-16 space-y-6">
      {/* Standardized Header with Back to Profile */}
      <PageHeader
        backHref="/profile"
        backLabel="Back to Profile"
        overline="CANDIDATE INTELLIGENCE & CONTEXT"
        title="Career Knowledge & Memory Bank"
        description="Candidate background memories, learned interview patterns, and personalized AI reasoning constraints."
      />

      <div className="space-y-6">
        {/* Semantic Memory & Constraints Manager */}
        <AIMemoryManager
          initialMemories={memories}
          isLoading={loading}
        />
      </div>
    </PageContainer>
  )
}
