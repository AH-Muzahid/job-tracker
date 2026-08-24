import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { FileText } from "lucide-react"
import TailorResumeModal from "@/components/resumes/TailorResumeModal"

interface AnalysisData {
  matchScore?: number | null
  verdict?: string | null
  confidence?: string | null
  whyThisScore?: string[] | null
  missingGaps?: {
    missingKeywords?: string[]
    missingTools?: string[]
    missingProof?: string[]
    stretchAreas?: string[]
    fixableGaps?: string[]
  } | null
  scoreBreakdown?: {
    dimension: string
    score: number
    max: number
    notes: string
  }[] | null
  finalRecommendation?: string | null
  redFlags?: string | null
}

export default function AnalysisResult({ data }: { data: Record<string, unknown> }) {
  const [tailorOpen, setTailorOpen] = useState(false)
  const analysis = data as unknown as AnalysisData

  return (
    <Card className="rounded-xl border border-border/80 bg-card/70 backdrop-blur-2xl shadow-xs overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {analysis.matchScore != null && (
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl border-2 text-lg font-bold shadow-xs shrink-0"
              style={{
                borderColor: analysis.matchScore >= 70 ? "#22c55e" : analysis.matchScore >= 40 ? "#f59e0b" : "#ef4444",
                color: analysis.matchScore >= 70 ? "#22c55e" : analysis.matchScore >= 40 ? "#f59e0b" : "#ef4444",
              }}
            >
              {analysis.matchScore}%
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">{analysis.verdict || "Match Analysis"}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Confidence: {analysis.confidence || "Medium"}</p>
            </div>
          </div>
        )}

        {analysis.scoreBreakdown && analysis.scoreBreakdown.length > 0 && (
          <div className="space-y-3 pt-1 border-t border-border/50">
            {analysis.scoreBreakdown.map((item, i) => {
              const pct = Math.max(0, Math.min(100, (item.score / (item.max || 100)) * 100))
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{item.dimension}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{item.score} / {item.max}</span>
                  </div>
                  <Progress value={pct} className="h-1.5 bg-muted rounded-full" />
                  {item.notes && (
                    <p className="text-[10px] text-muted-foreground leading-snug">{item.notes}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {analysis.whyThisScore && analysis.whyThisScore.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Key Insights</p>
            <ul className="space-y-1">
              {analysis.whyThisScore.map((reason, i) => (
                <li key={i} className="text-xs text-muted-foreground flex gap-1.5 items-start">
                  <span className="text-primary font-bold">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis.missingGaps && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
            {analysis.missingGaps.missingKeywords && analysis.missingGaps.missingKeywords.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Missing Keywords</p>
                <div className="flex flex-wrap gap-1">
                  {analysis.missingGaps.missingKeywords.map((k, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] font-mono border-rose-500/20 text-rose-600 dark:text-rose-400 bg-rose-500/5">{k}</Badge>
                  ))}
                </div>
              </div>
            )}
            {analysis.missingGaps.missingTools && analysis.missingGaps.missingTools.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Missing Tools</p>
                <div className="flex flex-wrap gap-1">
                  {analysis.missingGaps.missingTools.map((t, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] font-mono border-amber-500/20 text-amber-600 dark:text-amber-400 bg-amber-500/5">{t}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {analysis.finalRecommendation && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
            <p className="text-[11px] font-bold text-primary mb-0.5">Recommendation</p>
            <p className="text-xs text-foreground leading-relaxed">{analysis.finalRecommendation}</p>
          </div>
        )}

        {analysis.redFlags && (
          <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3">
            <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mb-0.5">Red Flags</p>
            <p className="text-xs text-rose-600 dark:text-rose-400">{analysis.redFlags}</p>
          </div>
        )}

        {/* 1-Click Action to generate Tailored ATS Resume */}
        <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span>Ready to apply for this position?</span>
          </div>
          <Button
            size="sm"
            onClick={() => setTailorOpen(true)}
            className="text-xs h-7 rounded-lg shadow-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <FileText className="h-3 w-3 mr-1" />
            Generate Tailored Resume
          </Button>
        </div>
      </CardContent>

      <TailorResumeModal 
        open={tailorOpen} 
        onOpenChange={setTailorOpen} 
        initialJD={analysis.whyThisScore?.join("\n") || ""}
      />
    </Card>
  )
}
