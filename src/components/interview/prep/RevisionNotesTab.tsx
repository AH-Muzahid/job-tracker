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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  BlueprintCard,
  BlueprintCardHeader,
  BlueprintCardTitle,
  BlueprintCardContent,
  BlueprintCardFooter,
  EmptyState,
} from "@/components/primitives"
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
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-foreground">Revision Notes & Core Concepts</h2>
          <p className="text-xs text-muted-foreground">Study your saved interview strategies, code snippets, and behavioral examples.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setNOpen(true)}
            size="sm"
            className="h-8 text-xs font-mono rounded-[4px] cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
          >
            <Plus className="size-3.5" />
            <span>Add Note</span>
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Filter notes by title, topic, or concept keyword..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-8.5 text-xs rounded-[4px] bg-background border-border"
        />
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-5 rounded-[6px] border border-border bg-card space-y-3">
              <Skeleton className="h-4 w-28 rounded-[4px]" />
              <Skeleton className="h-3.5 w-full rounded-[4px]" />
              <Skeleton className="h-3.5 w-3/4 rounded-[4px]" />
            </div>
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No Revision Notes Found"
          description="Save key insights from your Mock Interviews and Concept Lab conversations, or create custom notes manually."
          action={{
            label: "Create First Note",
            onClick: () => setNOpen(true),
            icon: Plus,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotes.map((note) => (
            <BlueprintCard key={note.id} className="flex flex-col justify-between">
              <BlueprintCardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded-[4px] bg-muted/60 border border-border text-foreground">
                    {note.category}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </BlueprintCardHeader>

              <BlueprintCardContent className="space-y-2 py-3">
                <BlueprintCardTitle className="text-sm font-semibold text-foreground leading-snug">
                  {note.title}
                </BlueprintCardTitle>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
                  {note.content}
                </p>
              </BlueprintCardContent>

              <BlueprintCardFooter className="pt-2 border-t border-border/60 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleReadAloud(note.content)}
                  className="h-7 text-[11px] font-mono px-2 text-muted-foreground hover:text-foreground cursor-pointer rounded-[4px]"
                >
                  {activeSpeakingText === note.content ? (
                    <VolumeX className="size-3 mr-1 text-destructive" />
                  ) : (
                    <Volume2 className="size-3 mr-1" />
                  )}
                  <span>Listen</span>
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDeleteNote(note.id)}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-[4px] cursor-pointer"
                  title="Delete Note"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </BlueprintCardFooter>
            </BlueprintCard>
          ))}
        </div>
      )}

      {/* Add Note Dialog */}
      <Dialog open={nOpen} onOpenChange={setNOpen}>
        <DialogContent className="max-w-md bg-background border-border text-foreground rounded-[8px] p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Add Study Note</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Save key concepts, architectural patterns, or STAR interview answers.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createNote} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono">Title</Label>
              <Input
                placeholder="e.g. Distributed Caching Strategies"
                value={nForm.title}
                onChange={(e) => setNForm({ ...nForm, title: e.target.value })}
                className="h-8 text-xs rounded-[4px] bg-background border-border"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono">Category</Label>
              <Input
                placeholder="e.g. System Design, React, STAR Behavioral"
                value={nForm.category}
                onChange={(e) => setNForm({ ...nForm, category: e.target.value })}
                className="h-8 text-xs rounded-[4px] bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono">Notes & Key Points</Label>
              <Textarea
                placeholder="Write your study notes, trade-offs, and key learnings..."
                value={nForm.content}
                onChange={(e) => setNForm({ ...nForm, content: e.target.value })}
                className="min-h-[120px] text-xs rounded-[4px] bg-background border-border resize-none"
                required
              />
            </div>
            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNOpen(false)}
                className="h-8 text-xs rounded-[4px] font-mono cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingNote}
                className="h-8 text-xs rounded-[4px] font-mono bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
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
