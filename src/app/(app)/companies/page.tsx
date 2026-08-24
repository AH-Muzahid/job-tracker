"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Building2, Globe, Plus, Trash2, Briefcase } from "lucide-react"
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
      toast.success("Company added successfully")
      setAddOpen(false)
      setForm({ name: "", website: "", industry: "", notes: "" })
      fetchCompanies()
    } else {
      toast.error("Failed to add company")
    }
    setSubmitting(false)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/companies/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Company removed")
      fetchCompanies()
    } else {
      toast.error("Failed to remove company")
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-10">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="rounded-xl border border-border/80 p-4">
              <CardContent className="p-0 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-3/4 rounded-md" />
                    <Skeleton className="h-3 w-1/2 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full rounded-md mt-4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Target Companies</h1>
          <p className="text-sm text-muted-foreground">{companies.length} companies in your hiring pipeline</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="rounded-lg shadow-xs cursor-pointer">
          <Plus className="h-4 w-4 mr-1.5" /> Add Company
        </Button>
      </div>

      {companies.length === 0 ? (
        <Card className="rounded-xl border-dashed border-border/80 p-12 text-center bg-card/50">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <h3 className="text-base font-semibold text-foreground">No companies tracked yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Add target employers to organize applications, track recruiter outreach, and prep company-specific notes.
          </p>
          <Button variant="outline" onClick={() => setAddOpen(true)} className="mt-4 rounded-lg text-xs cursor-pointer">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Your First Company
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Card 
              key={company.id} 
              className="group rounded-xl border border-border/80 bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
                    {company.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{company.name}</p>
                    {company.industry && (
                      <Badge variant="outline" className="text-[10px] mt-1 rounded-md bg-secondary/40 text-muted-foreground border-border/60">
                        {company.industry}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(company.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-7 w-7 rounded-lg transition-all cursor-pointer"
                  title="Remove company"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {company.notes && (
                <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed bg-muted/30 p-2 rounded-lg border border-border/40">
                  {company.notes}
                </p>
              )}

              <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5 text-primary/70" />
                  <strong className="text-foreground font-medium">{company._count.applications}</strong> applications
                </span>
                {company.website && (
                  <a 
                    href={company.website.startsWith("http") ? company.website : `https://${company.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <Globe className="h-3 w-3" /> Website
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md rounded-xl border border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Target Company</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Company Name *</Label>
              <Input 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                placeholder="e.g. Google, Stripe, Vercel"
                className="rounded-lg text-xs" 
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Website</Label>
              <Input 
                value={form.website} 
                onChange={(e) => setForm({ ...form, website: e.target.value })} 
                placeholder="https://company.com"
                className="rounded-lg text-xs" 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Industry</Label>
              <Input 
                value={form.industry} 
                onChange={(e) => setForm({ ...form, industry: e.target.value })} 
                placeholder="e.g. Fintech, AI / ML, E-commerce"
                className="rounded-lg text-xs" 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Notes</Label>
              <Textarea 
                rows={2} 
                value={form.notes} 
                onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                placeholder="Hiring contacts, referral notes, tech stack details..."
                className="rounded-lg text-xs resize-none" 
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} className="rounded-lg text-xs cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="rounded-lg text-xs cursor-pointer">
                {submitting ? "Adding..." : "Add Company"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
