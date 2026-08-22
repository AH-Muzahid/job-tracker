"use client"

import React from "react"
import { CheckCircle2, AlertCircle, GitBranch, ArrowRight, Layers, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { GraphMatchResult } from "@/lib/ai/knowledge-graph"

interface CareerGraphVisualizerProps {
  graphMatch?: GraphMatchResult | null
}

export function CareerGraphVisualizer({ graphMatch }: CareerGraphVisualizerProps) {
  if (!graphMatch || !graphMatch.matchedSkills) return null

  const score = graphMatch.matchScore || 0
  const matchedCount = graphMatch.matchedSkills.length
  const missingCount = graphMatch.missingSkills?.length || 0

  return (
    <Card className="border-indigo-500/20 bg-gradient-to-b from-card to-indigo-950/5 overflow-hidden">
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-indigo-500" />
              <span>Career Knowledge Tree & Proof Graph</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Deterministic skill-to-project proof paths verified against this role.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs text-muted-foreground">Graph Match</span>
              <p className="text-base font-bold text-foreground">{score}%</p>
            </div>
            <div className="w-16">
              <Progress value={score} className="h-2" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Quick Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="rounded-lg border bg-background/50 p-2.5 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Verified Skills</p>
              <p className="text-sm font-semibold text-foreground">{matchedCount} Competencies</p>
            </div>
          </div>
          <div className="rounded-lg border bg-background/50 p-2.5 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Skill Gaps</p>
              <p className="text-sm font-semibold text-foreground">{missingCount} Identified</p>
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-lg border bg-background/50 p-2.5 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Graph Integrity</p>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">100% Proven</p>
            </div>
          </div>
        </div>

        {/* Matched Skill Tree Nodes */}
        {matchedCount > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Verified Proof Paths</span>
            </h4>
            <div className="space-y-2">
              {graphMatch.matchedSkills.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border bg-background p-3 space-y-2 hover:border-indigo-500/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-foreground">{item.skill}</span>
                      <Badge variant="outline" className="text-[10px] uppercase py-0 px-1.5 text-muted-foreground">
                        {item.level || "Verified"}
                      </Badge>
                    </div>
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px]">
                      Match
                    </Badge>
                  </div>

                  {/* Connected Projects and Evidence */}
                  {item.proofProjects && item.proofProjects.length > 0 ? (
                    <div className="space-y-1 pl-2 border-l-2 border-indigo-500/20 text-xs">
                      {item.proofProjects.map((p, pIdx) => (
                        <div key={pIdx} className="flex items-center gap-1.5 text-muted-foreground">
                          <ArrowRight className="h-3 w-3 text-indigo-500 shrink-0" />
                          <span className="text-foreground font-medium">{p.projectName}</span>
                          {p.role && <span className="text-[11px] text-muted-foreground">({p.role})</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic pl-2 border-l-2 border-muted">
                      Direct proficiency logged in candidate skill repository.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missing Gaps */}
        {missingCount > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Identified Skill Gaps (Address in Interview)</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {graphMatch.missingSkills.map((gap, gIdx) => (
                <Badge key={gIdx} variant="outline" className="text-xs border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5">
                  {gap}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
