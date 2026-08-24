"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, HelpCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Props {
  content: string
}

export default function InterviewPrepResult({ content }: Props) {
  const [expanded, setExpanded] = useState(false)

  const questions = content
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => l.replace(/^\d+[\.\)]\s*/, ""))

  return (
    <Card className="rounded-xl border border-border/80 bg-card/70 backdrop-blur-2xl shadow-xs overflow-hidden">
      <CardContent className="p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground pb-2 border-b border-border/50">
          <HelpCircle className="h-4 w-4 text-indigo-500" />
          <span>Interview Prep Questions</span>
        </div>
        <div className="space-y-1.5">
          {questions.slice(0, expanded ? undefined : 3).map((q, i) => (
            <div key={i} className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs text-foreground leading-relaxed flex items-start gap-2">
              <span className="font-mono text-[10px] font-bold text-primary shrink-0 mt-0.5">{i + 1}.</span>
              <span>{q}</span>
            </div>
          ))}
        </div>
        {questions.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="h-7 px-2 text-xs text-primary hover:text-primary/90 hover:bg-primary/10 rounded-lg flex items-center gap-1 font-semibold cursor-pointer"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <span>{expanded ? "Show less" : `Show ${questions.length - 3} more questions`}</span>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
