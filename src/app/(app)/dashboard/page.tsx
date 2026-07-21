"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import StatCard from "@/components/StatCard"
import StatusBadge from "@/components/StatusBadge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Stats {
  total: number
  saved: number
  applied: number
  assessment: number
  interview: number
  rejected: number
  offer: number
  recent: Array<{
    id: string
    companyName: string
    jobTitle: string
    status: string
    createdAt: string
  }>
}

export default function DashboardPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      router.push("/login")
      return
    }

    fetch("/api/dashboard/stats")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load stats")
        return res.json()
      })
      .then((data) => {
        setStats(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded || loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  if (!stats) return null

  const statCards = [
    { label: "Total", value: stats.total },
    { label: "Saved", value: stats.saved },
    { label: "Applied", value: stats.applied },
    { label: "Assessment", value: stats.assessment },
    { label: "Interview", value: stats.interview },
    { label: "Rejected", value: stats.rejected },
    { label: "Offer", value: stats.offer },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button asChild>
          <Link href="/applications/new">Add Application</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
        {statCards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recent.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No applications yet.</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/applications/new">Add your first application</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recent.map((app) => (
                <Link
                  key={app.id}
                  href={`/applications/${app.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{app.companyName}</p>
                    <p className="text-sm text-muted-foreground">
                      {app.jobTitle}
                    </p>
                  </div>
                  <StatusBadge status={app.status} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
