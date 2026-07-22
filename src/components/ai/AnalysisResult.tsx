"use client"

import { Badge } from "@/components/ui/badge"

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
  finalRecommendation?: string | null
  redFlags?: string | null
}

export default function AnalysisResult({ data }: { data: Record<string, unknown> }) {
  const analysis = data as unknown as AnalysisData

  return (
    <div className="space-y-4">
      {analysis.matchScore != null && (
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full border-4 text-xl font-bold"
            style={{
              borderColor: analysis.matchScore >= 70 ? "#22c55e" : analysis.matchScore >= 40 ? "#f59e0b" : "#ef4444",
            }}
          >
            {analysis.matchScore}
          </div>
          <div>
            <p className="font-semibold">{analysis.verdict || "No verdict"}</p>
            <p className="text-xs text-muted-foreground">Confidence: {analysis.confidence || "N/A"}</p>
          </div>
        </div>
      )}

      {analysis.whyThisScore && analysis.whyThisScore.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Why This Score</p>
          <ul className="space-y-0.5">
            {analysis.whyThisScore.map((reason, i) => (
              <li key={i} className="text-xs text-muted-foreground flex gap-1">
                <span className="text-primary">•</span> {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.missingGaps && (
        <div className="grid grid-cols-2 gap-3">
          {analysis.missingGaps.missingKeywords && analysis.missingGaps.missingKeywords.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Missing Keywords</p>
              <div className="flex flex-wrap gap-1">
                {analysis.missingGaps.missingKeywords.map((k, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">{k}</Badge>
                ))}
              </div>
            </div>
          )}
          {analysis.missingGaps.missingTools && analysis.missingGaps.missingTools.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Missing Tools</p>
              <div className="flex flex-wrap gap-1">
                {analysis.missingGaps.missingTools.map((t, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">{t}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {analysis.finalRecommendation && (
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Recommendation</p>
          <p className="text-sm">{analysis.finalRecommendation}</p>
        </div>
      )}

      {analysis.redFlags && (
        <div className="rounded-lg bg-rose-50 dark:bg-rose-500/10 p-3">
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400 mb-1">Red Flags</p>
          <p className="text-sm text-rose-600 dark:text-rose-400">{analysis.redFlags}</p>
        </div>
      )}
    </div>
  )
}
