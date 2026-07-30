"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ExternalLink, Plus } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Application, WorkbenchAnalysis, OutreachDrafts } from "./types"
import { FitAssessmentCard } from "./FitAssessmentCard"
import { OutreachAssistantCard } from "./OutreachAssistantCard"
import { MilestoneTimeline } from "./MilestoneTimeline"

interface Props {
  application: Application
  analysis: WorkbenchAnalysis | null
  analysisLoading: boolean
  onTriggerAnalysis: () => void
  onDelete?: () => void
  onUpdate: (updated: Application) => void
}

export function ApplicationWorkbench({
  application,
  analysis,
  analysisLoading,
  onTriggerAnalysis,
  onDelete,
  onUpdate,
}: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"details" | "timeline" | "outreach">("details")
  
  // Edit Form Fields
  const [companyName, setCompanyName] = useState(application.companyName)
  const [jobTitle, setJobTitle] = useState(application.jobTitle)
  const [jobUrl, setJobUrl] = useState(application.jobUrl || "")
  const [source, setSource] = useState(application.source)
  const [status, setStatus] = useState(application.status)
  const [notes, setNotes] = useState(application.notes || "")
  const [isSaving, setIsSaving] = useState(false)

  // Tags System
  const [allTags, setAllTags] = useState<{ id: string; name: string }[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(application.tags.map((t) => t.tag.id))
  const [newTagName, setNewTagName] = useState("")

  // Outreach Drafts
  const [outreachLoading, setOutreachLoading] = useState(false)
  const [outreachDrafts, setOutreachDrafts] = useState<OutreachDrafts | null>(null)
  const [draftSubject, setDraftSubject] = useState("")
  const [draftBody, setDraftBody] = useState("")
  const [copiedSubject, setCopiedSubject] = useState(false)
  const [copiedBody, setCopiedBody] = useState(false)

  // Sync state if application updates
  useEffect(() => {
    setCompanyName(application.companyName)
    setJobTitle(application.jobTitle)
    setJobUrl(application.jobUrl || "")
    setSource(application.source)
    setStatus(application.status)
    setNotes(application.notes || "")
    setSelectedTagIds(application.tags.map((t) => t.tag.id))
  }, [application])

  // Restore saved outreach drafts from localStorage on mount/load
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`outreach_${application.id}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.subject || parsed.email) {
          setDraftSubject(parsed.subject || "")
          setDraftBody(parsed.email || "")
          setOutreachDrafts({
            recommendation: "Saved outreach email draft",
            email: parsed.email || "",
            subjectLines: [parsed.subject || `Application for ${application.jobTitle}`],
            beforeSendChecklist: [
              "Verified GitHub/LinkedIn/portfolio links included",
              "Mentioned 3+ matching skills from JD",
              "Highlighted best projects from profile",
              "Addressed key requirements & work setup preference",
            ],
          })
        }
      }
    } catch {}
  }, [application.id, application.jobTitle])

  // Fetch all tags
  useEffect(() => {
    fetch("/api/tags")
      .then((res) => res.json())
      .then(setAllTags)
      .catch(console.error)
  }, [])

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const res = await fetch(`/api/applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          jobTitle,
          jobUrl: jobUrl || null,
          source,
          status,
          notes,
          tagIds: selectedTagIds,
        }),
      })

      if (!res.ok) throw new Error("Failed to update application")
      const updated = await res.json()
      onUpdate(updated)
      toast.success("Workbench details updated successfully")
      router.refresh()
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Failed to update details"
      toast.error(errMsg)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim() }),
      })
      if (!res.ok) throw new Error("Failed to create tag")
      const newTag = await res.json()
      setAllTags((prev) => [...prev, newTag])
      setSelectedTagIds((prev) => [...prev, newTag.id])
      setNewTagName("")
      toast.success(`Tag "${newTag.name}" created`)
    } catch {
      toast.error("Failed to create tag")
    }
  }

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const handleGenerateOutreach = async () => {
    setOutreachLoading(true)
    setDraftSubject(`Application for ${application.jobTitle}`)
    setDraftBody("")
    setOutreachDrafts({
      recommendation: "Direct application email draft",
      email: "",
      subjectLines: [`Application for ${application.jobTitle}`],
      beforeSendChecklist: [
        "Verified GitHub/LinkedIn/portfolio links included",
        "Mentioned 3+ matching skills from JD",
        "Highlighted best projects from profile",
        "Addressed key requirements & work setup preference",
      ],
    })

    try {
      const res = await fetch(`/api/applications/${application.id}/outreach`, {
        method: "POST",
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to generate outreach note")
      }

      const data = await res.json()
      const finalSubject = data.subject || `Application for ${application.jobTitle}`
      const fullEmail = data.email || ""

      if (finalSubject) setDraftSubject(finalSubject)
      setOutreachLoading(false)

      // Persist in localStorage per application ID
      try {
        localStorage.setItem(
          `outreach_${application.id}`,
          JSON.stringify({ subject: finalSubject, email: fullEmail })
        )
      } catch {}

      let charIdx = 0
      const timer = setInterval(() => {
        if (charIdx < fullEmail.length) {
          charIdx += 4
          setDraftBody(fullEmail.slice(0, charIdx))
        } else {
          setDraftBody(fullEmail)
          clearInterval(timer)
          toast.success("Outreach email generated successfully!")
        }
      }, 15)
    } catch (err: unknown) {
      setOutreachLoading(false)
      const errMsg = err instanceof Error ? err.message : "Outreach generation failed"
      toast.error(errMsg)
    }
  }

  const handleOpenMailClient = () => {
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi
    const inferredEmails = (application.notes || "").match(emailRegex) || []
    const to = inferredEmails[0] || ""
    const subject = encodeURIComponent(draftSubject)
    const body = encodeURIComponent(draftBody)
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`
  }

  const copyToClipboard = (text: string, type: "to" | "subject" | "body") => {
    navigator.clipboard.writeText(text)
    if (type === "to") {
      toast.success("Recipient email copied!")
    } else if (type === "subject") {
      setCopiedSubject(true)
      setTimeout(() => setCopiedSubject(false), 2000)
      toast.success("Subject copied to clipboard!")
    } else {
      setCopiedBody(true)
      setTimeout(() => setCopiedBody(false), 2000)
      toast.success("Message body copied to clipboard!")
    }
  }

  const handleMarkAppliedManually = async () => {
    try {
      const res = await fetch(`/api/applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Applied" }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      const updated = await res.json()
      onUpdate(updated)
      setStatus("Applied")
      toast.success("Application marked as Applied!")
      router.refresh()
    } catch {
      toast.error("Failed to update status")
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Left Primary Workspace (Details, Forms, Notes & Outreach Assistant) */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border border-border bg-card/60 backdrop-blur-md shadow-lg rounded-2xl">
          <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/50 bg-secondary/10">
            <div className="flex gap-2">
              <Button
                variant={activeTab === "details" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("details")}
                className="text-xs h-8 cursor-pointer font-semibold"
              >
                Intake details
              </Button>
              <Button
                variant={activeTab === "timeline" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("timeline")}
                className="text-xs h-8 cursor-pointer font-semibold"
              >
                Status History
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-4">
            {activeTab === "details" && (
              <form onSubmit={handleUpdateDetails} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="companyName" className="text-xs font-semibold text-foreground/80">Company Name</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="bg-background border-input text-sm text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="jobTitle" className="text-xs font-semibold text-foreground/80">Job Role/Title</Label>
                    <Input
                      id="jobTitle"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="bg-background border-input text-sm text-foreground"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="status" className="text-xs font-semibold text-foreground/80">Current Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="bg-background border-input text-xs text-foreground h-9.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border text-foreground">
                        {["Saved", "Applied", "Assessment", "Interview", "Rejected", "Offer"].map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="source" className="text-xs font-semibold text-foreground/80">Source</Label>
                    <Select value={source} onValueChange={setSource}>
                      <SelectTrigger className="bg-background border-input text-xs text-foreground h-9.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border text-foreground">
                        {["LinkedIn", "Bdjobs", "Indeed", "Wellfound", "Facebook", "Referral", "Other"].map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="jobUrl" className="text-xs font-semibold text-foreground/80">Job URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="jobUrl"
                        value={jobUrl}
                        onChange={(e) => setJobUrl(e.target.value)}
                        placeholder="Paste link..."
                        className="bg-background border-input text-sm text-foreground flex-1"
                      />
                      {application.jobUrl && (
                        <Button size="icon" variant="outline" className="shrink-0 h-9.5" asChild>
                          <a href={application.jobUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground/80">Tags</Label>
                  <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 rounded-lg bg-secondary/20 border border-border">
                    {allTags.map((tag) => {
                      const isSelected = selectedTagIds.includes(tag.id)
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleToggleTag(tag.id)}
                          className={`text-[10px] px-2.5 py-1 rounded-md border transition-all cursor-pointer font-medium ${
                            isSelected
                              ? "bg-primary/10 border-primary text-primary shadow-sm"
                              : "bg-background text-foreground border-border hover:bg-secondary/80"
                          }`}
                        >
                          {tag.name}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex gap-2 max-w-xs items-center mt-2">
                    <Input
                      placeholder="Add tag name..."
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="h-8 text-xs bg-background border-input text-foreground"
                    />
                    <Button type="button" size="sm" onClick={handleCreateTag} className="h-8 text-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/95">
                      <Plus className="h-3 w-3 mr-1" /> Create
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="notes" className="text-xs font-semibold text-foreground/80">Notes / Job Description (JD)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter salary, requirements, or personal tracker details here..."
                    className="min-h-[160px] text-xs bg-background border-input text-foreground leading-relaxed placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 focus:border-primary transition-all resize-none outline-none p-3 rounded-lg"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" disabled={isSaving} className="text-xs px-4 h-9 bg-primary text-primary-foreground hover:bg-primary/95 font-semibold cursor-pointer">
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            )}

            {activeTab === "timeline" && (
              <MilestoneTimeline application={application} />
            )}
          </CardContent>
        </Card>

        {/* Outreach Assistant Card moved to Primary Column for full width breathing room */}
        <OutreachAssistantCard
          analysisExists={!!analysis}
          outreachDrafts={outreachDrafts}
          outreachLoading={outreachLoading}
          draftSubject={draftSubject}
          draftBody={draftBody}
          copiedSubject={copiedSubject}
          copiedBody={copiedBody}
          setDraftSubject={setDraftSubject}
          setDraftBody={setDraftBody}
          onGenerateOutreach={handleGenerateOutreach}
          onOpenMailClient={handleOpenMailClient}
          onMarkAppliedManually={handleMarkAppliedManually}
          onCopyToClipboard={copyToClipboard}
          jdNotes={application.notes || ""}
        />
      </div>

      {/* Right Column (Sticky AI Fit Assessment Sidebar) */}
      <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-6">
        <FitAssessmentCard
          analysis={analysis}
          analysisLoading={analysisLoading}
          onTriggerAnalysis={onTriggerAnalysis}
        />
      </div>
    </div>
  )
}
