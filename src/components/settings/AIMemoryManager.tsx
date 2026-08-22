"use client"

import React, { useState, useEffect } from "react"
import { Brain, Trash2, Plus, Loader2, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface MemoryItem {
  id: string
  category: string
  content: string
  source?: string
  createdAt: string
}

export function AIMemoryManager() {
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newContent, setNewContent] = useState("")
  const [newCategory, setNewCategory] = useState("preference")
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchMemories = async () => {
    try {
      const res = await fetch("/api/user/memories")
      if (res.ok) {
        const data = await res.json()
        setMemories(data)
      }
    } catch (err) {
      console.error("Failed to load memories:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMemories()
  }, [])

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newContent.trim()) return

    setAdding(true)
    try {
      const res = await fetch("/api/user/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: newCategory,
          content: newContent.trim(),
        }),
      })

      if (!res.ok) throw new Error("Failed to save memory")

      const created = await res.json()
      setMemories((prev) => [created, ...prev])
      setNewContent("")
      toast.success("Memory saved to AI knowledge base")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add memory"
      toast.error(msg)
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteMemory = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/user/memories/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete memory")

      setMemories((prev) => prev.filter((m) => m.id !== id))
      toast.success("Memory removed")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete memory"
      toast.error(msg)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-indigo-500" />
              <span>AI Persistent Memory & Knowledge</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Facts, career constraints, and preferences the AI remembers across all your chat sessions.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs">
            {memories.length} {memories.length === 1 ? "Fact" : "Facts"} Retained
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Memory Form */}
        <form onSubmit={handleAddMemory} className="flex flex-col sm:flex-row gap-2">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="preference">Preference</option>
            <option value="skill">Skill / Stack</option>
            <option value="experience">Experience</option>
            <option value="constraint">Constraint / Notice</option>
            <option value="general">General</option>
          </select>
          <Input
            placeholder="e.g. Only apply for remote roles in US/EU timezones"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            disabled={adding}
            className="text-xs h-9 flex-1"
          />
          <Button type="submit" size="sm" disabled={adding || !newContent.trim()} className="text-xs gap-1.5 shrink-0">
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            <span>Remember</span>
          </Button>
        </form>

        {/* Memories List */}
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground text-xs gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading retained memories...</span>
          </div>
        ) : memories.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground space-y-1.5">
            <Sparkles className="h-5 w-5 mx-auto text-muted-foreground/60" />
            <p className="text-xs font-medium text-foreground">No explicit memories retained yet.</p>
            <p className="text-[11px] text-muted-foreground">
              As you chat with the AI assistant, it will automatically learn and record your key preferences here.
            </p>
          </div>
        ) : (
          <div className="divide-y rounded-xl border bg-card overflow-hidden">
            {memories.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 gap-3 hover:bg-muted/40 transition-colors">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      {m.category}
                    </span>
                    {m.source && (
                      <span className="text-[10px] text-muted-foreground">
                        via {m.source}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground font-normal leading-relaxed break-words">{m.content}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteMemory(m.id)}
                  disabled={deletingId === m.id}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                  title="Forget this fact"
                >
                  {deletingId === m.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
