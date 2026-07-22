"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

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
    <div className="space-y-1">
      {questions.slice(0, expanded ? undefined : 3).map((q, i) => (
        <div key={i} className="rounded-lg border p-2.5 text-sm">
          {q}
        </div>
      ))}
      {questions.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-primary hover:underline pt-1"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {expanded ? "Show less" : `Show ${questions.length - 3} more questions`}
        </button>
      )}
    </div>
  )
}
