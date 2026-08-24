"use client"

import React, { useState } from "react"
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { PrepNote } from "./types"

interface RevisionNotesTabProps {
  notes: PrepNote[]
  loading: boolean
  onDeleteNote: (id: string) => Promise<void>
  onNoteCreated: () => void
}

export function RevisionNotesTab({
  notes,
  loading,
  onDeleteNote,
  onNoteCreated,
}: RevisionNotesTabProps) {
  const [nOpen, setNOpen] = useState(false)
  const [nForm, setNForm] = useState({ title: "", content: "", category: "General" })
  const [submittingNote, setSubmittingNote] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeSpeakingText, setActiveSpeakingText] = useState<string | null>(null)

  function toggleReadAloud(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return

    if (activeSpeakingText === text) {
      window.speechSynthesis.cancel()
      setActiveSpeakingText(null)
      return
    }

    window.speechSynthesis.cancel()
    const cleanText = text.replace(/[`*#_]/g, "").slice(0, 600)
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.rate = 0.95
    utterance.onend = () => setActiveSpeakingText(null)
    utterance.onerror = () => setActiveSpeakingText(null)

    setActiveSpeakingText(text)
    window.speechSynthesis.speak(utterance)
  }

  async function createNote(e: React.FormEvent) {
    e.preventDefault()
    if (!nForm.title.trim()) return
    setSubmittingNote(true)
    const res = await fetch("/api/prep-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nForm),
    })
    if (res.ok) {
      toast.success("Note added successfully")
      setNOpen(false)
      setNForm({ title: "", content: "", category: "General" })
      onNoteCreated()
    } else {
      toast.error("Failed to add note")
    }
    setSubmittingNote(false)
  }

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-foreground">Revision Notes & Core Concepts</h2>
          <p className="text-xs text-muted-foreground">Your curated cheat-sheets and saved explanations for quick revision</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes & concepts..."
              className="pl-8 text-xs h-8 rounded-xl"
            />
          </div>
          <Button
            size="sm"
            onClick={() => setNOpen(true)}
            className="text-xs h-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            <span>Add Note</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <Card className="rounded-3xl border border-dashed p-8 text-center space-y-3">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold">No Revision Notes Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Ask any question in the AI Concept Lab and click &quot;Save Note&quot; or create a custom note!
            </p>
          </div>
          <Button
            onClick={() => setNOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-9 px-4 rounded-xl font-medium"
          >
            Create Custom Note
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {filteredNotes.map((note) => (
            <Card
              key={note.id}
              className="rounded-3xl border border-border p-4 sm:p-5 flex flex-col justify-between gap-3 bg-card shadow-2xs hover:border-border/80 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[10px] font-medium bg-muted/50 text-foreground">
                    {note.category}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h4 className="text-sm font-semibold text-foreground leading-snug">{note.title}</h4>
                <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed whitespace-pre-wrap">
                  {note.content}
                </p>
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteNote(note.id)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10 text-xs h-7 px-2 rounded-lg"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleReadAloud(note.content)}
                  className="text-xs h-7 px-2.5 gap-1 rounded-lg"
                >
                  {activeSpeakingText === note.content ? (
                    <VolumeX className="h-3 w-3 text-amber-500" />
                  ) : (
                    <Volume2 className="h-3 w-3" />
                  )}
                  <span>Read Aloud</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE CUSTOM NOTE MODAL */}
      <Dialog open={nOpen} onOpenChange={setNOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base font-bold">Add Custom Revision Note</DialogTitle>
            <DialogDescription className="text-xs">Save key concepts, architectural diagrams, or cheat codes</DialogDescription>
          </DialogHeader>
          <form onSubmit={createNote} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Title / Concept</Label>
              <Input
                value={nForm.title}
                onChange={(e) => setNForm({ ...nForm, title: e.target.value })}
                placeholder="e.g. Postgres Index Types Cheat Sheet"
                className="text-xs h-8 sm:h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Category</Label>
              <Input
                value={nForm.category}
                onChange={(e) => setNForm({ ...nForm, category: e.target.value })}
                placeholder="e.g. React, System Design, Database"
                className="text-xs h-8 sm:h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Note Content & Key Takeaways</Label>
              <Textarea
                value={nForm.content}
                onChange={(e) => setNForm({ ...nForm, content: e.target.value })}
                rows={4}
                placeholder="Key bullet points, syntax, trade-offs..."
                className="text-xs leading-relaxed"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNOpen(false)}
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingNote}
                className="text-xs rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              >
                {submittingNote ? "Saving..." : "Save Note"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
