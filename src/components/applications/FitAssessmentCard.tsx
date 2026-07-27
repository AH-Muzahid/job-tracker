"use client"

import { useState, useEffect } from "react"
import { Bot, Sparkles, AlertTriangle, CheckCircle2, ArrowRight, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

  // Calculate SVG circular progress values
  const radius = 20
  const circumference = 2 * Math.PI * radius
  const score = analysis?.matchScore || 0
  const strokeDashoffset = circumference - (score / 100) * circumference

  const getScoreColor = (val: number) => {
    if (val >= 80) return "text-emerald-500 stroke-emerald-500"
    if (val >= 60) return "text-amber-500 stroke-amber-500"
    return "text-rose-500 stroke-rose-500"
  }

  return (
    <Card className="border border-border/80 bg-card/60 backdrop-blur-md shadow-lg overflow-hidden rounded-2xl">
      <CardHeader className="pb-3 border-b border-border/50 bg-secondary/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-foreground/85">
            <Bot className="h-4 w-4 text-primary" />
            Fit Assessment
          </CardTitle>
          {analysis && !analysisLoading && (
            <Button
              variant="outline"
              size="sm"
              onClick={onTriggerAnalysis}
              className="h-7 text-[10px] px-2.5 gap-1 border-border text-primary hover:bg-primary/5 cursor-pointer font-semibold"
            >
              <Sparkles className="h-3 w-3" /> Re-Analyze
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {analysisLoading ? (
          <div className="py-6 px-4 space-y-4 flex flex-col items-center justify-center text-center animate-fade-in-up">
            <div className="relative flex items-center justify-center">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <Bot className="absolute h-4 w-4 text-primary animate-pulse" />
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-foreground">AI Evaluating Job Compatibility</h4>
              <p className="text-[11px] font-mono text-primary animate-pulse">
                {ANALYSIS_STEPS[loadingStep]}
              </p>
            </div>

            {/* Live Progress Bar */}
            <div className="w-full max-w-[240px] h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${((loadingStep + 1) / ANALYSIS_STEPS.length) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-center gap-1.5 pt-1">
              {ANALYSIS_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx <= loadingStep ? "w-5 bg-primary" : "w-1.5 bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        ) : analysis ? (
          <div className="space-y-4">
            {/* Score & Verdict Row */}
            <div className="flex items-center gap-4 bg-secondary/20 p-3 rounded-xl border border-border">
              <div className="relative flex items-center justify-center shrink-0">
                {/* SVG Progress Ring */}
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r={radius}
                    className="stroke-muted/30"
                    strokeWidth="3.5"
                    fill="transparent"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r={radius}
                    className={`transition-all duration-700 ease-out ${getScoreColor(score)}`}
                    strokeWidth="3.5"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className={`absolute text-[10px] font-bold ${getScoreColor(score)}`}>
                  {score}%
                </div>
              </div>
              
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-foreground truncate">
                  {analysis.verdict || "Analysis Complete"}
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Confidence Score: <span className="font-semibold text-foreground">{analysis.confidence || "N/A"}</span>
                </p>
              </div>
            </div>

            {/* Red Flags / Cautions */}
            {analysis.redFlags && (
              <div className="rounded-xl bg-rose-500/5 border border-rose-500/15 overflow-hidden flex animate-in fade-in slide-in-from-top-1">
                <div className="w-1 bg-rose-500 shrink-0" />
                <div className="p-3 flex gap-2">
                  <AlertTriangle className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-[10px] font-bold text-rose-600 dark:text-rose-455 uppercase tracking-wider">Cautions / Red Flags</h5>
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5 leading-relaxed">{analysis.redFlags}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Why This Score */}
            {analysis.whyThisScore && analysis.whyThisScore.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fit Analysis Points</h5>
                <div className="space-y-1.5">
                  {analysis.whyThisScore.map((reason: string, i: number) => (
                    <div key={i} className="text-xs text-foreground/85 flex items-start gap-2 bg-secondary/20 p-2.5 rounded-lg border border-border/40">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Keywords & Tools */}
            {analysis.missingGaps && (
              <div className="space-y-3 pt-3 border-t border-border/60">
                {analysis.missingGaps.missingKeywords && analysis.missingGaps.missingKeywords.length > 0 && (
                  <div>
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Missing Keywords</h5>
                    <div className="flex flex-wrap gap-1">
                      {analysis.missingGaps.missingKeywords.map((kw: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-[9px] font-medium border-border/80 text-foreground bg-secondary/35 py-0.5 px-2 rounded-md">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.missingGaps.missingTools && analysis.missingGaps.missingTools.length > 0 && (
                  <div>
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Missing Tools / Frameworks</h5>
                    <div className="flex flex-wrap gap-1">
                      {analysis.missingGaps.missingTools.map((t: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-[9px] font-medium border-border/80 text-foreground bg-secondary/35 py-0.5 px-2 rounded-md">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Resume Targeting Advice */}
            {analysis.resumeAdvice && (
              <div className="space-y-3 pt-3 border-t border-border/60">
                <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Resume Tailoring Advice</h5>
                
                {analysis.resumeAdvice.emphasize && analysis.resumeAdvice.emphasize.length > 0 && (
                  <div className="bg-secondary/15 p-2.5 rounded-xl border border-border/30">
                    <div className="text-[9px] font-bold text-primary uppercase tracking-wider mb-1">Skills to Emphasize</div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {analysis.resumeAdvice.emphasize.map((item: string, idx: number) => (
                        <span key={idx} className="text-[11px] text-foreground bg-background px-2 py-0.5 rounded border border-border/50 font-medium">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.resumeAdvice.foregroundProjects && analysis.resumeAdvice.foregroundProjects.length > 0 && (
                  <div className="bg-secondary/15 p-2.5 rounded-xl border border-border/30 space-y-1.5">
                    <div className="text-[9px] font-bold text-primary uppercase tracking-wider">Highlight Projects</div>
                    <div className="space-y-1.5">
                      {analysis.resumeAdvice.foregroundProjects.map((project: string, idx: number) => (
                        <div key={idx} className="text-[11px] text-foreground/80 flex items-start gap-1.5 bg-background p-2 rounded border border-border/40 font-medium">
                          <ArrowRight className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                          <span>{project}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 space-y-3">
            <p className="text-xs text-muted-foreground">No AI analysis available for this application yet.</p>
            <Button size="sm" onClick={onTriggerAnalysis} className="text-xs bg-primary hover:bg-primary/90 font-semibold cursor-pointer gap-1.5 shadow-md">
              <Sparkles className="h-3.5 w-3.5" /> Run AI Assessment
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
