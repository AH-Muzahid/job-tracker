"use client"

import React from "react"
import { Mic } from "lucide-react"
import { Button } from "@/components/ui/button"

interface InterviewPrepHeaderProps {
  onStartMockInterview: () => void
}

export function InterviewPrepHeader({ onStartMockInterview }: InterviewPrepHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-1">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
          Interview Prep Room
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Practice live spoken mock interviews, master technical concepts, and review revision notes.
        </p>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <Button
          onClick={onStartMockInterview}
          size="sm"
          className="h-8.5 px-4 font-medium text-xs sm:text-sm cursor-pointer shadow-xs"
        >
          <Mic className="size-3.5 mr-1.5" />
          <span>Start Voice Mock</span>
        </Button>
      </div>
    </div>
  )
}
