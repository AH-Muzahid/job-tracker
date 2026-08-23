/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Brain, History, BookOpen } from "lucide-react"
import { ConversationalVoiceInterviewModal } from "@/components/interview/ConversationalVoiceInterviewModal"
import { cn } from "@/lib/utils"

import { PrepNote, InterviewSessionItem, PrepTabType } from "@/components/interview/prep/types"
import { InterviewPrepBentoHero } from "@/components/interview/prep/InterviewPrepBentoHero"
import { ConceptLabTab } from "@/components/interview/prep/ConceptLabTab"
import { MockTranscriptsTab } from "@/components/interview/prep/MockTranscriptsTab"
import { RevisionNotesTab } from "@/components/interview/prep/RevisionNotesTab"

export default function InterviewPrepPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()

  // Navigation Tab
  const [activeTab, setActiveTab] = useState<PrepTabType>("study")

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
      {/* 1. BENTO HERO COMMAND ZONE */}
      <InterviewPrepBentoHero
        onStartMockInterview={() => setConversationalModalOpen(true)}
        totalDiscussions={0}
        totalSessions={sessions.length}
        totalNotes={notes.length}
      />

      {/* 2. SEGMENTED TAB SWITCHER */}
      <div className="flex items-center justify-between border-b pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/30 border text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("study")}
            className={cn(
              "flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl font-semibold transition-all cursor-pointer",
              activeTab === "study"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Brain className="h-3.5 w-3.5" />
            <span>AI Concept Lab & Q&A</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sessions")}
            className={cn(
              "flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl font-semibold transition-all cursor-pointer",
              activeTab === "sessions"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <History className="h-3.5 w-3.5" />
            <span>Mock Transcripts ({sessions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("notes")}
            className={cn(
              "flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl font-semibold transition-all cursor-pointer",
              activeTab === "notes"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Revision Notes ({notes.length})</span>
          </button>
        </div>
      </div>

      {/* 3. TAB 1: AI CONCEPT LAB & Q&A */}
      {activeTab === "study" && (
        <ConceptLabTab onSaveAsNote={handleSaveAsNote} />
      )}

      {/* 4. TAB 2: RECORDED MOCK SESSIONS & TRANSCRIPTS */}
      {activeTab === "sessions" && (
        <MockTranscriptsTab
          sessions={sessions}
          loading={loading}
          onDeleteSession={handleDeleteSession}
          onStartMockInterview={() => setConversationalModalOpen(true)}
        />
      )}

      {/* 5. TAB 3: REVISION NOTES & SAVED CONCEPTS */}
      {activeTab === "notes" && (
        <RevisionNotesTab
          notes={notes}
          loading={loading}
          onDeleteNote={handleDeleteNote}
          onNoteCreated={fetchAll}
        />
      )}

      {/* 6. CONVERSATIONAL VOICE MOCK INTERVIEW MODAL */}
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
