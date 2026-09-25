"use client"

import React from "react"
import { Award, RotateCcw, CheckCircle2, AlertTriangle } from "lucide-react"
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { InterviewReportData } from "./types"
import { GapDoctorSection } from "./GapDoctorSection"

interface InterviewReportViewProps {
  targetRole: string
  targetCompany: string
  isGeneratingReport: boolean
  report: InterviewReportData | null
  dialogueCount: number
  onPracticeAgain: () => void
  onRetry?: () => void
  onClose: () => void
}

export function InterviewReportView({
  targetRole,
  targetCompany,
  isGeneratingReport,
  report,
  dialogueCount,
  onPracticeAgain,
  onRetry,
  onClose,
}: InterviewReportViewProps) {
  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case "Strong Hire":
        return <Badge className="bg-emerald-600 text-white font-bold text-xs px-2.5 py-1 rounded-[4px]">Strong Hire</Badge>
      case "Hire":
        return <Badge className="bg-emerald-500 text-white font-bold text-xs px-2.5 py-1 rounded-[4px]">Hire</Badge>
      case "Lean Hire":
        return <Badge className="bg-amber-500 text-white font-bold text-xs px-2.5 py-1 rounded-[4px]">Lean Hire</Badge>
      default:
        return <Badge className="bg-rose-500 text-white font-bold text-xs px-2.5 py-1 rounded-[4px]">Needs Improvement</Badge>
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 overflow-y-auto no-scrollbar max-h-[80vh] p-1">
      <DialogHeader className="border-b pb-3 sm:pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Award className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <span>Hiring Debrief & Performance Audit</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Comprehensive STAR evaluation for {targetRole} at {targetCompany}.
            </DialogDescription>
          </div>
          {report && getVerdictBadge(report.verdict)}
        </div>
      </DialogHeader>

      {isGeneratingReport && (
        <div className="py-12 sm:py-16 text-center space-y-3">
          <RotateCcw className="h-7 w-7 sm:h-8 sm:w-8 text-primary animate-spin mx-auto" />
          <p className="text-xs sm:text-sm font-semibold">Analyzing interview dialogue with STAR method...</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground">Calculating hiring bar scores and growth areas...</p>
        </div>
      )}

      {!isGeneratingReport && !report && (
        <div className="py-12 sm:py-16 text-center space-y-4 max-w-md mx-auto">
          <div className="h-12 w-12 rounded-[6px] bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm sm:text-base font-semibold text-foreground">
              Report Generation Incomplete
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We encountered an issue communicating with the AI evaluation provider. Your transcript is preserved.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            {onRetry && (
              <Button onClick={onRetry} size="sm" className="gap-2 rounded-[4px] cursor-pointer">
                <RotateCcw className="h-4 w-4" />
                Retry Generation
              </Button>
            )}
            <Button onClick={onPracticeAgain} variant="outline" size="sm" className="rounded-[4px] cursor-pointer">
              Practice Again
            </Button>
          </div>
        </div>
      )}

      {report && (
        <div className="space-y-4 sm:space-y-6">
          {/* Score Summary */}
          <div className="rounded-[6px] border p-4 sm:p-5 bg-card space-y-3 sm:space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-foreground">Cumulative Hiring Score</h4>
                <p className="text-[11px] text-muted-foreground">Based on {dialogueCount} interview turns</p>
              </div>
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-extrabold text-primary font-mono tabular-nums">{report.overallScore}</span>
                <span className="text-xs text-muted-foreground font-mono">/100</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Technical Depth</span>
                  <span className="font-mono tabular-nums">{report.technicalScore}%</span>
                </div>
                <Progress value={report.technicalScore} className="h-1.5" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Communication & Structure</span>
                  <span className="font-mono tabular-nums">{report.clarityScore}%</span>
                </div>
                <Progress value={report.clarityScore} className="h-1.5" />
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          {report.executiveSummary && (
            <div className="rounded-[6px] border border-border bg-muted/20 p-3 sm:p-4 space-y-1">
              <h5 className="text-[11px] sm:text-xs font-bold text-foreground uppercase tracking-wider">
                Executive Summary & Feedback
              </h5>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {report.executiveSummary}
              </p>
            </div>
          )}

          {/* STAR Method Analysis */}
          {report.starBreakdown && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                STAR Method Deconstruction
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                <div className="rounded-[6px] border border-border p-3 bg-card space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">[S] Situation</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {report.starBreakdown.situation}
                  </p>
                </div>
                <div className="rounded-[6px] border border-border p-3 bg-card space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">[T] Task</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {report.starBreakdown.task}
                  </p>
                </div>
                <div className="rounded-[6px] border border-border p-3 bg-card space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">[A] Action</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {report.starBreakdown.action}
                  </p>
                </div>
                <div className="rounded-[6px] border border-border p-3 bg-card space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">[R] Result</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {report.starBreakdown.result}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Strengths & Improvements */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-[6px] border p-3 bg-emerald-500/5 border-emerald-500/20 space-y-2">
              <h5 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Demonstrated Strengths</span>
              </h5>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {report.strengths?.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-500 mt-0.5">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[6px] border p-3 bg-amber-500/5 border-amber-500/20 space-y-2">
              <h5 className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Coaching Areas</span>
              </h5>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {report.improvementAreas?.map((imp: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Targeted Knowledge Gaps & Remediation (10/10 Answers + STAR Transformer) */}
          {report.knowledgeGaps && report.knowledgeGaps.length > 0 && (
            <GapDoctorSection
              gaps={report.knowledgeGaps}
              targetCompany={targetCompany}
              targetRole={targetRole}
            />
          )}

          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0 pt-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={onPracticeAgain}
              className="text-xs w-full sm:w-auto font-medium cursor-pointer rounded-[4px]"
            >
              Practice Another Interview
            </Button>
            <Button size="sm" onClick={onClose} className="text-xs w-full sm:w-auto font-medium cursor-pointer rounded-[4px]">
              Close Room
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
