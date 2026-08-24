"use client"

import React from "react"
import { Mic } from "lucide-react"
import { Button } from "@/components/ui/button"

interface InterviewPrepHeaderProps {
  onStartMockInterview: () => void
}

export function InterviewPrepHeader({ onStartMockInterview }: InterviewPrepHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-border pb-4 sm:pb-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Interview Prep
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
          Practice interactive spoken mock interviews, study technical concepts, and review revision notes.
        </p>
      </div>

      <div className="hidden sm:flex items-center gap-3 shrink-0">
        <Button
          onClick={onStartMockInterview}
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-xs text-xs sm:text-sm cursor-pointer"
        >
          <Mic className="h-4 w-4 mr-1.5" />
          <span>Start Voice Mock</span>
        </Button>
      </div>
    </div>
  )
}
