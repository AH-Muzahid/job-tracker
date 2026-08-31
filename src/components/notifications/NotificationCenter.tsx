"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Compass,
  TrendingUp,
  Clock,
  Briefcase,
  Layers,
  Inbox,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: "DAILY_HUNT" | "WEEKLY_DIGEST" | "FOLLOW_UP" | string
  link?: string | null
  isRead: boolean
  createdAt: string
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  // Fetch notifications
  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?limit=30")
      if (!res.ok) throw new Error("Failed to fetch notifications")
      const json = await res.json()
      return json.data as { notifications: NotificationItem[]; unreadCount: number }
    },
    refetchInterval: 30000, // Poll every 30s
    staleTime: 10000,
  })

  const notifications = data?.notifications || []
  const unreadCount = data?.unreadCount || 0

  // Mark single as read
  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      })
      if (!res.ok) throw new Error("Failed to mark as read")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      })
      if (!res.ok) throw new Error("Failed to mark all as read")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      toast.success("All notifications marked as read")
    },
  })

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "unread") return !n.isRead
    return true
  })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "DAILY_HUNT":
        return <Compass className="size-3.5 text-sky-500" />
      case "WEEKLY_DIGEST":
        return <TrendingUp className="size-3.5 text-emerald-500" />
      case "FOLLOW_UP":
        return <Clock className="size-3.5 text-amber-500" />
      default:
        return <Layers className="size-3.5 text-primary" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "DAILY_HUNT":
        return "Daily Hunt"
      case "WEEKLY_DIGEST":
        return "Weekly Digest"
      case "FOLLOW_UP":
        return "Follow-up"
      default:
        return "Notification"
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "size-8 cursor-pointer relative transition-colors",
          isOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
        aria-label="Notifications"
        title="Notifications Center"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex size-2 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-primary" />
          </span>
        )}
      </Button>

      {isOpen && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-lg border border-border bg-card/98 shadow-xl backdrop-blur-md z-50 overflow-hidden",
            "animate-in fade-in-50 zoom-in-95 duration-150"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5 bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground tracking-tight">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
              >
                <CheckCheck className="size-3" />
                <span>Mark all read</span>
              </Button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 px-3.5 py-1.5 border-b border-border/60 bg-muted/10 text-xs">
            <button
              onClick={() => setActiveFilter("all")}
              className={cn(
                "px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer",
                activeFilter === "all"
                  ? "bg-background text-foreground shadow-2xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter("unread")}
              className={cn(
                "px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer",
                activeFilter === "unread"
                  ? "bg-background text-foreground shadow-2xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-muted-foreground animate-pulse">
                Loading notifications...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <div className="mx-auto size-8 rounded-full bg-muted/60 flex items-center justify-center mb-2 text-muted-foreground">
                  <Inbox className="size-4" />
                </div>
                <p className="text-xs font-medium text-foreground">All caught up</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {activeFilter === "unread" ? "No unread notifications" : "No recent activity or notifications"}
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "p-3 text-left transition-colors flex gap-2.5 group relative",
                    !item.isRead ? "bg-primary/4 hover:bg-primary/7" : "hover:bg-muted/40"
                  )}
                >
                  <div className="mt-0.5 size-6 rounded bg-muted/70 flex items-center justify-center shrink-0 border border-border/50">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                          {getTypeLabel(item.type)}
                        </span>
                        {!item.isRead && (
                          <span className="size-1.5 rounded-full bg-primary inline-block shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    <h4 className="text-xs font-medium text-foreground leading-snug line-clamp-1 mb-0.5">
                      {item.title}
                    </h4>

                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {item.message}
                    </p>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      {item.link ? (
                        <Link
                          href={item.link}
                          onClick={() => {
                            if (!item.isRead) markReadMutation.mutate(item.id)
                            setIsOpen(false)
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
                        >
                          <span>View Details</span>
                          <ExternalLink className="size-2.5" />
                        </Link>
                      ) : (
                        <div />
                      )}

                      {!item.isRead && (
                        <button
                          onClick={() => markReadMutation.mutate(item.id)}
                          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Mark as read"
                        >
                          <Check className="size-3" />
                          <span>Mark read</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-3.5 py-2 bg-muted/20 flex items-center justify-between text-[11px]">
            <Link
              href="/applications"
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Briefcase className="size-3" />
              <span>Applications</span>
            </Link>
            <Link
              href="/weekly-goals"
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <TrendingUp className="size-3" />
              <span>Weekly Goals</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
