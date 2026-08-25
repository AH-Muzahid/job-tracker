"use client"

import { useEffect, useState, Suspense } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Building2, Bot, X } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DecorIcon } from "@/components/decor-icon"
import { ConversationalVoiceInterviewModal } from "@/components/interview/ConversationalVoiceInterviewModal"

import { PrepNote, InterviewSessionItem } from "@/components/interview/prep/types"
import { InterviewPrepHeader } from "@/components/interview/prep/InterviewPrepBentoHero"
import { MockInterviewLaunchpad } from "@/components/interview/prep/MockInterviewLaunchpad"
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
  const [activeTab, setActiveTab] = useState("mock")

  // Modal Configuration States
  const [modalRole, setModalRole] = useState(customRole || "Senior Fullstack Engineer")
  const [modalCompany, setModalCompany] = useState(customCompany || "Google / Tech Company")
  const [modalType, setModalType] = useState("Technical")

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
        setNotes(Array.isArray(n) ? n : (n && Array.isArray(n.data) ? n.data : []))
        setSessions(Array.isArray(s) ? s : (s && Array.isArray(s.data) ? s.data : []))
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

  function handleStartPreset(preset: {
    role: string
    company: string
    type: string
  }) {
    setModalRole(preset.role)
    setModalCompany(preset.company)
    setModalType(preset.type)
    setConversationalModalOpen(true)
  }

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

  if (!isLoaded || loading) {
    return <InterviewPrepSkeleton />
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 w-full min-w-0 max-w-full overflow-x-hidden">
      {/* 1. Page Header */}
      <InterviewPrepHeader
        onStartMockInterview={() => {
          setModalRole(customRole || "Senior Fullstack Engineer")
          setModalCompany(customCompany || "Tech Company")
          setConversationalModalOpen(true)
        }}
      />

      {/* 2. Top Efferd 4-KPI Metric Strip */}
      <div className="relative border border-border bg-border">
        <DecorIcon className="hidden md:block" position="top-left" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
          <div className="p-4 sm:p-5 bg-background space-y-1.5">
            <span className="text-xs font-mono text-muted-foreground">Mock Rounds</span>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {sessions.length}
            </div>
            <span className="text-[11px] font-mono text-muted-foreground block">completed</span>
          </div>

          <div className="p-4 sm:p-5 bg-background space-y-1.5">
            <span className="text-xs font-mono text-muted-foreground">Revision Notes</span>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {notes.length}
            </div>
            <span className="text-[11px] font-mono text-muted-foreground block">saved strategies</span>
          </div>

          <div className="p-4 sm:p-5 bg-background space-y-1.5">
            <span className="text-xs font-mono text-muted-foreground">Curated Tracks</span>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              3
            </div>
            <span className="text-[11px] font-mono text-muted-foreground block">role simulations</span>
          </div>

          <div className="p-4 sm:p-5 bg-background space-y-1.5">
            <span className="text-xs font-mono text-muted-foreground">Voice Engine</span>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-1.5 font-mono">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>Online</span>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground block">STAR debrief ready</span>
          </div>
        </div>
      </div>

      {/* 1-Click Application-Linked Tailored Banner */}
      {customCompany && !dismissBanner && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-border bg-card shadow-2xs relative">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-md bg-muted text-foreground border border-border shrink-0 mt-0.5 sm:mt-0">
              <Building2 className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-semibold text-foreground">
                  Tailored Prep Room for {customCompany}
                </span>
                {customRole && (
                  <span className="text-xs text-muted-foreground">({customRole})</span>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-medium bg-muted text-foreground border border-border rounded-full">
                  <Bot className="size-3" /> 1-Click Tailored
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                The AI interviewer will dynamically tailor questions to this company&apos;s interview culture.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button
              size="sm"
              onClick={() => {
                setModalRole(customRole || "Software Engineer")
                setModalCompany(customCompany)
                setConversationalModalOpen(true)
              }}
              className="h-8 text-xs font-medium px-3.5 cursor-pointer shadow-xs"
            >
              Launch Mock Room
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setDismissBanner(true)}
              className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Dismiss banner"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* 3. Clean Segmented Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="border-b border-border pb-2 overflow-x-auto no-scrollbar">
          <TabsList className="bg-muted/40 p-1 h-9 border border-border">
            <TabsTrigger value="mock" className="text-xs font-medium px-3 sm:px-4 cursor-pointer">
              Voice Mock Interview
            </TabsTrigger>
            <TabsTrigger value="study" className="text-xs font-medium px-3 sm:px-4 cursor-pointer">
              Concept Lab & Q&A
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-xs font-medium px-3 sm:px-4 cursor-pointer">
              Revision Notes ({notes.length})
            </TabsTrigger>
            <TabsTrigger value="sessions" className="text-xs font-medium px-3 sm:px-4 cursor-pointer">
              Past Transcripts ({sessions.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Mode 1: Voice Mock Interview Launchpad */}
        <TabsContent value="mock" className="pt-1">
          <MockInterviewLaunchpad
            onStartCustom={() => {
              setModalRole(customRole || "Senior Fullstack Engineer")
              setModalCompany(customCompany || "Tech Company")
              setConversationalModalOpen(true)
            }}
            onStartPreset={handleStartPreset}
            customCompany={customCompany}
            customRole={customRole}
          />
        </TabsContent>

        {/* Mode 2: AI Concept Tutor & Q&A */}
        <TabsContent value="study" className="pt-1">
          <ConceptLabTab onSaveAsNote={handleSaveAsNote} />
        </TabsContent>

        {/* Mode 3: Revision Notes & Saved Concepts */}
        <TabsContent value="notes" className="pt-1">
          <RevisionNotesTab
            notes={notes}
            loading={loading}
            onDeleteNote={handleDeleteNote}
            onNoteCreated={fetchAll}
          />
        </TabsContent>

        {/* Mode 4: Recorded Mock Sessions & Transcripts */}
        <TabsContent value="sessions" className="pt-1">
          <MockTranscriptsTab
            sessions={sessions}
            loading={loading}
            onDeleteSession={handleDeleteSession}
            onStartMockInterview={() => {
              setModalRole(customRole || "Senior Fullstack Engineer")
              setModalCompany(customCompany || "Tech Company")
              setConversationalModalOpen(true)
            }}
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
        initialRole={modalRole}
        initialCompany={modalCompany}
        initialType={modalType}
        applicationId={customAppId}
        onSessionSaved={fetchAll}
      />
    </div>
  )
}

function InterviewPrepSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 w-full min-w-0">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-56 rounded-md" />
          <Skeleton className="h-4 w-96 max-w-full rounded-sm" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* 4 Stat Strip Skeleton */}
      <div className="relative border border-border bg-border">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 sm:p-5 bg-background space-y-2">
              <Skeleton className="h-3 w-20 rounded-sm" />
              <Skeleton className="h-6 w-12 rounded-sm" />
              <Skeleton className="h-2.5 w-24 rounded-sm" />
            </div>
          ))}
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex items-center gap-1.5 p-1 rounded-lg border border-border bg-muted/40 w-full sm:w-96">
        <Skeleton className="h-7 flex-1 rounded-md" />
        <Skeleton className="h-7 flex-1 rounded-md" />
        <Skeleton className="h-7 flex-1 rounded-md" />
        <Skeleton className="h-7 flex-1 rounded-md" />
      </div>

      {/* Hero Card Skeleton */}
      <div className="p-5 sm:p-6 rounded-lg border border-border bg-card space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 rounded-full" />
            <Skeleton className="h-6 w-64 rounded-sm" />
            <Skeleton className="h-3.5 w-96 max-w-full rounded-sm" />
          </div>
          <Skeleton className="h-9 w-40 rounded-lg" />
        </div>
      </div>

      {/* 3 Launchpad Cards */}
      <div className="relative border border-border bg-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-5 bg-background space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20 rounded-full" />
                <Skeleton className="h-3.5 w-16 rounded-sm" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-40 rounded-sm" />
                <Skeleton className="h-3 w-full rounded-sm" />
              </div>
              <div className="pt-2 flex justify-between items-center border-t border-border">
                <Skeleton className="h-3 w-16 rounded-sm" />
                <Skeleton className="h-7 w-20 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function InterviewPrepPage() {
  return (
    <Suspense fallback={<InterviewPrepSkeleton />}>
      <InterviewPrepContent />
    </Suspense>
  )
}
