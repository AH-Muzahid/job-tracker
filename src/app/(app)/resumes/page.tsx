"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FileText, Star, Trash2, Upload } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"

interface Resume {
  id: string
  title: string
  fileName: string
  fileUrl: string
  fileSize: number
  isDefault: boolean
  createdAt: string
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function ResumesPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ title: "", fileUrl: "", fileName: "" })
  const [submitting, setSubmitting] = useState(false)

  function fetchResumes() {
    fetch("/api/resumes").then((r) => r.json()).then(setResumes).finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push("/login"); return }
    fetchResumes()
  }, [isLoaded, isSignedIn, router])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.fileUrl.trim()) return
    setSubmitting(true)
    const res = await fetch("/api/resumes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        fileName: form.fileName || form.title + ".pdf",
        fileUrl: form.fileUrl,
        fileSize: 0,
        isDefault: resumes.length === 0,
      }),
    })
    if (res.ok) { toast.success("Added"); setAddOpen(false); setForm({ title: "", fileUrl: "", fileName: "" }); fetchResumes() }
    else toast.error("Failed")
    setSubmitting(false)
  }

  async function setDefault(id: string) {
    await fetch(`/api/resumes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    })
    fetchResumes()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/resumes/${id}`, { method: "DELETE" })
    toast.success("Deleted")
    fetchResumes()
  }

  if (!isLoaded || loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>)}</div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Resumes</h1>
          <p className="text-sm text-muted-foreground">{resumes.length} resumes uploaded</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Upload className="h-4 w-4" /> Add Resume</Button>
      </div>

      {resumes.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No resumes yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Add your resume to track versions</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {resumes.map((resume) => (
            <Card key={resume.id} className="group p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{resume.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{resume.fileName}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-muted-foreground">{formatSize(resume.fileSize)}</span>
                      {resume.isDefault && <Badge className="text-[10px] px-1.5 py-0"><Star className="h-2.5 w-2.5 mr-0.5" /> Default</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  {!resume.isDefault && (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setDefault(resume.id)}>
                      <Star className="h-3 w-3" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => handleDelete(resume.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Resume</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1.5"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Frontend Resume v2" /></div>
            <div className="space-y-1.5"><Label>File URL *</Label><Input value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} placeholder="https://..." /></div>
            <div className="space-y-1.5"><Label>File Name</Label><Input value={form.fileName} onChange={(e) => setForm({ ...form, fileName: e.target.value })} placeholder="resume.pdf" /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? "Adding..." : "Add"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
