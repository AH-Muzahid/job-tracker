"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, ArrowRight, Loader2 } from "lucide-react"

export interface AnalysisResultData {
  matchScore: number
  confidence: string
  verdict: string
  redFlags?: string
  whyThisScore?: string[]
  missingGaps?: {
    missingKeywords?: string[]
  }
  finalRecommendation?: string
  roleSnapshot?: {
    role?: string
    company?: string
  }
}

interface Props {
  analysisResult: AnalysisResultData | null
  onClose: () => void
  onSave: (targetStatus: string) => void
  saving: boolean
}

export function AnalysisResultModal({ analysisResult, onClose, onSave, saving }: Props) {
  if (!analysisResult) return null

  return (
    <Dialog open={!!analysisResult} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border-border bg-card p-6 shadow-2xl">
        <DialogHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-semibold text-primary uppercase tracking-wider">
                AI Fit Analysis
              </span>
              <DialogTitle className="text-base font-bold text-foreground mt-0.5">
                {analysisResult.roleSnapshot?.role || "Target Role"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {analysisResult.roleSnapshot?.company || "Unknown Company"}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary/40 bg-muted/40 font-mono font-bold text-sm text-foreground">
              {analysisResult.matchScore}%
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Verdict Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border text-xs">
            <span className="font-semibold text-foreground">Verdict: {analysisResult.verdict}</span>
            <span className="text-[10px] font-mono text-muted-foreground">Confidence: {analysisResult.confidence}</span>
          </div>

          {/* Red flags if any */}
          {analysisResult.redFlags && (
            <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/5 text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-destructive font-semibold">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Cautions & Red Flags</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">{analysisResult.redFlags}</p>
            </div>
          )}

          {/* Highlights */}
          {analysisResult.whyThisScore && analysisResult.whyThisScore.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Why this score</h4>
              <ul className="space-y-1">
                {analysisResult.whyThisScore.map((reason: string, i: number) => (
                  <li key={i} className="text-xs text-foreground/90 flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing keywords */}
          {analysisResult.missingGaps?.missingKeywords && analysisResult.missingGaps.missingKeywords.length > 0 && (
            <div>
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Missing Keywords</h4>
              <div className="flex flex-wrap gap-1">
                {analysisResult.missingGaps.missingKeywords.map((kw: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-[10px] font-mono border-border/80">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Recommendation */}
          <div className="pt-2 border-t border-border/60">
            <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Recommendation</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{analysisResult.finalRecommendation}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs cursor-pointer"
          >
            Discard
          </Button>
          <Button
            size="sm"
            disabled={saving}
            onClick={() => onSave("Saved")}
            className="text-xs font-semibold cursor-pointer"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            Save as Saved <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
          <Button
            size="sm"
            disabled={saving}
            onClick={() => onSave("Applied")}
            className="text-xs font-semibold cursor-pointer"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            Mark Applied
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
