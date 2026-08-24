"use client"

import { useState, useEffect } from "react"
import { Bot, RotateCcw, AlertTriangle, CheckCircle2, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WorkbenchAnalysis } from "./types"

interface FitAssessmentCardProps {
  analysis: WorkbenchAnalysis | null
  analysisLoading: boolean
  onTriggerAnalysis: () => void
}

const ANALYSIS_STEPS = [
  "Extracting key role requirements & stack...",
  "Matching candidate resume & skills...",
  "Evaluating strengths, stretch areas & red flags...",
  "Compiling tailored resume advice & fit verdict...",
]

export function FitAssessmentCard({
  analysis,
  analysisLoading,
  onTriggerAnalysis,
}: FitAssessmentCardProps) {
  const [loadingStep, setLoadingStep] = useState(0)

  // Cycle through progress steps to make analysis feel fast, alive & responsive
  useEffect(() => {
    if (!analysisLoading) {
      setLoadingStep(0)
      return
    }

    setLoadingStep(0)
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < ANALYSIS_STEPS.length - 1 ? prev + 1 : prev))
    }, 1400)

    return () => clearInterval(interval)
  }, [analysisLoading])

  const score = analysis?.matchScore || 0

  const getScoreColor = (val: number) => {
    if (val >= 80) return "text-emerald-500 stroke-emerald-500"
    if (val >= 60) return "text-amber-500 stroke-amber-500"
    return "text-rose-500 stroke-rose-500"
  }

  // Parse red flags into structured bullet points if provided
  const redFlagsList = analysis?.redFlags
    ? typeof analysis.redFlags === "string"
      ? analysis.redFlags.split(/;\s*|\n+/).map((s) => s.trim()).filter((s) => s.length > 0)
      : Array.isArray(analysis.redFlags) ? analysis.redFlags : [String(analysis.redFlags)]
    : []

  return (
    <div className="flex flex-col h-full">
      {/* Header bar matching the left tabs height */}
      <div className="flex items-center justify-between p-3.5 border-b border-border bg-background">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-foreground" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Fit Assessment
          </h3>
        </div>
        {analysis && !analysisLoading && (
          <Button
            variant="outline"
            size="sm"
            onClick={onTriggerAnalysis}
            className="h-8 text-xs px-3 gap-1.5 rounded-md border-border text-foreground hover:bg-muted/40 cursor-pointer font-medium"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Re-Analyze
          </Button>
        )}
      </div>

      <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
        {analysisLoading ? (
          <div className="py-8 px-4 space-y-4 flex flex-col items-center justify-center text-center animate-fade-in-up">
            <div className="relative flex items-center justify-center">
              <Loader2 className="h-9 w-9 text-foreground animate-spin" />
              <Bot className="absolute h-4 w-4 text-muted-foreground" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Evaluating Job Compatibility</h4>
              <p className="text-xs font-mono text-muted-foreground">
                {ANALYSIS_STEPS[loadingStep]}
              </p>
            </div>

            {/* Live Progress Bar */}
            <div className="w-full max-w-[200px] h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-foreground transition-all duration-500 ease-out"
                style={{ width: `${((loadingStep + 1) / ANALYSIS_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        ) : analysis ? (
          <div className="space-y-5">
            {/* Score & Verdict Row */}
            <div className="flex items-center gap-4 bg-muted/15 p-4 rounded-md border border-border">
              <div className="relative flex items-center justify-center shrink-0">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r={20}
                    className="stroke-muted"
                    strokeWidth="3.5"
                    fill="transparent"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r={20}
                    className={`transition-all duration-700 ease-out ${getScoreColor(score)}`}
                    strokeWidth="3.5"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 20}
                    strokeDashoffset={2 * Math.PI * 20 - (score / 100) * (2 * Math.PI * 20)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className={`absolute text-xs font-bold font-mono ${getScoreColor(score)}`}>
                  {score}%
                </div>
              </div>
              
              <div className="min-w-0">
                <h4 className="text-base font-bold text-foreground tracking-tight">
                  {analysis.verdict || "Analysis Complete"}
                </h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Confidence: <span className="font-medium text-foreground">{analysis.confidence || "Medium"}</span>
                </p>
              </div>
            </div>

            {/* Red Flags / Cautions - structured bullets */}
            {redFlagsList.length > 0 && (
              <div className="rounded-md bg-rose-500/5 border border-rose-500/20 p-4 space-y-2.5">
                <div className="flex items-center gap-1.5 text-rose-500 text-sm font-semibold uppercase tracking-wider">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Cautions / Red Flags</span>
                </div>
                <div className="space-y-2 pl-0.5">
                  {redFlagsList.map((flag, idx) => (
                    <div key={idx} className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2.5">
                      <span className="text-rose-500 shrink-0 select-none mt-0.5 font-bold">•</span>
                      <span className="text-foreground/90">{flag}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Why This Score */}
            {analysis.whyThisScore && analysis.whyThisScore.length > 0 && (
              <div className="space-y-2.5 pt-1 border-t border-border">
                <h5 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Fit Analysis Points</h5>
                <div className="space-y-2">
                  {analysis.whyThisScore.map((reason: string, i: number) => (
                    <div key={i} className="text-sm text-muted-foreground flex items-start gap-2.5 bg-muted/15 p-3 rounded-md border border-border">
                      <CheckCircle2 className="h-4 w-4 text-foreground shrink-0 mt-0.5" />
                      <span className="leading-relaxed text-foreground/90">{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Keywords & Tools */}
            {analysis.missingGaps && (
              <div className="space-y-3.5 pt-1 border-t border-border">
                {analysis.missingGaps.missingKeywords && analysis.missingGaps.missingKeywords.length > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Missing Keywords</h5>
                    <div className="flex flex-wrap gap-2">
                      {analysis.missingGaps.missingKeywords.map((kw: string, i: number) => (
                        <span key={i} className="text-sm px-3 py-1 rounded-md border border-border bg-muted/30 text-foreground font-medium">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.missingGaps.missingTools && analysis.missingGaps.missingTools.length > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Missing Tools / Frameworks</h5>
                    <div className="flex flex-wrap gap-2">
                      {analysis.missingGaps.missingTools.map((t: string, i: number) => (
                        <span key={i} className="text-sm px-3 py-1 rounded-md border border-border bg-muted/30 text-foreground font-medium">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Resume Targeting Advice */}
            {analysis.resumeAdvice && (
              <div className="space-y-3.5 pt-1 border-t border-border">
                <h5 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Resume Tailoring Advice</h5>
                
                {analysis.resumeAdvice.emphasize && analysis.resumeAdvice.emphasize.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Skills to Emphasize</div>
                    <div className="flex flex-wrap gap-2">
                      {analysis.resumeAdvice.emphasize.map((item: string, idx: number) => (
                        <span key={idx} className="text-sm text-foreground bg-muted/30 px-3 py-1 rounded-md border border-border font-medium">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.resumeAdvice.foregroundProjects && analysis.resumeAdvice.foregroundProjects.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="text-sm font-medium text-muted-foreground">Highlight Projects</div>
                    <div className="space-y-2">
                      {analysis.resumeAdvice.foregroundProjects.map((project: string, idx: number) => (
                        <div key={idx} className="text-sm text-muted-foreground flex items-start gap-2.5 bg-muted/15 p-3 rounded-md border border-border">
                          <ArrowRight className="h-4 w-4 text-foreground shrink-0 mt-0.5" />
                          <span className="text-foreground/90 leading-relaxed">{project}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-10 space-y-3">
            <p className="text-sm text-muted-foreground">No AI analysis available for this application yet.</p>
            <Button size="sm" onClick={onTriggerAnalysis} className="text-sm font-medium rounded-md cursor-pointer gap-2 shadow-xs px-4 h-9">
              <Bot className="h-4 w-4" /> Run AI Assessment
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
