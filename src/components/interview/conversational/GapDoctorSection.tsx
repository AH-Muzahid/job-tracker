"use client"

import React, { useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { KnowledgeGapItem } from "./types"

interface GapDoctorSectionProps {
  gaps?: KnowledgeGapItem[]
  targetCompany?: string
  targetRole?: string
  onSaveToNotes?: (title: string, content: string, category: string) => void
}

export function GapDoctorSection({
  gaps = [],
  targetCompany = "Company",
  targetRole = "Software Engineer",
  onSaveToNotes,
}: GapDoctorSectionProps) {
  const [filter, setFilter] = useState<"all" | "technical" | "behavioral">("all")
  const [activeDrillId, setActiveDrillId] = useState<string | null>(null)
  const [drillAnswer, setDrillAnswer] = useState("")
  const [savedGapIds, setSavedGapIds] = useState<Record<string, boolean>>({})

  if (!gaps || gaps.length === 0) {
    return null
  }

  const filteredGaps = gaps.filter((g) => {
    if (filter === "all") return true
    return g.type === filter
  })

  async function handleSaveGapNote(gap: KnowledgeGapItem) {
    const title = `Gap: ${gap.topic} (${gap.type === "behavioral" ? "STAR" : "Tech"})`
    let content = `### Identified Lacking in ${targetCompany} Interview\n\n`
    content += `**Question:** ${gap.questionAsked}\n`
    content += `**Weakness Detected:** ${gap.weaknessReason}\n\n`
    content += `**10/10 Ideal Staff Answer:**\n${gap.idealAnswer}\n\n`

    if (gap.starBreakdown) {
      content += `#### STAR Framework Breakdown:\n`
      content += `- **Situation:** ${gap.starBreakdown.situation || "N/A"}\n`
      content += `- **Task:** ${gap.starBreakdown.task || "N/A"}\n`
      content += `- **Action:** ${gap.starBreakdown.action || "N/A"}\n`
      content += `- **Result:** ${gap.starBreakdown.result || "N/A"}\n\n`
    }

    if (gap.keyTakeaways && gap.keyTakeaways.length > 0) {
      content += `#### Key Takeaways:\n`
      content += gap.keyTakeaways.map((t) => `- ${t}`).join("\n") + "\n"
    }

    try {
      if (onSaveToNotes) {
        onSaveToNotes(title, content, "Knowledge Gap")
      } else {
        const res = await fetch("/api/prep-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            content,
            category: "Knowledge Gap",
          }),
        })
        if (!res.ok) throw new Error("Failed to save note")
      }
      setSavedGapIds((prev) => ({ ...prev, [gap.id]: true }))
      toast.success(`"${gap.topic}" saved to Revision Notes!`)
    } catch {
      toast.error("Failed to save gap to notes")
    }
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Targeted Knowledge Gaps & Remediation
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compare weak interview answers with 10/10 Staff-level responses and STAR breakdowns.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-muted/60 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              filter === "all"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({gaps.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("technical")}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              filter === "technical"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Technical
          </button>
          <button
            type="button"
            onClick={() => setFilter("behavioral")}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              filter === "behavioral"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Behavioral (STAR)
          </button>
        </div>
      </div>

      {/* Gaps List */}
      <div className="space-y-3">
        {filteredGaps.map((gap) => {
          const isSaved = !!savedGapIds[gap.id]
          const isDrilling = activeDrillId === gap.id

          return (
            <div
              key={gap.id}
              className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-3.5 transition-all"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-foreground">
                    {gap.topic}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase font-semibold px-2 py-0.5 border ${
                      gap.severity === "high"
                        ? "bg-red-500/10 text-red-500 border-red-500/20"
                        : gap.severity === "medium"
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                    }`}
                  >
                    {gap.severity} priority
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    • {gap.type === "behavioral" ? "Behavioral & Leadership" : "Technical & Architecture"}
                  </span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSaveGapNote(gap)}
                    disabled={isSaved}
                    className="h-7 text-xs px-2.5 font-medium cursor-pointer"
                  >
                    {isSaved ? "Saved in Notes" : "Save to Notes"}
                  </Button>
                  <Button
                    size="sm"
                    variant={isDrilling ? "secondary" : "default"}
                    onClick={() => {
                      if (isDrilling) {
                        setActiveDrillId(null)
                      } else {
                        setActiveDrillId(gap.id)
                        setDrillAnswer("")
                      }
                    }}
                    className="h-7 text-xs px-2.5 font-medium cursor-pointer"
                  >
                    {isDrilling ? "Close Practice" : "Practice Question"}
                  </Button>
                </div>
              </div>

              {/* Question & Weakness Block */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-foreground">Question Asked: </span>
                  <span className="text-muted-foreground">{gap.questionAsked}</span>
                </div>
                {gap.candidateAnswerSummary && (
                  <div>
                    <span className="font-semibold text-foreground">Your Response Summary: </span>
                    <span className="text-muted-foreground">{gap.candidateAnswerSummary}</span>
                  </div>
                )}
                <div className="pt-1 text-red-400 font-medium">
                  <span>Weakness / Missing Element: </span>
                  <span className="text-muted-foreground">{gap.weaknessReason}</span>
                </div>
              </div>

              {/* 10/10 Ideal Staff Answer */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-emerald-400">
                  10/10 Ideal Model Answer:
                </div>
                <div className="p-3.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {gap.idealAnswer}
                </div>
              </div>

              {/* STAR Framework Breakdown (if Behavioral) */}
              {gap.starBreakdown && (
                <div className="space-y-2 pt-1">
                  <div className="text-xs font-semibold text-foreground">
                    Structured STAR Breakdown:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <div className="p-2.5 rounded-lg border border-border bg-muted/30 space-y-1">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">Situation</div>
                      <p className="text-xs text-foreground leading-snug">{gap.starBreakdown.situation || "Context setup"}</p>
                    </div>
                    <div className="p-2.5 rounded-lg border border-border bg-muted/30 space-y-1">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">Task</div>
                      <p className="text-xs text-foreground leading-snug">{gap.starBreakdown.task || "Ownership goal"}</p>
                    </div>
                    <div className="p-2.5 rounded-lg border border-border bg-muted/30 space-y-1">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">Action</div>
                      <p className="text-xs text-foreground leading-snug">{gap.starBreakdown.action || "Concrete actions taken"}</p>
                    </div>
                    <div className="p-2.5 rounded-lg border border-border bg-muted/30 space-y-1">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">Result</div>
                      <p className="text-xs text-foreground leading-snug">{gap.starBreakdown.result || "Measurable metric impact"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Key Takeaways */}
              {gap.keyTakeaways && gap.keyTakeaways.length > 0 && (
                <div className="pt-1">
                  <div className="text-xs font-semibold text-foreground mb-1.5">
                    Actionable Takeaways:
                  </div>
                  <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 pl-1">
                    {gap.keyTakeaways.map((takeaway, idx) => (
                      <li key={idx} className="leading-snug">{takeaway}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Interactive Practice Drill Box */}
              {isDrilling && (
                <div className="mt-3 p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Practice Re-answering This Question
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Target: {targetRole} @ {targetCompany}
                    </span>
                  </div>
                  <Textarea
                    placeholder="Type or dictate your refined answer using the ideal points above..."
                    value={drillAnswer}
                    onChange={(e) => setDrillAnswer(e.target.value)}
                    rows={3}
                    className="text-xs resize-none bg-background border-border"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!drillAnswer.trim()) {
                          toast.error("Please write your practice answer before submitting.")
                          return
                        }
                        toast.success("Practice recorded! Great improvement on your delivery.")
                        setActiveDrillId(null)
                        setDrillAnswer("")
                      }}
                      className="h-8 text-xs font-medium cursor-pointer"
                    >
                      Complete Drill
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
