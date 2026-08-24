"use client"

import React, { useState, useEffect } from "react"
import { Brain, Trash2, Plus, Loader2, Sparkles, RefreshCw, UserCheck } from "lucide-react"
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

export interface AIMemoryManagerProps {
  initialMemories?: MemoryItem[] | null
  isLoading?: boolean
}

export function AIMemoryManager({ initialMemories, isLoading = false }: AIMemoryManagerProps) {
  const [memories, setMemories] = useState<MemoryItem[]>(initialMemories || [])
  const [loading, setLoading] = useState(isLoading && !initialMemories)
  const [newContent, setNewContent] = useState("")
  const [newCategory, setNewCategory] = useState("preference")
  const [adding, setAdding] = useState(false)
  const [syncingProfile, setSyncingProfile] = useState(false)
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
    if (initialMemories) {
      setMemories(initialMemories)
      setLoading(false)
    }
  }, [initialMemories])

  useEffect(() => {
    if (!initialMemories) {
      fetchMemories()
    }
  }, [initialMemories])

  const handleSyncProfile = async () => {
    try {
      setSyncingProfile(true)
      const res = await fetch("/api/user/memories/sync-profile", {
        method: "POST",
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to sync profile")

      if (data.memories) {
        setMemories(data.memories)
      }

      if (data.newCount > 0) {
        toast.success(`Imported ${data.newCount} facts from your Profile Setup!`)
      } else {
        toast.info("All facts from your Profile are already up to date.")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sync profile"
      toast.error(msg)
    } finally {
      setSyncingProfile(false)
    }
  }

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
    <Card className="rounded-xl border border-border/80 bg-card shadow-2xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Brain className="h-4 w-4 text-indigo-500" />
              <span>AI Persistent Memory & Knowledge</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Facts, career constraints, and preferences the AI remembers across all your chat and interview sessions.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncProfile}
              disabled={syncingProfile}
              className="text-xs h-7 gap-1.5 cursor-pointer font-medium"
              title="Import facts from Profile Setup"
            >
              <RefreshCw className={`h-3 w-3 ${syncingProfile ? "animate-spin" : ""}`} />
              <span>{syncingProfile ? "Syncing..." : "Sync from Profile"}</span>
            </Button>
            <Badge variant="secondary" className="text-xs">
              {memories.length} {memories.length === 1 ? "Fact" : "Facts"} Retained
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-1">
        {/* Add Memory Form */}
        <form onSubmit={handleAddMemory} className="flex flex-col sm:flex-row gap-2">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 h-8"
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
            className="text-xs h-8 flex-1"
          />
          <Button
            type="submit"
            size="sm"
            disabled={adding || !newContent.trim()}
            className="text-xs h-8 gap-1.5 shrink-0 cursor-pointer font-medium"
          >
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
          <div className="rounded-xl border border-dashed border-border/80 p-6 text-center text-muted-foreground space-y-2.5 bg-muted/20">
            <Sparkles className="h-5 w-5 mx-auto text-muted-foreground/60" />
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground">No explicit memories retained yet.</p>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                As you chat with the AI assistant, it will automatically record your preferences. You can also import your Profile Setup data in 1 click!
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncProfile}
              disabled={syncingProfile}
              className="text-xs h-8 gap-1.5 cursor-pointer font-medium mx-auto"
            >
              <UserCheck className="h-3.5 w-3.5 text-primary" />
              <span>Import Facts from Profile Setup</span>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-card overflow-hidden">
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
                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 cursor-pointer"
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
