"use client"

import React from "react"
import { Mic, ArrowRight, Sparkles, CheckCircle2, Shield, Brain, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
      {/* 1. Main Action Hero Card */}
      <Card className="border border-border bg-card shadow-2xs overflow-hidden">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[11px] font-medium bg-muted/50 text-foreground">
                  AI Voice Simulation
                </Badge>
                <span className="text-[11px] text-muted-foreground">Bilingual • Banglish & English</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                Spoken AI Mock Interview Room
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Practice realistic spoken interview rounds with instant verbal follow-ups, hands-free turn taking, and a post-interview STAR Knowledge Gap analysis.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
              <Button
                onClick={onStartCustom}
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm font-medium h-10 px-5 shadow-xs cursor-pointer"
              >
                <Mic className="h-4 w-4 mr-1.5" />
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-muted text-foreground border border-border shrink-0 mt-0.5">
                <Mic className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">1. Speak Naturally</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  Answer verbally in Banglish or English with hands-free turn taking.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-muted text-foreground border border-border shrink-0 mt-0.5">
                <Brain className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">2. Adaptive Follow-ups</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  AI interviewer deeply probes edge cases, complexity, and trade-offs.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-muted text-foreground border border-border shrink-0 mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">3. STAR Gap Report</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  Receive scores, ideal staff answers, and 1-click revision note exports.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Quick-Start Presets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Curated Practice Tracks</h3>
            <p className="text-xs text-muted-foreground">Pick a role track or configure your own custom interview above</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {presets.map((preset, idx) => (
            <Card
              key={idx}
              className="border border-border bg-card shadow-2xs hover:border-border/80 transition-all flex flex-col justify-between p-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[10px] font-medium bg-muted/50 text-foreground">
                    {preset.type}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{preset.turns} Questions</span>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground leading-snug">{preset.title}</h4>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                    {preset.description}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-border mt-3 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-medium">
                  {preset.tag}
                </span>
                <Button
                  size="sm"
                  onClick={() => onStartPreset(preset)}
                  className="text-xs h-7 px-3 bg-primary text-primary-foreground hover:bg-primary/90 font-medium cursor-pointer"
                >
                  Start Track
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
