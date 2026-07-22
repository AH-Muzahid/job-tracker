"use client"

import { Sparkles, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import AnalysisResult from "@/components/ai/AnalysisResult"

interface Props {
  analysis: Record<string, unknown> | null
  showAnalysis: boolean
  analysisLoading: boolean
  onTriggerAnalysis: () => void
}

export default function ApplicationAnalysisSection({ analysis, showAnalysis, analysisLoading, onTriggerAnalysis }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          AI Analysis
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onTriggerAnalysis}
          disabled={analysisLoading}
          className="gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {analysisLoading ? "Analyzing..." : (analysis ? "Re-analyze" : "Analyze with AI")}
        </Button>
      </CardHeader>
      <CardContent>
        {!showAnalysis && !analysisLoading && (
          <p className="text-sm text-muted-foreground">Click &ldquo;Analyze with AI&rdquo; to get a match score, gap analysis, and apply strategy.</p>
        )}
        {analysisLoading && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}
        {analysis && showAnalysis && (
          <AnalysisResult data={analysis} />
        )}
      </CardContent>
    </Card>
  )
}
