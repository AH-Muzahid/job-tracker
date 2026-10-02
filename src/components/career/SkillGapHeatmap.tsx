"use client"

import React, { useState } from "react"
import {
  HeatmapItem,
  LearningRoadmapItem,
  GapPriority,
  GapCategory,
} from "@/lib/ai/upskill-engine"
import {
  BookOpen,
  Clock,
  ExternalLink,
  ChevronRight,
} from "lucide-react"
import { BlueprintCard, BlueprintCardHeader, BlueprintCardContent } from "@/components/primitives"
import { Button } from "@/components/ui/button"

interface SkillGapHeatmapProps {
  heatmap: HeatmapItem[]
  roadmap: LearningRoadmapItem[]
  stats?: {
    totalAnalyzedJobs: number
    totalIdentifiedGaps: number
    candidateKnownSkillsCount: number
  }
}

export function SkillGapHeatmap({
  heatmap,
  roadmap,
  stats,
}: SkillGapHeatmapProps) {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(
    roadmap[0]?.canonical || null
  )
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL")
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL")

  const filteredHeatmap = heatmap.filter((item) => {
    if (priorityFilter !== "ALL" && item.priority !== priorityFilter) return false
    if (categoryFilter !== "ALL" && item.category !== categoryFilter) return false
    return true
  })

  const activeRoadmapItem = roadmap.find((r) => r.canonical === selectedSkill)

  const priorityStyles: Record<GapPriority, { badge: string; dot: string }> = {
    Critical: {
      badge: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
      dot: "bg-rose-500",
    },
    High: {
      badge: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      dot: "bg-amber-500",
    },
    Medium: {
      badge: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
      dot: "bg-blue-500",
    },
    Low: {
      badge: "border-border bg-muted/60 text-muted-foreground",
      dot: "bg-muted-foreground",
    },
  }

  const categoryLabels: Record<GapCategory, string> = {
    hard: "Hard Skill",
    tooling: "Tooling & Infra",
    domain: "Domain Knowledge",
    soft: "Soft & Leadership",
    credential: "Certification",
  }

  return (
    <div className="space-y-6">
      {/* 1. Metric Summary Strip */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-[6px] border border-border bg-card">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block mb-1">
              Tracked Opportunities
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono tabular-nums text-foreground">
                {stats.totalAnalyzedJobs}
              </span>
              <span className="text-xs text-muted-foreground">roles analyzed</span>
            </div>
          </div>

          <div className="p-3.5 rounded-[6px] border border-border bg-card">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block mb-1">
              Active Skill Gaps
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono tabular-nums text-foreground">
                {stats.totalIdentifiedGaps}
              </span>
              <span className="text-xs text-muted-foreground">market differences</span>
            </div>
          </div>

          <div className="p-3.5 rounded-[6px] border border-border bg-card">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block mb-1">
              Verified Candidate Graph
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {stats.candidateKnownSkillsCount}
              </span>
              <span className="text-xs text-muted-foreground">grounded skills</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Interactive Heatmap & Learning Path Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Heatmap Table (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-[6px] border border-border bg-muted/30 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-mono text-[11px] mr-1">Priority:</span>
              {(["ALL", "Critical", "High", "Medium", "Low"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriorityFilter(p)}
                  className={`px-2 py-0.5 rounded-[4px] font-medium transition-colors cursor-pointer ${
                    priorityFilter === p
                      ? "bg-background text-foreground border border-border shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-mono text-[11px] mr-1">Type:</span>
              {(["ALL", "hard", "tooling", "domain", "soft"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoryFilter(c)}
                  className={`px-2 py-0.5 rounded-[4px] font-medium capitalize transition-colors cursor-pointer ${
                    categoryFilter === c
                      ? "bg-background text-foreground border border-border shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 font-mono text-[10.5px] text-muted-foreground">
                    <th className="py-2.5 px-3 font-medium">Priority</th>
                    <th className="py-2.5 px-3 font-medium">Skill / Focus Area</th>
                    <th className="py-2.5 px-3 font-medium hidden sm:table-cell">Type</th>
                    <th className="py-2.5 px-3 font-medium hidden md:table-cell">Market Frequency</th>
                    <th className="py-2.5 px-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredHeatmap.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No skill gaps match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredHeatmap.map((item) => {
                      const isSelected = selectedSkill === item.canonical
                      const pStyle = priorityStyles[item.priority]

                      return (
                        <tr
                          key={item.canonical}
                          onClick={() => setSelectedSkill(item.canonical)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-primary/5 dark:bg-primary/10"
                              : "hover:bg-muted/40"
                          }`}
                        >
                          {/* Priority */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-[3px] font-mono text-[10px] font-medium border ${pStyle.badge}`}
                            >
                              <span className={`size-1.5 rounded-full ${pStyle.dot}`} />
                              <span>{item.priority}</span>
                            </span>
                          </td>

                          {/* Skill Name */}
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              <span>{item.name}</span>
                            </div>
                            <div className="sm:hidden text-[10px] text-muted-foreground font-mono mt-0.5">
                              {categoryLabels[item.category]} • {item.count} jobs
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-2.5 px-3 hidden sm:table-cell whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                            {categoryLabels[item.category]}
                          </td>

                          {/* Frequency */}
                          <td className="py-2.5 px-3 hidden md:table-cell whitespace-nowrap">
                            <span className="font-mono tabular-nums text-muted-foreground text-[11px]">
                              {item.provenanceDescription}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-6 px-2 text-[11px] rounded-[4px] cursor-pointer ${
                                isSelected
                                  ? "text-primary font-semibold"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <span>Plan</span>
                              <ChevronRight className="size-3 ml-1" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Tailored Learning Roadmap Card (5 cols) */}
        <div className="lg:col-span-5">
          {activeRoadmapItem ? (
            <BlueprintCard>
              <BlueprintCardHeader className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-border/60">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] font-mono text-[10px] font-medium border ${
                        priorityStyles[activeRoadmapItem.priority].badge
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          priorityStyles[activeRoadmapItem.priority].dot
                        }`}
                      />
                      <span>{activeRoadmapItem.priority} Gap</span>
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {categoryLabels[activeRoadmapItem.category]}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground">
                    {activeRoadmapItem.skill}
                  </h3>
                </div>

                <div className="flex items-center gap-1 text-xs font-mono tabular-nums px-2 py-1 rounded-[4px] border border-border bg-muted/40 text-muted-foreground">
                  <Clock className="size-3 text-muted-foreground" />
                  <span>{activeRoadmapItem.estimatedHours}</span>
                </div>
              </BlueprintCardHeader>

              <BlueprintCardContent className="space-y-4 text-xs p-4 sm:p-5">
                {/* 1. Tailored Study Direction */}
                <div className="p-3 rounded-[5px] border border-border/80 bg-muted/30">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
                    Candidate-Specific Study Strategy
                  </span>
                  <p className="text-foreground leading-relaxed">
                    {activeRoadmapItem.studyDirection}
                  </p>
                </div>

                {/* 2. Curated Learning Resources */}
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-2">
                    Curated Verification & Study Resources
                  </span>
                  <div className="space-y-2">
                    {activeRoadmapItem.resources.map((res, i) => (
                      <a
                        key={i}
                        href={res.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group block p-2.5 rounded-[4px] border border-border bg-card hover:border-foreground/30 hover:shadow-2xs transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                            <BookOpen className="size-3 text-muted-foreground shrink-0" />
                            <span>{res.title}</span>
                          </span>
                          <ExternalLink className="size-3 text-muted-foreground group-hover:text-foreground shrink-0" />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                          {res.reason}
                        </p>
                      </a>
                    ))}
                  </div>
                </div>
              </BlueprintCardContent>
            </BlueprintCard>
          ) : (
            <div className="p-8 rounded-[6px] border border-dashed border-border bg-card text-center text-xs text-muted-foreground">
              Select any skill from the heatmap to view its tailored study path and curated resources.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
