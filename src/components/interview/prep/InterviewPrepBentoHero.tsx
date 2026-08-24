"use client"

import React from "react"
import { Mic } from "lucide-react"
import { Button } from "@/components/ui/button"

interface InterviewPrepHeaderProps {
  onStartMockInterview: () => void
}

export function InterviewPrepHeader({ onStartMockInterview }: InterviewPrepHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Interview Prep
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Practice interactive AI voice mock interviews, study technical concepts, and review revision notes.
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Button onClick={onStartMockInterview} className="font-medium shadow-xs">
          Start Voice Mock Interview
        </Button>
      </div>
    </div>
  )
}
