"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ConversationalVoiceInterviewModal } from "@/components/interview/ConversationalVoiceInterviewModal"

import { PrepNote, InterviewSessionItem } from "@/components/interview/prep/types"
import { InterviewPrepHeader } from "@/components/interview/prep/InterviewPrepBentoHero"
import { ConceptLabTab } from "@/components/interview/prep/ConceptLabTab"
import { MockTranscriptsTab } from "@/components/interview/prep/MockTranscriptsTab"
import { RevisionNotesTab } from "@/components/interview/prep/RevisionNotesTab"

export default function InterviewPrepPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()

  // Navigation Tab
  const [activeTab, setActiveTab] = useState("study")

  // Persistent Data States
  const [notes, setNotes] = useState<PrepNote[]>([])
  const [sessions, setSessions] = useState<InterviewSessionItem[]>([])
  const [loading, setLoading] = useState(true)

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
        initialRole="Senior Fullstack Engineer"
        initialCompany="Google / Tech Company"
        initialType="Technical"
        onSessionSaved={fetchAll}
      />
    </div>
  )
}
