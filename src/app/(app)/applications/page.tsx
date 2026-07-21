"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import StatusBadge from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useDebounce } from "@/lib/use-debounce"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

interface Application {
  id: string
  companyName: string
  jobTitle: string
  source: string
  status: string
  applicationDate: string
  createdAt: string
}

export default function ApplicationsPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [applications, setApplications] = useState<Application[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get("search") || "")
  const debouncedSearch = useDebounce(search, 300)
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all")
  const [sourceFilter, setSourceFilter] = useState(searchParams.get("source") || "all")
  const [sort, setSort] = useState(searchParams.get("sort") || "newest")
  const pageSize = 20

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (debouncedSearch) params.set("search", debouncedSearch)
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter)
    if (sourceFilter && sourceFilter !== "all") params.set("source", sourceFilter)
    params.set("sort", sort)
    params.set("page", String(page))
    params.set("pageSize", String(pageSize))

    try {
      const res = await fetch(`/api/applications?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const json = await res.json()
      setApplications(json.data)
      setTotal(json.total)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, sourceFilter, sort, page])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter, sourceFilter, sort])

  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set("search", debouncedSearch)
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter)
    if (sourceFilter && sourceFilter !== "all") params.set("source", sourceFilter)
    if (sort !== "newest") params.set("sort", sort)
    const qs = params.toString()
    router.replace(`/applications${qs ? `?${qs}` : ""}`, { scroll: false })
  }, [debouncedSearch, statusFilter, sourceFilter, sort, router])

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      router.push("/login")
      return
    }
    fetchApplications()
  }, [isLoaded, isSignedIn, fetchApplications, router])

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Applications</h1>
        <Button asChild>
          <Link href="/applications/new">Add Application</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by company or title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Saved">Saved</SelectItem>
            <SelectItem value="Applied">Applied</SelectItem>
            <SelectItem value="Assessment">Assessment</SelectItem>
            <SelectItem value="Interview">Interview</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
            <SelectItem value="Offer">Offer</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="LinkedIn">LinkedIn</SelectItem>
            <SelectItem value="Bdjobs">Bdjobs</SelectItem>
            <SelectItem value="Indeed">Indeed</SelectItem>
            <SelectItem value="Wellfound">Wellfound</SelectItem>
            <SelectItem value="Facebook">Facebook</SelectItem>
            <SelectItem value="Referral">Referral</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="mb-2">No applications found.</p>
          <Button asChild variant="outline">
            <Link href="/applications/new">Add your first application</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead className="hidden lg:table-cell">Source</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow
                    key={app.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/applications/${app.id}`)}
                  >
                    <TableCell className="font-medium">{app.companyName}</TableCell>
                    <TableCell>{app.jobTitle}</TableCell>
                    <TableCell className="hidden lg:table-cell">{app.source}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {new Date(app.applicationDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={app.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {applications.map((app) => (
              <div
                key={app.id}
                className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted/50"
                onClick={() => router.push(`/applications/${app.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{app.companyName}</p>
                    <p className="text-sm text-muted-foreground">{app.jobTitle}</p>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
                <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                  <span>{app.source}</span>
                  <span>{new Date(app.applicationDate).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * pageSize >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
