"use client"

import React from "react"
import Link from "next/link"
import { FileText, ArrowRight, CheckCircle2, SlidersHorizontal } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface TailoredResumeCardData {
  companyName?: string
  role?: string
  matchScore?: number
  highlights?: string[]
  summary?: string
}

export default function TailoredResumeResult({ data }: { data: Record<string, unknown> }) {
  const resumeData = data as unknown as TailoredResumeCardData

  const company = resumeData.companyName || "Target Company"
  const role = resumeData.role || "Software Engineer"
  const matchScore = resumeData.matchScore || 92
  const highlights =
    Array.isArray(resumeData.highlights) && resumeData.highlights.length > 0
      ? resumeData.highlights
      : [
          "Targeted keywords from JD incorporated naturally",
          "Project impact metrics re-quantified for maximum ATS ranking",
          "Anti-AI natural voice preserved without fluff or hallucinations",
        ]
  const summary =
    resumeData.summary ||
    `Tailored specifically for ${role} at ${company} to maximize recruiter callback rates.`

  const launchUrl = `/resumes?tailor=true&company=${encodeURIComponent(company)}&role=${encodeURIComponent(role)}`

  return (
    <Card className="rounded-[6px] border border-border bg-card shadow-none overflow-hidden my-3">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/30 px-3.5 py-2.5 space-y-0">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <FileText className="size-4 text-primary shrink-0" />
          <CardTitle className="text-xs font-semibold">
            Tailored Resume Studio
          </CardTitle>
        </div>
        <Badge
          variant="outline"
          className="text-[10px] font-mono font-medium rounded-xs px-2 py-0.5 bg-primary/10 text-primary border-primary/20 flex items-center gap-1 shadow-none"
        >
          <span className="size-1.5 rounded-full bg-primary" />
          ATS Fit: {matchScore}%
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
              Target: <span className="font-semibold text-foreground">{company}</span>
            </div>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground">
            Linear / Stripe ATS Standard
          </div>
        </div>

        {/* Summary Description */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {summary}
        </p>

        {/* Highlights */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-wider">
            Optimizations Applied
          </div>
          <div className="space-y-1">
            {highlights.map((item, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-foreground/90">
                <CheckCircle2 className="size-3.5 text-primary shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
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
            <Link href="/resumes">
              <SlidersHorizontal className="size-3.5 mr-1.5" />
              <span>Resume Library</span>
            </Link>
          </Button>

          <Button
            asChild
            size="sm"
            className="h-8 text-xs font-medium rounded-[4px] bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs gap-1.5"
          >
            <Link href={launchUrl}>
              <FileText className="size-3.5" />
              <span>Open in Tailor Studio</span>
              <ArrowRight className="size-3.5 ml-0.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
