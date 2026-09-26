"use client"

import React from "react"
import { useRouter } from "next/navigation"
import {
  Bot, FileSearch, FileEdit, FileText,
  BrainCircuit, MessagesSquare
} from "lucide-react"
import { useUI } from "@/lib/store"
import type { OpportunityDetailData, DetailTab } from "./types"

interface OpportunityCopilotCardProps {
  opportunity: OpportunityDetailData
  onTabChange?: (tab: DetailTab) => void
}

export function OpportunityCopilotCard({ opportunity, onTabChange }: OpportunityCopilotCardProps) {
  const router = useRouter()
  const { setAiSidebarOpen } = useUI()

  const actions = [
    {
      id: "analyze-jd",
      title: "Analyze this job description",
      description: "Get match score and detailed insights",
      icon: FileSearch,
      onClick: () => {
        if (onTabChange) onTabChange("match")
      },
    },
    {
      id: "tailor-resume",
      title: "Tailor my resume",
      description: "Optimize for this specific role",
      icon: FileEdit,
      onClick: () => {
        router.push(
          `/resumes?targetRole=${encodeURIComponent(opportunity.title)}&company=${encodeURIComponent(opportunity.company)}`
        )
      },
    },
    {
      id: "generate-cover-letter",
      title: "Generate a cover letter",
      description: "Create a personalized cover letter",
      icon: FileText,
      onClick: () => {
        router.push(
          `/resumes?action=cover-letter&targetRole=${encodeURIComponent(opportunity.title)}&company=${encodeURIComponent(opportunity.company)}`
        )
      },
    },
    {
      id: "interview-prep",
      title: "Prepare for interview",
      description: "Get suggested questions",
      icon: BrainCircuit,
      onClick: () => {
        router.push(
          `/interview-prep?role=${encodeURIComponent(opportunity.title)}&company=${encodeURIComponent(opportunity.company)}`
        )
      },
    },
    {
      id: "ask-anything",
      title: "Ask anything",
      description: "Chat about this opportunity",
      icon: MessagesSquare,
      onClick: () => {
        setAiSidebarOpen(true)
      },
    },
  ]

  return (
    <div className="bg-card border border-border rounded-[6px] p-5 shadow-none space-y-4">
      {/* Header (Matching media_1790349120375.png) */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-sm bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Bot className="size-3.5 stroke-[2]" />
          </div>
          <h3 className="text-sm font-bold text-foreground tracking-tight">Your AI Career Copilot</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Get personalized insights for this opportunity.
        </p>
      </div>

      {/* Action Rows without trailing chevrons */}
      <div className="space-y-1.5 pt-1">
        {actions.map((act) => {
          const Icon = act.icon
          return (
            <button
              key={act.id}
              type="button"
              onClick={act.onClick}
              className="w-full flex items-center gap-3 p-2 rounded-sm hover:bg-muted/70 transition-colors text-left group cursor-pointer"
            >
              <div className="size-8 rounded-[6px] bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                <Icon className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                  {act.title}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {act.description}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
