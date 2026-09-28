"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import {
  SquarePen,
  Search,
  MessageSquare,
  Trash2,
  Pencil,
  Check,
  X,
  PanelLeftClose,
  PanelLeft,
  Loader2,
  ChevronLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export interface ChatSession {
  id: string
  title: string
  mode: string | null
  updatedAt: string
  createdAt: string
  _count?: { messages: number }
}

interface ChatHistorySidebarProps {
  activeChatId: string | null
  onSelectChat: (id: string) => void
  onNewChat: () => void
  isOpen: boolean
  onToggleOpen: () => void
  isMobileDrawer?: boolean
}

type DateGroupKey = "Today" | "Yesterday" | "Previous 7 Days" | "Older"

export default function ChatHistorySidebar({
  activeChatId,
  onSelectChat,
  onNewChat,
  isOpen,
  onToggleOpen,
  isMobileDrawer = false,
}: ChatHistorySidebarProps) {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")

  // Fetch user's chat sessions
  const { data: sessions = [], isLoading } = useQuery<ChatSession[]>({
    queryKey: ["ai", "sessions"],
    queryFn: async () => {
      const res = await fetch("/api/ai/sessions")
      if (!res.ok) throw new Error("Failed to load sessions")
      return res.json()
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })

  // Mutation to delete a chat session
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ai/sessions/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete chat")
      return id
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<ChatSession[]>(["ai", "sessions"], (old = []) =>
        old.filter((s) => s.id !== deletedId)
      )
      toast.success("Chat deleted")
      if (activeChatId === deletedId) {
        onNewChat()
      }
    },
    onError: () => {
      toast.error("Could not delete chat")
    },
  })

  // Mutation to rename a chat session
  const renameMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const res = await fetch(`/api/ai/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
      if (!res.ok) throw new Error("Failed to rename chat")
      return { id, title }
    },
    onSuccess: ({ id, title }) => {
      queryClient.setQueryData<ChatSession[]>(["ai", "sessions"], (old = []) =>
        old.map((s) => (s.id === id ? { ...s, title } : s))
      )
      setEditingId(null)
      toast.success("Title updated")
    },
    onError: () => {
      toast.error("Could not rename chat")
    },
  })

  const handleStartRename = (s: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(s.id)
    setEditTitle(s.title || "New Chat")
  }

  const handleSaveRename = (id: string, e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!editTitle.trim()) {
      setEditingId(null)
      return
    }
    renameMutation.mutate({ id, title: editTitle.trim() })
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("Delete this conversation?")) {
      deleteMutation.mutate(id)
    }
  }

  // Filter and group sessions by time
  const groupedSessions = useMemo(() => {
    const filtered = sessions.filter((s) => {
      if (!searchQuery.trim()) return true
      return s.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
    })

    const now = new Date().getTime()
    const oneDay = 24 * 60 * 60 * 1000

    const groups: Record<DateGroupKey, ChatSession[]> = {
      Today: [],
      Yesterday: [],
      "Previous 7 Days": [],
      Older: [],
    }

    filtered.forEach((session) => {
      const date = new Date(session.updatedAt || session.createdAt).getTime()
      const diffDays = (now - date) / oneDay

      if (diffDays < 1) {
        groups.Today.push(session)
      } else if (diffDays < 2) {
        groups.Yesterday.push(session)
      } else if (diffDays < 7) {
        groups["Previous 7 Days"].push(session)
      } else {
        groups.Older.push(session)
      }
    })

    return groups
  }, [sessions, searchQuery])

  // Desktop collapsed rail
  if (!isOpen && !isMobileDrawer) {
    return (
      <div className="hidden md:flex flex-col items-center justify-between py-3 px-1.5 border-r border-border bg-card/40 w-12 shrink-0 h-full select-none">
        <div className="flex flex-col items-center gap-2">
          <Link
            href="/dashboard"
            className="flex size-8 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Back to Dashboard"
            aria-label="Back to Dashboard"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleOpen}
            className="size-8 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
            title="Expand chat history"
            aria-label="Expand chat history"
          >
            <PanelLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onNewChat}
            className="size-8 rounded-sm border-border bg-background hover:bg-muted text-foreground cursor-pointer"
            title="New Chat"
            aria-label="New Chat"
          >
            <SquarePen className="size-4" />
          </Button>
        </div>
      </div>
    )
  }

  const content = (
    <aside
      className={cn(
        "flex flex-col h-full bg-card/60 backdrop-blur-md border-r border-border select-none shrink-0 transition-all duration-200",
        isMobileDrawer ? "w-72 max-w-[85vw]" : "w-64"
      )}
      aria-label="Chat History"
    >
      {/* Brand & Back to Dashboard */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between border-b border-border/50 shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
          title="Back to Dashboard"
          aria-label="Back to Dashboard"
        >
          <ChevronLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Dashboard</span>
        </Link>
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60 select-none">CareerTrack</span>
      </div>

      {/* Top action header: New Chat + Collapse */}
      <div className="p-3 border-b border-border/70 flex items-center justify-between gap-2 shrink-0">
        <Button
          onClick={onNewChat}
          className="flex-1 justify-between h-9 px-3 rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium shadow-none cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <SquarePen className="size-3.5" />
            <span>New Chat</span>
          </span>
          <kbd className="hidden sm:inline-block text-[10px] opacity-70 font-mono">⌘K</kbd>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleOpen}
          className="size-8 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer shrink-0"
          title={isMobileDrawer ? "Close history" : "Collapse history"}
          aria-label={isMobileDrawer ? "Close history" : "Collapse history"}
        >
          {isMobileDrawer ? <X className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
      </div>

      {/* Search Input */}
      <div className="px-3 pt-2.5 pb-1.5 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            aria-label="Search conversations"
            className="w-full bg-background border border-border rounded-sm pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-xs gap-2">
            <Loader2 className="size-3.5 animate-spin" />
            <span>Loading history...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground px-3">
            <MessageSquare className="size-5 mx-auto mb-2 opacity-50" />
            <p>No previous conversations</p>
          </div>
        ) : (
          (Object.keys(groupedSessions) as DateGroupKey[]).map((groupKey) => {
            const list = groupedSessions[groupKey]
            if (list.length === 0) return null

            return (
              <div key={groupKey} className="space-y-1">
                <div className="px-2 text-[10px] font-mono uppercase tracking-wider font-semibold text-muted-foreground/80">
                  {groupKey}
                </div>
                <div className="space-y-0.5">
                  {list.map((s) => {
                    const isActive = s.id === activeChatId
                    const isEditing = editingId === s.id

                    if (isEditing) {
                      return (
                        <div
                          key={s.id}
                          className="flex items-center gap-1 p-1 rounded-sm bg-background border border-border"
                        >
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRename(s.id)
                              if (e.key === "Escape") setEditingId(null)
                            }}
                            autoFocus
                            className="flex-1 bg-transparent px-1.5 py-0.5 text-xs text-foreground outline-none"
                          />
                          <button
                            type="button"
                            onClick={(e) => handleSaveRename(s.id, e)}
                            className="p-1 rounded-sm text-emerald-500 hover:bg-muted"
                            title="Save"
                            aria-label="Save title"
                          >
                            <Check className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingId(null)
                            }}
                            className="p-1 rounded-sm text-muted-foreground hover:bg-muted"
                            title="Cancel"
                            aria-label="Cancel editing"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={s.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectChat(s.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") onSelectChat(s.id)
                        }}
                        className={cn(
                          "group flex items-center justify-between w-full px-2.5 py-2 rounded-sm text-xs cursor-pointer transition-colors text-left",
                          isActive
                            ? "bg-muted font-medium text-foreground border border-border/80"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
                        )}
                        aria-current={isActive ? "true" : undefined}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                          <MessageSquare className="size-3.5 shrink-0 opacity-70" />
                          <span className="truncate">{s.title || "New Chat"}</span>
                        </div>

                        {/* Rename and Delete Actions on Hover */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleStartRename(s, e)}
                            className="p-1 rounded-xs hover:bg-background text-muted-foreground hover:text-foreground"
                            title="Rename"
                            aria-label="Rename conversation"
                          >
                            <Pencil className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(s.id, e)}
                            className="p-1 rounded-xs hover:bg-background text-muted-foreground hover:text-destructive"
                            title="Delete"
                            aria-label="Delete conversation"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer Meta */}
      <div className="p-3 border-t border-border/70 text-[11px] text-muted-foreground flex items-center justify-between">
        <span className="font-mono text-[10px]">CareerTrack AI</span>
        <span className="tabular-nums font-mono text-[10px]">{sessions.length} chats</span>
      </div>
    </aside>
  )

  // Mobile Drawer mode with Backdrop
  if (isMobileDrawer) {
    if (!isOpen) return null
    return (
      <div className="fixed inset-0 z-50 md:hidden flex">
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-xs"
          onClick={onToggleOpen}
          aria-hidden="true"
        />
        <div className="relative z-10 h-full">{content}</div>
      </div>
    )
  }

  // Desktop Sidebar
  return content
}
