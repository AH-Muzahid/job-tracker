"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Building2, Globe, Plus, Trash2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"

interface Company {
  id: string
  name: string
  website: string | null
  industry: string | null
  notes: string | null
  _count: { applications: number }
}

const industryColors: Record<string, string> = {
  Technology: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  Finance: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  Healthcare: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
  Education: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  "E-commerce": "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
}

export default function CompaniesPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ name: "", website: "", industry: "", notes: "" })
  const [submitting, setSubmitting] = useState(false)

  function fetchCompanies() {
    fetch("/api/companies")
      .then((r) => r.json())
      .then(setCompanies)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push("/login"); return }
    fetchCompanies()
  }, [isLoaded, isSignedIn, router])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSubmitting(true)
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success("Company added")
      setAddOpen(false)
      setForm({ name: "", website: "", industry: "", notes: "" })
      fetchCompanies()
    } else {
      toast.error("Failed")
    }
    setSubmitting(false)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/companies/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Deleted")
      fetchCompanies()
    }
  }

  if (!isLoaded || loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>)}</div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Companies</h1>
          <p className="text-sm text-muted-foreground">{companies.length} companies tracked</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add Company</Button>
      </div>

      {companies.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No companies yet</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Card key={company.id} className="group p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
                    {company.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{company.name}</p>
                    {company.industry && (
                      <Badge variant="secondary" className={`text-[10px] mt-1 ${industryColors[company.industry] || ""}`}>
                        {company.industry}
                      </Badge>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(company.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{company._count.applications} applications</span>
                {company.website && (
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
                    <Globe className="h-3 w-3" /> Website
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Company</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Google" />
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label>Industry</Label>
              <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="e.g. Technology" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Adding..." : "Add"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
