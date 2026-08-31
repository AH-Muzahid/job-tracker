"use client"

import React from "react"
import { Mic, CheckCircle2, Brain, Zap, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DashboardCard } from "@/components/dashboard-card"
import { DecorIcon } from "@/components/decor-icon"
import { Badge } from "@/components/ui/badge"

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
      turns: 5,
      description: "React 19, Next.js App Router, SSR caching, database indexing, and API design.",
      tag: "Popular",
    },
    {
      title: "Distributed Backend Architect",
      role: "Distributed Backend Architect",
      company: "Enterprise Scale",
      type: "System Design",
      tone: "strict",
      turns: 5,
      description: "Distributed caching, Redis token bucket rate limiting, event queues, and fault tolerance.",
      tag: "Staff Level",
    },
    {
      title: "Engineering Leadership & Behavioral",
      role: "Engineering Manager / Lead",
      company: "Global Tech",
      type: "Behavioral",
      tone: "startup-cto",
      turns: 5,
      description: "STAR method behavioral questioning: resolving team conflict, leading outages, and trade-offs.",
      tag: "STAR Method",
    },
  ]

  return (
    <div className="space-y-6">
      {/* 1. Main Action Hero Card in Efferd Style */}
      <div className="relative border border-border bg-border">
        <DecorIcon className="hidden md:block" position="top-left" />
        <div className="bg-background p-5 sm:p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-muted border border-border text-foreground">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Voice AI Simulation
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Bilingual • Banglish & English
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
                Spoken AI Mock Interview Room
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Practice realistic spoken interview rounds with instant verbal follow-ups, hands-free turn taking, and a post-interview STAR Knowledge Gap analysis.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
              <Button
                onClick={onStartCustom}
                size="sm"
                className="text-xs sm:text-sm font-medium h-9 px-5 cursor-pointer shadow-xs"
              >
                <Mic className="size-3.5 mr-1.5" />
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
                  className="text-xs h-8 cursor-pointer font-medium"
                >
                  <span>Practice for {customCompany}</span>
                </Button>
              )}
            </div>
          </div>

          {/* 3 Steps Explainer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-border">
            <div className="flex items-start gap-3">
              <div className="flex size-7 items-center justify-center rounded-md bg-muted text-foreground border border-border shrink-0 mt-0.5">
                <Mic className="size-3.5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">1. Speak Naturally</p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Answer verbally in Banglish or English with hands-free turn taking.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex size-7 items-center justify-center rounded-md bg-muted text-foreground border border-border shrink-0 mt-0.5">
                <Brain className="size-3.5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">2. Adaptive Follow-ups</p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  AI interviewer deeply probes edge cases, complexity, and trade-offs.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex size-7 items-center justify-center rounded-md bg-muted text-foreground border border-border shrink-0 mt-0.5">
                <CheckCircle2 className="size-3.5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">3. STAR Gap Report</p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Receive scores, ideal staff answers, and 1-click revision note exports.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Curated Practice Tracks in Hairline Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Curated Practice Tracks</h3>
            <p className="text-xs text-muted-foreground">Pick a standardized role track or launch your own custom session</p>
          </div>
        </div>

        <div className="relative border border-border bg-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
            {presets.map((preset, idx) => (
              <div
                key={idx}
                className="bg-background p-4 sm:p-5 flex flex-col justify-between gap-4 transition-colors hover:bg-muted/10"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-muted border border-border text-foreground">
                      {preset.type}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                      {preset.turns} Questions
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-foreground leading-snug">{preset.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                      {preset.description}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {preset.tag}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => onStartPreset(preset)}
                    className="text-xs h-7.5 px-3 font-medium cursor-pointer"
                  >
                    <span>Start Track</span>
                    <ArrowRight className="size-3 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
