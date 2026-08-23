"use client"

import React from "react"
import { Radio, Mic } from "lucide-react"
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
  totalDiscussions,
  totalSessions,
  totalNotes,
}: InterviewPrepBentoHeroProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Main Bento Hero Card */}
      <div className="lg:col-span-8 rounded-3xl border bg-gradient-to-br from-indigo-950/30 via-background to-purple-950/20 p-5 sm:p-6 flex flex-col justify-between shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2.5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Radio className="h-3 w-3 animate-pulse text-emerald-400" />
            <span>Live Spoken Mock Interview & Concept Lab</span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">
            Master Your Next Tech Interview
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl">
            Conduct realistic duplex voice mock interviews with AI interviewers in বাংলা, English, or Banglish, or deep-dive into complex engineering concepts with instant hiring-grade answers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-4 mt-3 border-t border-border/40 relative z-10">
          <span className="text-[11px] font-semibold text-muted-foreground">Personas available:</span>
          <span className="text-[11px] font-medium bg-muted/60 px-2 py-0.5 rounded-md text-foreground">👩‍💻 তানিয়া (Mentor)</span>
          <span className="text-[11px] font-medium bg-muted/60 px-2 py-0.5 rounded-md text-foreground">👨‍💼 তানভীর (Bar Raiser)</span>
          <span className="text-[11px] font-medium bg-muted/60 px-2 py-0.5 rounded-md text-foreground">👩‍💼 Sarah (Architect)</span>
          <span className="text-[11px] font-medium bg-muted/60 px-2 py-0.5 rounded-md text-foreground">👨‍💻 David (Startup CTO)</span>
        </div>
      </div>

      {/* Right Bento Action & Stats Card */}
      <div className="lg:col-span-4 rounded-3xl border bg-card p-5 sm:p-6 flex flex-col justify-between shadow-xs gap-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Voice Mock Simulation</span>
            <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 font-bold">
              5 Structured Phases
            </Badge>
          </div>

          <Button
            size="lg"
            onClick={onStartMockInterview}
            className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-md gap-2 h-12 rounded-2xl cursor-pointer"
          >
            <Mic className="h-4 w-4 animate-pulse text-white" />
            <span>Launch Voice Mock Interview</span>
          </Button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40 text-center">
          <div className="p-2 rounded-xl bg-muted/30">
            <p className="text-xs font-bold text-foreground">{totalDiscussions}</p>
            <p className="text-[9.5px] text-muted-foreground">Q&A Turns</p>
          </div>
          <div className="p-2 rounded-xl bg-muted/30">
            <p className="text-xs font-bold text-foreground">{totalSessions}</p>
            <p className="text-[9.5px] text-muted-foreground">Mock Runs</p>
          </div>
          <div className="p-2 rounded-xl bg-muted/30">
            <p className="text-xs font-bold text-foreground">{totalNotes}</p>
            <p className="text-[9.5px] text-muted-foreground">Notes Saved</p>
          </div>
        </div>
      </div>
    </div>
  )
}
