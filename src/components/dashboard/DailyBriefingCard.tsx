"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Bot, ArrowRight, Zap, Clock, Calendar, CheckCircle2, ChevronRight, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { ExecutiveBriefing } from "@/lib/dashboard/briefing-engine"

export function DailyBriefingCard() {
  const [briefing, setBriefing] = useState<ExecutiveBriefing | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchBriefing(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/dashboard/briefing")
      if (!res.ok) throw new Error("Failed to load executive briefing")
      const data = await res.json()
      setBriefing(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load briefing")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchBriefing()
  }, [])

  if (loading) {
    return (
      <div className="w-full bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-6 rounded-md bg-muted" />
            <Skeleton className="h-5 w-48 rounded bg-muted" />
          </div>
          <Skeleton className="h-4 w-24 rounded bg-muted" />
        </div>
        <div className="space-y-2 pt-1">
          <Skeleton className="h-4 w-full rounded bg-muted/60" />
          <Skeleton className="h-4 w-5/6 rounded bg-muted/60" />
          <Skeleton className="h-4 w-3/4 rounded bg-muted/60" />
        </div>
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 w-32 rounded-lg bg-muted/80" />
          <Skeleton className="h-8 w-32 rounded-lg bg-muted/80" />
        </div>
      </div>
    )
  }

  if (error && !briefing) {
    return (
      <div className="w-full bg-card border border-border/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-muted-foreground text-sm">
          <AlertCircle className="size-4 text-amber-500" />
          <span>Daily briefing temporarily unavailable</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => fetchBriefing(true)} className="h-8 text-xs">
          <RefreshCw className="size-3.5 mr-1.5" /> Retry
        </Button>
      </div>
    )
  }

  if (!briefing) return null

  const summaryLines = briefing.executiveSummary || []
  const priorityActions = briefing.priorityActions || []

  return (
    <div className="w-full bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden group">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Bot className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                Daily Strategic Briefing
              </h3>
              <Badge variant="outline" className="text-[10px] font-mono uppercase bg-primary/5 text-primary border-primary/20 py-0 px-1.5">
                Autonomous
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline-block">
            {briefing.generatedAt ? new Date(briefing.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Live"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchBriefing(true)}
            disabled={refreshing}
            className="size-7 text-muted-foreground hover:text-foreground"
            title="Refresh briefing"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 3 Strategic Summary Points */}
      <div className="space-y-2 text-sm text-foreground/90 font-normal leading-relaxed mb-5">
        {summaryLines.length > 0 ? (
          summaryLines.map((line, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <div className="size-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <p className="flex-1 text-xs sm:text-sm">{line}</p>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">Pipeline steady. No urgent bottlenecks detected today.</p>
        )}
      </div>

      {/* Actionable Priority Badges with Deep Links */}
      {priorityActions.length > 0 && (
        <div className="pt-3 border-t border-border/60">
          <div className="text-[11px] font-medium text-muted-foreground mb-2.5 uppercase tracking-wider">
            Prioritized Recommended Actions
          </div>
          <div className="flex flex-wrap gap-2">
            {priorityActions.map((action) => {
              const getIcon = () => {
                switch (action.type) {
                  case "REVIEW_STAGED":
                    return <Zap className="size-3 text-amber-500 mr-1.5" />
                  case "SEND_FOLLOWUP":
                    return <Clock className="size-3 text-rose-500 mr-1.5" />
                  case "PREP_INTERVIEW":
                    return <Calendar className="size-3 text-purple-500 mr-1.5" />
                  default:
                    return <CheckCircle2 className="size-3 text-emerald-500 mr-1.5" />
                }
              }

              return (
                <Link key={action.id} href={action.href}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-medium border-border/80 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer rounded-lg flex items-center px-3"
                  >
                    {getIcon()}
                    <span>{action.title}</span>
                    <ChevronRight className="size-3 ml-1 text-muted-foreground" />
                  </Button>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
