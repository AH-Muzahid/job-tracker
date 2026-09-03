"use client"

import { useEffect, useState, useCallback } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FileText, Star, Trash2, Upload, Eye, Bot } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import TailorResumeModal from "@/components/resumes/TailorResumeModal"

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
  const [tailorOpen, setTailorOpen] = useState(false)
  const [form, setForm] = useState({ title: "" })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [previewTitle, setPreviewTitle] = useState("")
  const [previewOpen, setPreviewOpen] = useState(false)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const openPreview = useCallback(async (resumeId: string, title: string) => {
    setPreviewTitle(title)
    setPreviewOpen(true)
    setPreviewLoading(true)
    setBlobUrl(null)
    try {
      const res = await fetch(`/api/resumes/${resumeId}/preview`)
      if (!res.ok) throw new Error("Failed to load")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setBlobUrl(url)
    } catch {
      toast.error("Failed to load preview")
      setPreviewOpen(false)
    } finally {
      setPreviewLoading(false)
    }
  }, [])

  const closePreview = useCallback(() => {
    setPreviewOpen(false)
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      setBlobUrl(null)
    }
  }, [blobUrl])

  function fetchResumes() {
    fetch("/api/resumes")
      .then((r) => r.json())
      .then((data) => setResumes(Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : [])))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push("/"); return }
    fetchResumes()
  }, [isLoaded, isSignedIn, router])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error("Title is required")
      return
    }
    if (!selectedFile) {
      toast.error("Please upload a file")
      return
    }

    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("title", form.title)
      formData.append("isDefault", String(resumes.length === 0))

      const res = await fetch("/api/resumes", {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        toast.success("Resume uploaded and parsed successfully!")
        setAddOpen(false)
        setSelectedFile(null)
        setForm({ title: "" })
        fetchResumes()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to upload resume")
      }
    } catch (err) {
      console.error("Upload error:", err)
      toast.error("An error occurred during upload")
    } finally {
      setSubmitting(false)
    }
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
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-10 w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <Skeleton className="h-8 w-44 rounded-md" />
            <Skeleton className="h-4 w-72 rounded-sm" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="rounded-xl border border-border/80 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="size-10 rounded-lg shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32 rounded-sm" />
                    <Skeleton className="h-3 w-24 rounded-sm" />
                  </div>
                </div>
                <Skeleton className="size-7 rounded-md" />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <Skeleton className="h-4 w-16 rounded-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-7 w-16 rounded-md" />
                  <Skeleton className="h-7 w-16 rounded-md" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 w-full min-w-0 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Resume Hub</h1>
          <p className="text-sm font-medium text-muted-foreground mt-0.5">{resumes.length} resumes uploaded & indexed in Career Knowledge Graph</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            onClick={() => setTailorOpen(true)} 
            className="h-9 px-4 rounded-md text-sm font-semibold shadow-xs cursor-pointer gap-2"
          >
            <Bot className="h-4 w-4" /> Tailor for a Job
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setAddOpen(true)} 
            className="h-9 px-4 rounded-md text-sm font-medium cursor-pointer gap-2"
          >
            <Upload className="h-4 w-4" /> Upload Resume
          </Button>
        </div>
      </div>

      {resumes.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-12 text-center space-y-2">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-semibold text-foreground">No resumes uploaded yet</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">Upload your master resume to track tailored versions and match job applications.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {resumes.map((resume) => (
            <div 
              key={resume.id} 
              className="group p-4 rounded-md border border-border bg-card/60 hover:bg-card hover:border-foreground/30 transition-all duration-150 cursor-pointer shadow-none space-y-3" 
              onClick={() => openPreview(resume.id, resume.title)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted/60 text-foreground border border-border">
                    <FileText className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate hover:underline">{resume.title}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{resume.fileName}</p>
                    <div className="flex items-center gap-2 mt-1.5 font-mono">
                      <span className="text-xs text-muted-foreground">{formatSize(resume.fileSize)}</span>
                      {resume.isDefault && (
                        <Badge variant="outline" className="text-xs px-2 py-0 rounded-md border-border bg-muted/30">
                          <Star className="h-3 w-3 mr-1 text-amber-400 fill-amber-400" /> Default
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all" onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-muted-foreground hover:text-foreground cursor-pointer" 
                    onClick={() => openPreview(resume.id, resume.title)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  {!resume.isDefault && (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs cursor-pointer" onClick={() => setDefault(resume.id)}>
                      <Star className="h-3 w-3" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive cursor-pointer" onClick={() => handleDelete(resume.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={(open) => {
        setAddOpen(open)
        if (!open) {
          setSelectedFile(null)
          setForm({ title: "" })
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Resume</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Upload File *</Label>
              {selectedFile ? (
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-slate-50/50 dark:bg-slate-950/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatSize(selectedFile.size)}</p>
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setSelectedFile(null)
                      setForm({ title: "" })
                    }}
                    className="h-7 px-2 text-rose-500 hover:text-rose-650 hover:bg-rose-500/10 cursor-pointer"
                  >
                    Clear
                  </Button>
                </div>
              ) : (
                <div 
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const file = e.dataTransfer.files?.[0]
                    if (file) {
                      const ext = file.name.split(".").pop()?.toLowerCase()
                      if (ext !== "pdf" && ext !== "txt" && ext !== "md") {
                        toast.error("Only PDF, TXT, and MD files are supported")
                        return
                      }
                      setSelectedFile(file)
                      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
                      setForm({ title: baseName })
                    }
                  }}
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-secondary/40 transition-colors"
                  onClick={() => {
                    const input = document.createElement("input")
                    input.type = "file"
                    input.accept = ".pdf,.txt,.md"
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (file) {
                        setSelectedFile(file)
                        const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
                        setForm({ title: baseName })
                      }
                    }
                    input.click()
                  }}
                >
                  <Upload className="h-8 w-8 text-muted-foreground/60 mb-2" />
                  <p className="text-xs font-semibold text-foreground text-center">Drag & Drop or Click to Upload</p>
                  <p className="text-[10px] text-muted-foreground/80 mt-1 text-center">Supports PDF, TXT, MD (Max 10MB)</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="resumeTitle">Title *</Label>
              <Input 
                id="resumeTitle" 
                value={form.title} 
                onChange={(e) => setForm({ title: e.target.value })} 
                placeholder="e.g. Frontend Resume v2" 
                className="h-9 text-xs bg-background border-input text-foreground"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} className="cursor-pointer text-xs h-8">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="cursor-pointer text-xs h-8">
                {submitting ? "Uploading..." : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={(open) => { if (!open) closePreview() }}>
        <DialogContent className="max-w-4xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 py-3 border-b border-border shrink-0">
            <DialogTitle className="text-sm font-semibold truncate flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              {previewTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 bg-secondary/20">
            {previewLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                  <p className="text-xs text-muted-foreground">Loading preview...</p>
                </div>
              </div>
            ) : blobUrl ? (
              <iframe
                src={blobUrl}
                className="w-full h-full border-0"
                title={`Preview: ${previewTitle}`}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <TailorResumeModal open={tailorOpen} onOpenChange={setTailorOpen} />
    </div>
  )
}
