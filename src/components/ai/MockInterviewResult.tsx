"use client"

import React from "react"
import Link from "next/link"
import { Mic, ArrowRight, BookOpen, CheckCircle2 } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface MockInterviewData {
  companyName?: string
  role?: string
  interviewType?: string
  topics?: string[]
  turns?: number
  summary?: string
}

export default function MockInterviewResult({ data }: { data: Record<string, unknown> }) {
  const interview = data as unknown as MockInterviewData

  const company = interview.companyName || "Target Company"
  const role = interview.role || "Software Engineer"
  const interviewType = interview.interviewType || "Technical"
  const turns = interview.turns || 5
  const topics =
    Array.isArray(interview.topics) && interview.topics.length > 0
      ? interview.topics
      : ["Core Technical Competencies", "System Architecture & Scalability", "STAR Behavioral Scenarios"]
  const summary =
    interview.summary || "Interactive spoken simulation with live microphone input and post-session STAR scoring report."

  const launchUrl = `/interview-prep?company=${encodeURIComponent(company)}&role=${encodeURIComponent(role)}&type=${encodeURIComponent(interviewType)}&turns=${turns}&autostart=true`

  return (
    <Card className="rounded-[6px] border border-border bg-card shadow-none overflow-hidden my-3">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/30 px-3.5 py-2.5 space-y-0">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Mic className="size-4 text-primary shrink-0" />
          <CardTitle className="text-xs font-semibold">
            Conversational Voice Mock Room
          </CardTitle>
        </div>
        <Badge
          variant="outline"
          className="text-[10px] font-mono font-medium rounded-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 flex items-center gap-1 shadow-none"
        >
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Voice Engine Online
        </Badge>
      </CardHeader>

      <CardContent className="p-3.5 space-y-3">
        {/* Role & Company Target */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2.5 border-b border-border/60">
          <div>
            <div className="text-xs font-bold text-foreground">
              {role}
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              Target: <span className="font-semibold text-foreground">{company}</span> • {interviewType} Focus
            </div>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground">
            {turns} Spoken Turns • STAR Debrief
          </div>
        </div>

        {/* Summary Description */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {summary}
        </p>

        {/* Focus Topics */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-wider">
            Evaluation Dimensions
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topics.map((topic, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-muted/60 text-foreground border border-border text-[11px] font-medium"
              >
                <CheckCircle2 className="size-3 text-primary shrink-0" />
                <span>{topic}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Primary Action Row */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-border/60">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 text-xs font-medium rounded-[4px] border-border text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Link href="/interview-prep">
              <BookOpen className="size-3.5 mr-1.5" />
              <span>Past Transcripts</span>
            </Link>
          </Button>

          <Button
            asChild
            size="sm"
            className="h-8 text-xs font-medium rounded-[4px] bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs gap-1.5"
          >
            <Link href={launchUrl}>
              <Mic className="size-3.5" />
              <span>Launch Voice Mock Room</span>
              <ArrowRight className="size-3.5 ml-0.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
