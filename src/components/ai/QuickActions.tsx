"use client"

import { FileText, Briefcase, Target, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AIMode } from "@/lib/store"

interface Props {
  onAction: (label: string, mode: AIMode) => void
}

const ACTIONS = [
  { label: "Paste a JD", icon: FileText, mode: "jd-scan" as AIMode },
  { label: "Cover Letter", icon: Briefcase, mode: "application" as AIMode },
  { label: "I applied to...", icon: Target, mode: "tracker" as AIMode },
  { label: "Analyze message", icon: MessageSquare, mode: "response" as AIMode },
]

export default function QuickActions({ onAction }: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {ACTIONS.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => onAction(action.label, action.mode)}
        >
          <action.icon className="h-3.5 w-3.5" />
          {action.label}
        </Button>
      ))}
    </div>
  )
}
