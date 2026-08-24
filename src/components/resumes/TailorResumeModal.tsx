"use client"

import { useState } from "react"
import { Sparkles, Loader2, FileText, ArrowRight } from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import ATSResumePreview from "@/components/resumes/ATSResumePreview"
import type { TailoredResumeData } from "@/types/tailored-resume"

interface TailorResumeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialJD?: string
  initialCompany?: string
  initialRole?: string
}

export default function TailorResumeModal({
  open,
  onOpenChange,
  initialJD = "",
  initialCompany = "",
  initialRole = "",
}: TailorResumeModalProps) {
  const [jdText, setJdText] = useState(initialJD)
  const [company, setCompany] = useState(initialCompany)
  const [role, setRole] = useState(initialRole)
  const [generating, setGenerating] = useState(false)
  const [tailoredData, setTailoredData] = useState<TailoredResumeData | null>(null)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!jdText.trim() || jdText.trim().length < 20) {
      toast.error("Please paste a valid Job Description (minimum 20 characters)")
      return
    }

    setGenerating(true)
    try {
      const res = await fetch("/api/resumes/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jdText,
          targetCompany: company.trim() || undefined,
          targetRole: role.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success && data.data) {
        toast.success(`Tailored resume generated with ${data.matchScore}% ATS match!`)
        setTailoredData(data.data)
      } else {
        toast.error(data.error || "Failed to generate tailored resume")
      }
    } catch (err) {
      console.error(err)
      toast.error("An unexpected error occurred while generating your tailored resume")
    } finally {
      setGenerating(false)
    }
  }

  function handleReset() {
    setTailoredData(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${tailoredData ? "max-w-5xl w-[95vw] h-[90vh]" : "max-w-xl"} rounded-xl border border-border bg-card p-4 sm:p-6 flex flex-col gap-4 overflow-hidden`}>
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            {tailoredData ? "Tailored ATS Resume Preview & Export" : "1-Click ATS Tailored Resume Builder"}
          </DialogTitle>
        </DialogHeader>

        {tailoredData ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <ATSResumePreview data={tailoredData} onClose={() => onOpenChange(false)} />
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Target Company</Label>
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Stripe, Google, Linear"
                  className="text-xs rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Target Role Title</Label>
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="text-xs rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-foreground">Job Description (JD) *</Label>
                <span className="text-[10px] text-muted-foreground">Vector-less Graph RAG Traversal</span>
              </div>
              <Textarea
                rows={6}
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste the full job description or key technical requirements here..."
                className="text-xs rounded-lg leading-relaxed resize-none"
                required
              />
            </div>

            <div className="p-3 bg-secondary/30 rounded-lg border border-border/60 text-xs text-muted-foreground flex items-start gap-2">
              <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                Our <strong>Career Knowledge Graph</strong> will traverse your verified skills, production projects, and quantifiable achievements to engineer an optimal 1-page ATS-compliant resume.
              </span>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="text-xs rounded-lg cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={generating || jdText.trim().length < 20}
                className="text-xs rounded-lg shadow-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Traversing Graph & Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Generate Tailored Resume
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
