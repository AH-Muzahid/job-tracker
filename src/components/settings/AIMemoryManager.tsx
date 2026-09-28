"use client"

import React, { useState, useEffect } from "react"
import { Trash2, Plus, Loader2, BrainCircuit, RefreshCw, UserCheck, Search } from "lucide-react"
import {
  BlueprintCard,
  BlueprintCardHeader,
  BlueprintCardTitle,
  BlueprintCardContent,
  EmptyState,
} from "@/components/primitives"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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

const CATEGORIES = ["all", "preference", "skill", "experience", "constraint", "general"] as const

export function AIMemoryManager({ initialMemories, isLoading = false }: AIMemoryManagerProps) {
  const [memories, setMemories] = useState<MemoryItem[]>(initialMemories || [])
  const [loading, setLoading] = useState(isLoading && !initialMemories)
  const [newContent, setNewContent] = useState("")
  const [newCategory, setNewCategory] = useState("preference")
  const [adding, setAdding] = useState(false)
  const [syncingProfile, setSyncingProfile] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

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

  const filteredMemories = memories.filter((m) => {
    const matchesCategory = filterCategory === "all" || m.category.toLowerCase() === filterCategory.toLowerCase()
    const matchesSearch = !searchQuery.trim() || m.content.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <BlueprintCard>
      <BlueprintCardHeader className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-[4px] border border-border bg-muted/40 text-foreground shrink-0 shadow-2xs">
            <BrainCircuit className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono font-medium tracking-wider text-muted-foreground uppercase whitespace-nowrap block">
              AI / KNOWLEDGE
            </span>
            <BlueprintCardTitle className="text-sm sm:text-base font-semibold tracking-tight text-foreground truncate">
              Semantic Memory & Constraints
            </BlueprintCardTitle>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSyncProfile}
            disabled={syncingProfile}
            className="rounded-[4px] text-xs h-7 px-2.5 gap-1.5 font-medium border-border hover:bg-muted/40 cursor-pointer"
            title="Import facts from Profile Setup"
          >
            <RefreshCw className={cn("h-3 w-3", syncingProfile && "animate-spin text-primary")} />
            <span>{syncingProfile ? "Syncing..." : "Sync Profile"}</span>
          </Button>

          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] font-mono text-[10px] uppercase border border-border bg-muted/40 text-muted-foreground shrink-0">
            <span className="size-1.5 rounded-full bg-primary/70 shrink-0" />
            {memories.length} {memories.length === 1 ? "Fact" : "Facts"}
          </span>
        </div>
      </BlueprintCardHeader>

      <BlueprintCardContent className="space-y-4 p-4 sm:p-5 pt-4 sm:pt-5">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Permanent career facts, constraints, and salary expectations automatically recalled by AI during outreach and interview preparation.
        </p>

        {/* Add Memory Form */}
        <form onSubmit={handleAddMemory} className="p-3 sm:p-3.5 rounded-[6px] border border-border bg-muted/15 space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="rounded-[4px] border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 h-8 w-full sm:w-36 shrink-0 transition-colors cursor-pointer"
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
              className="rounded-[4px] text-xs h-8 border-border bg-background flex-1 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary transition-colors"
            />
            <Button
              type="submit"
              size="sm"
              disabled={adding || !newContent.trim()}
              className="rounded-[4px] text-xs h-8 px-4 gap-1.5 shrink-0 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs transition-colors self-stretch sm:self-auto justify-center"
            >
              {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span>Remember</span>
            </Button>
          </div>
        </form>

        {/* Category Filters & Search */}
        {memories.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterCategory(cat)}
                  className={cn(
                    "px-2.5 py-1 rounded-[4px] font-mono text-[10px] uppercase border cursor-pointer transition-colors whitespace-nowrap",
                    filterCategory === cat
                      ? "border-foreground bg-foreground text-background font-semibold"
                      : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-44">
              <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search facts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-7 pl-6 pr-2 rounded-[4px] font-mono text-[11px] border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        )}

        {/* Memories List */}
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground font-mono text-xs gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Loading retained memories...</span>
          </div>
        ) : memories.length === 0 ? (
          <EmptyState
            icon={BrainCircuit}
            title="No Retained Memories Yet"
            description="As you chat with the AI assistant, it will record your career facts and preferences. You can also import Profile Setup data in 1 click."
            action={{
              label: syncingProfile ? "Syncing..." : "Import Facts from Profile Setup",
              onClick: handleSyncProfile,
              icon: UserCheck,
            }}
          />
        ) : filteredMemories.length === 0 ? (
          <div className="py-6 text-center text-xs font-mono text-muted-foreground">
            No memories matched &quot;{searchQuery || filterCategory}&quot;
          </div>
        ) : (
          <div className="divide-y divide-border/60 rounded-[6px] border border-border bg-card overflow-hidden font-mono text-xs">
            {filteredMemories.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 gap-3 hover:bg-muted/30 transition-colors">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-[2px] border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground">
                      {m.category}
                    </span>
                    {m.source && (
                      <span className="text-[10px] text-muted-foreground">
                        via {m.source}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground font-normal leading-relaxed break-words font-sans">{m.content}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteMemory(m.id)}
                  disabled={deletingId === m.id}
                  className="rounded-[4px] h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 cursor-pointer"
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
      </BlueprintCardContent>
    </BlueprintCard>
  )
}
