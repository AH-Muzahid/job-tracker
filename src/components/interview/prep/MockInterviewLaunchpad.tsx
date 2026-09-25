"use client"

import React from "react"
import { Mic, CheckCircle2, Brain, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  BlueprintCard,
  BlueprintCardHeader,
  BlueprintCardTitle,
  BlueprintCardDescription,
  BlueprintCardContent,
  BlueprintCardFooter,
} from "@/components/primitives"
import { StatusBadge } from "@/components/StatusBadge"

interface MockInterviewLaunchpadProps {
  onStartCustom: () => void
  onStartPreset: (preset: {
    role: string
    company: string
    type: string
    tone: string
    turns: number
  }) => void
  customCompany?: string
  customRole?: string
}

export function MockInterviewLaunchpad({
  onStartCustom,
  onStartPreset,
  customCompany,
  customRole,
}: MockInterviewLaunchpadProps) {
  const presets = [
    {
      title: "Senior Full-Stack Engineer",
      role: "Senior Full-Stack Engineer",
      company: "Modern Tech Startup",
      type: "Technical",
      tone: "friendly",
      turns: 8,
      description: "React 19, Next.js App Router, SSR caching, database indexing, and API design.",
      tag: "Popular",
    },
    {
      title: "Distributed Backend Architect",
      role: "Distributed Backend Architect",
      company: "Enterprise Scale",
      type: "System Design",
      tone: "strict",
      turns: 8,
      description: "Distributed caching, Redis token bucket rate limiting, event queues, and fault tolerance.",
      tag: "Staff Level",
    },
    {
      title: "Engineering Leadership & Behavioral",
      role: "Engineering Manager / Lead",
      company: "Global Tech",
      type: "Behavioral",
      tone: "startup-cto",
      turns: 8,
      description: "STAR method behavioral questioning: resolving team conflict, leading outages, and trade-offs.",
      tag: "STAR Method",
    },
  ]

  return (
    <div className="space-y-6">
      {/* 1. Main Action Hero Card in Blueprint Standard */}
      <BlueprintCard>
        <BlueprintCardHeader className="flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2 py-0.5 rounded-[4px] bg-muted border border-border text-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Voice AI Simulation
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                Bilingual • Banglish & English
              </span>
            </div>
            <BlueprintCardTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
              Spoken AI Mock Interview Room
            </BlueprintCardTitle>
            <BlueprintCardDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Practice realistic spoken interview rounds with instant verbal follow-ups, hands-free turn taking, and a post-interview STAR Knowledge Gap analysis.
            </BlueprintCardDescription>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
            <Button
              onClick={onStartCustom}
              size="sm"
              className="text-xs font-mono h-8.5 px-4 rounded-[4px] cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
            >
              <Mic className="size-3.5" />
              <span>Start Mock Interview</span>
            </Button>
            {customCompany && (
              <Button
                onClick={() =>
                  onStartPreset({
                    role: customRole || "Software Engineer",
                    company: customCompany,
                    type: "Technical",
                    tone: "strict",
                    turns: 5,
                  })
                }
                variant="outline"
                size="sm"
                className="text-xs font-mono h-8.5 px-3.5 rounded-[4px] cursor-pointer border-border"
              >
                <span>Practice for {customCompany}</span>
              </Button>
            )}
          </div>
        </BlueprintCardHeader>

        <BlueprintCardContent className="pt-4">
          {/* 3 Steps Explainer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/60">
            <div className="flex items-start gap-3 p-3 rounded-[4px] border border-border/60 bg-muted/20">
              <div className="flex size-7 items-center justify-center rounded-[4px] bg-background text-foreground border border-border shrink-0 mt-0.5">
                <Mic className="size-3.5 text-primary" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">1. Speak Naturally</p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Answer verbally in Banglish or English with hands-free turn taking.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-[4px] border border-border/60 bg-muted/20">
              <div className="flex size-7 items-center justify-center rounded-[4px] bg-background text-foreground border border-border shrink-0 mt-0.5">
                <Brain className="size-3.5 text-primary" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">2. Adaptive Follow-ups</p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  AI interviewer deeply probes edge cases, complexity, and trade-offs.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-[4px] border border-border/60 bg-muted/20">
              <div className="flex size-7 items-center justify-center rounded-[4px] bg-background text-foreground border border-border shrink-0 mt-0.5">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">3. STAR Gap Report</p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Receive scores, ideal staff answers, and 1-click revision note exports.
                </p>
              </div>
            </div>
          </div>
        </BlueprintCardContent>
      </BlueprintCard>

      {/* 2. Curated Practice Tracks in Hairline Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Curated Practice Tracks</h3>
            <p className="text-xs text-muted-foreground">Pick a standardized role track or launch your own custom session</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {presets.map((preset, idx) => (
            <BlueprintCard key={idx} className="flex flex-col justify-between">
              <BlueprintCardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between gap-2 w-full">
                  <StatusBadge
                    status={preset.type === "Technical" ? "interviewing" : preset.type === "System Design" ? "staged" : "offer"}
                    customLabel={preset.type}
                    size="sm"
                  />
                  <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                    {preset.turns} Questions
                  </span>
                </div>
              </BlueprintCardHeader>

              <BlueprintCardContent className="space-y-2 py-3">
                <h4 className="text-sm font-semibold text-foreground leading-snug">{preset.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {preset.description}
                </p>
              </BlueprintCardContent>

              <BlueprintCardFooter className="pt-3 border-t border-border/60 flex items-center justify-between">
                <span className="text-[11px] font-mono text-muted-foreground">
                  {preset.tag}
                </span>
                <Button
                  size="sm"
                  onClick={() => onStartPreset(preset)}
                  className="text-xs font-mono h-7.5 px-3 rounded-[4px] cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
                >
                  <span>Start Track</span>
                  <ArrowRight className="size-3" />
                </Button>
              </BlueprintCardFooter>
            </BlueprintCard>
          ))}
        </div>
      </div>
    </div>
  )
}
