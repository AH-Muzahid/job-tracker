"use client"

import React from "react"
import { Mic, Sparkles, Award, History, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface InterviewPrepBentoHeroProps {
  onStartMockInterview: () => void
  totalDiscussions: number
  totalSessions: number
  totalNotes: number
}

export function InterviewPrepBentoHero({
  onStartMockInterview,
  totalSessions,
  totalNotes,
}: InterviewPrepBentoHeroProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 pt-1">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Interview Prep Studio
          </h1>
          <Badge
            variant="secondary"
            className="text-[10px] font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
          >
            <Sparkles className="h-2.5 w-2.5 mr-1 text-indigo-500" />
            AI Coach & Voice Room
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
          Master deep technical concepts, explore architecture trade-offs, and conduct live spoken mock interviews with instant STAR reports.
        </p>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <div className="hidden md:flex items-center gap-3 mr-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <History className="h-3.5 w-3.5 text-indigo-500" />
            <strong className="text-foreground">{totalSessions}</strong> Mock Runs
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5 text-purple-500" />
            <strong className="text-foreground">{totalNotes}</strong> Saved Notes
          </span>
        </div>

        <Button
          size="sm"
          onClick={onStartMockInterview}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs gap-1.5 h-9 px-4 rounded-xl cursor-pointer"
        >
          <Mic className="h-3.5 w-3.5 text-white animate-pulse" />
          <span>Start Spoken Mock</span>
        </Button>
      </div>
    </div>
  )
}
