"use client"

import { useEffect, useState, Suspense } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Building2, Mic, Sparkles, X } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ConversationalVoiceInterviewModal } from "@/components/interview/ConversationalVoiceInterviewModal"

import { PrepNote, InterviewSessionItem } from "@/components/interview/prep/types"
import { InterviewPrepHeader } from "@/components/interview/prep/InterviewPrepBentoHero"
import { ConceptLabTab } from "@/components/interview/prep/ConceptLabTab"
import { MockTranscriptsTab } from "@/components/interview/prep/MockTranscriptsTab"
import { RevisionNotesTab } from "@/components/interview/prep/RevisionNotesTab"

function InterviewPrepContent() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Query Params for 1-Click Application Prep Room
  const customAppId = searchParams.get("appId") || undefined
  const customCompany = searchParams.get("company") || undefined
  const customRole = searchParams.get("role") || undefined

  // Navigation Tab
  const [activeTab, setActiveTab] = useState("study")

  // Persistent Data States
  const [notes, setNotes] = useState<PrepNote[]>([])
  const [sessions, setSessions] = useState<InterviewSessionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissBanner, setDismissBanner] = useState(false)

  // Voice Mock Modal State
  const [conversationalModalOpen, setConversationalModalOpen] = useState(false)

  function fetchAll() {
    Promise.all([
      fetch("/api/prep-notes").then((r) => r.json()),
      fetch("/api/interview-sessions").then((r) => r.json()),
    ])
      .then(([n, s]) => {
        setNotes(Array.isArray(n) ? n : [])
        setSessions(Array.isArray(s) ? s : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      router.push("/login")
      return
    }
    fetchAll()
  }, [isLoaded, isSignedIn, router])

  // Save AI answer as revision note
  async function handleSaveAsNote(title: string, content: string, category: string) {
    try {
      const res = await fetch("/api/prep-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Study: ${title.slice(0, 50)}...`,
          content,
          category: category || "General",
        }),
      })

      if (res.ok) {
        toast.success("Saved to your Revision Notes!")
        fetchAll()
      } else {
        toast.error("Failed to save note.")
      }
    } catch {
      toast.error("Error saving note.")
    }
  }

  // Delete Note
  async function handleDeleteNote(id: string) {
    await fetch(`/api/prep-notes/${id}`, { method: "DELETE" })
    toast.success("Note removed")
    fetchAll()
  }

  // Delete Session
  async function handleDeleteSession(id: string) {
    const res = await fetch(`/api/interview-sessions?id=${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Session removed")
      setSessions((prev) => prev.filter((s) => s.id !== id))
    } else {
      toast.error("Failed to delete session")
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* 1. Standard CareerTrack Page Header */}
      <InterviewPrepHeader
        onStartMockInterview={() => setConversationalModalOpen(true)}
      />

      {/* 1-Click Application-Linked Tailored Banner */}
      {customCompany && !dismissBanner && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-primary/30 bg-primary/5 shadow-xs relative">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0 mt-0.5 sm:mt-0">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-foreground">
                  Tailored Prep Room for {customCompany}
                </span>
                {customRole && (
                  <span className="text-[11px] text-muted-foreground">({customRole})</span>
                )}
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[10px] font-semibold bg-primary/15 text-primary rounded-md">
                  <Sparkles className="h-2.5 w-2.5" /> 1-Click Tailored
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                The AI interviewer will dynamically query this company&apos;s JD keywords and interview culture.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button
              size="sm"
              onClick={() => setConversationalModalOpen(true)}
              className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer font-medium"
            >
              Launch Mock Room
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setDismissBanner(true)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Dismiss banner"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* 2. Standard shadcn Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between border-b pb-3">
          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger value="study" className="text-xs sm:text-sm">
              AI Concept Tutor & Q&A
            </TabsTrigger>
            <TabsTrigger value="sessions" className="text-xs sm:text-sm">
              Mock Transcripts ({sessions.length})
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-xs sm:text-sm">
              Revision Notes ({notes.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: AI Concept Tutor & Q&A */}
        <TabsContent value="study" className="pt-2">
          <ConceptLabTab onSaveAsNote={handleSaveAsNote} />
        </TabsContent>

        {/* Tab 2: Recorded Mock Sessions & Transcripts */}
        <TabsContent value="sessions" className="pt-2">
          <MockTranscriptsTab
            sessions={sessions}
            loading={loading}
            onDeleteSession={handleDeleteSession}
            onStartMockInterview={() => setConversationalModalOpen(true)}
          />
        </TabsContent>

        {/* Tab 3: Revision Notes & Saved Concepts */}
        <TabsContent value="notes" className="pt-2">
          <RevisionNotesTab
            notes={notes}
            loading={loading}
            onDeleteNote={handleDeleteNote}
            onNoteCreated={fetchAll}
          />
        </TabsContent>
      </Tabs>

      {/* Spoken Voice Mock Interview Modal */}
      <ConversationalVoiceInterviewModal
        isOpen={conversationalModalOpen}
        onClose={() => {
          setConversationalModalOpen(false)
          fetchAll()
        }}
        initialRole={customRole || "Senior Fullstack Engineer"}
        initialCompany={customCompany || "Google / Tech Company"}
        initialType="Technical"
        applicationId={customAppId}
        onSessionSaved={fetchAll}
      />
    </div>
  )
}

export default function InterviewPrepPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto space-y-6 pb-12 p-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <InterviewPrepContent />
    </Suspense>
  )
}
