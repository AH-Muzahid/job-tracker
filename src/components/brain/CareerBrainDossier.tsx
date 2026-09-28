"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  BrainCircuit,
  ShieldCheck,
  Lock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Cpu,
  Target,
} from "lucide-react"
import {
  PageContainer,
  PageHeader,
  BlueprintCard,
  BlueprintCardHeader,
  BlueprintCardTitle,
  BlueprintCardContent,
  KPIStrip,
  EmptyState,
} from "@/components/primitives"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"
import type { BrainDossierResponse } from "@/app/api/user/brain/route"

export function CareerBrainDossier() {
  const [data, setData] = useState<BrainDossierResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("constraints")

  // Add item form state
  const [newCategory, setNewCategory] = useState<"constraint" | "experience" | "preference" | "weakness">("constraint")
  const [newContent, setNewContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchDossier = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/user/brain")
      if (!res.ok) throw new Error("Failed to load Career Brain dossier")
      const result = await res.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dossier")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDossier()
  }, [fetchDossier])

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newContent.trim()) return

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/user/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: newCategory,
          content: newContent.trim(),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to add memory item")
      }

      toast.success("Added to Career Brain ground truth")
      setNewContent("")
      await fetchDossier()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add item")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteMemory = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/user/brain?id=${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to remove item")
      }

      toast.success("Removed from Career Brain")
      await fetchDossier()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove item")
    } finally {
      setDeletingId(null)
    }
  }

  const nonNegotiables = data?.nonNegotiables || []
  const verifiedMetrics = data?.verifiedMetrics || []
  const activeGaps = data?.interviewGaps?.active || []
  const resolvedGaps = data?.interviewGaps?.resolved || []
  const knowledgeGraph = data?.knowledgeGraph

  const kpiItems = [
    {
      id: "non-negotiables",
      label: "Non-Negotiables",
      value: nonNegotiables.length,
      subtext: "Strict matching constraints",
      icon: Lock,
    },
    {
      id: "verified-metrics",
      label: "Verified Proof Metrics",
      value: verifiedMetrics.length,
      subtext: "Anti-hallucination anchors",
      icon: Target,
    },
    {
      id: "interview-gaps",
      label: "Resolved Gaps",
      value: `${resolvedGaps.length}/${activeGaps.length + resolvedGaps.length}`,
      subtext: "Mock interview mastery",
      icon: ShieldCheck,
    },
    {
      id: "kg-nodes",
      label: "Knowledge Graph Nodes",
      value: knowledgeGraph?.nodesCount || 0,
      subtext: "Canonical career taxonomy",
      icon: BrainCircuit,
    },
  ]

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        overline="GROUND TRUTH MEMORY DOSSIER"
        title="Career Brain"
        description="The candidate ground-truth intelligence engine. All autonomous applications, ATS resume tailorings, and cover letters strictly reference this verified data to prevent hallucinations."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDossier}
            disabled={loading}
            className="rounded-[4px] h-8 text-xs font-medium gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Dossier
          </Button>
        }
      />

      {error && (
        <div className="p-3 text-xs rounded-[4px] bg-destructive/10 text-destructive border border-destructive/20">
          {error}
        </div>
      )}

      {/* KPI Overview Strip */}
      <KPIStrip items={kpiItems} isLoading={loading} columns={4} />

      {/* Add New Intelligence Entry Form */}
      <BlueprintCard>
        <BlueprintCardHeader>
          <BlueprintCardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Plus className="size-3.5 text-primary" /> Add Ground Truth Constraint or Proof Metric
          </BlueprintCardTitle>
        </BlueprintCardHeader>
        <BlueprintCardContent>
          <form onSubmit={handleAddMemory} className="flex flex-col sm:flex-row gap-2.5">
            <select
              aria-label="Intelligence Category"
              value={newCategory}
              onChange={(e) =>
                setNewCategory(e.target.value as "constraint" | "experience" | "preference" | "weakness")
              }
              className="h-9 px-3 text-xs bg-background border border-border rounded-[4px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:w-44 shrink-0 font-medium"
            >
              <option value="constraint">Non-Negotiable Constraint</option>
              <option value="experience">Verified Proof Metric</option>
              <option value="preference">Style / Tone Preference</option>
              <option value="weakness">Known Interview Growth Area</option>
            </select>
            <Input
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={
                newCategory === "constraint"
                  ? "e.g., Minimum base salary $160k, strictly US remote, no on-call rotation..."
                  : newCategory === "experience"
                  ? "e.g., Scaled PostgreSQL cluster to 10k QPS with 99.99% uptime..."
                  : "e.g., Prefers punchy, metric-first cover letter hooks..."
              }
              className="text-xs h-9 rounded-[4px] flex-1 bg-background"
            />
            <Button
              type="submit"
              disabled={isSubmitting || !newContent.trim()}
              className="h-9 text-xs font-medium rounded-[4px] px-4 shrink-0 shadow-none"
            >
              {isSubmitting ? "Adding..." : "Add to Brain"}
            </Button>
          </form>
        </BlueprintCardContent>
      </BlueprintCard>

      {/* Main Categorized Dossier Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50 p-1 rounded-[6px] border border-border h-9">
          <TabsTrigger value="constraints" className="text-xs rounded-[4px] data-[state=active]:bg-background">
            Non-Negotiables ({nonNegotiables.length})
          </TabsTrigger>
          <TabsTrigger value="metrics" className="text-xs rounded-[4px] data-[state=active]:bg-background">
            Proof Metrics ({verifiedMetrics.length})
          </TabsTrigger>
          <TabsTrigger value="gaps" className="text-xs rounded-[4px] data-[state=active]:bg-background">
            Interview Gaps ({activeGaps.length + resolvedGaps.length})
          </TabsTrigger>
          <TabsTrigger value="graph" className="text-xs rounded-[4px] data-[state=active]:bg-background">
            Knowledge Graph ({knowledgeGraph?.nodesCount || 0})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Non-Negotiables */}
        <TabsContent value="constraints" className="space-y-3">
          {nonNegotiables.length === 0 ? (
            <EmptyState
              icon={Lock}
              title="No non-negotiables defined"
              description="Add salary floors, remote requirements, or work visa constraints to filter out unsuitable roles automatically."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {nonNegotiables.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-[6px] border border-border bg-card flex items-start justify-between gap-3 group hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="size-6 rounded-[4px] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Lock className="size-3" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-foreground font-medium leading-relaxed">{item.content}</p>
                      <span className="text-[10px] font-mono text-muted-foreground block">
                        Pinned Constraint • Added {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteMemory(item.id)}
                    disabled={deletingId === item.id}
                    className="size-7 rounded-[4px] text-muted-foreground hover:text-destructive shrink-0 opacity-80 group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Verified Proof Metrics */}
        <TabsContent value="metrics" className="space-y-3">
          {verifiedMetrics.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No verified proof metrics"
              description="Add concrete quantitative numbers from your career that the AI Scribe will anchor into cover letters and outreach pitches."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {verifiedMetrics.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-[6px] border border-border bg-card flex items-start justify-between gap-3 group hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="size-6 rounded-[4px] bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Target className="size-3" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-foreground font-medium leading-relaxed">{item.content}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono py-0 px-1 rounded-[2px]">
                          {item.source || "verified"}
                        </Badge>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteMemory(item.id)}
                    disabled={deletingId === item.id}
                    className="size-7 rounded-[4px] text-muted-foreground hover:text-destructive shrink-0 opacity-80 group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Interview Gaps & Learning Track */}
        <TabsContent value="gaps" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Column A: Active Growth Areas */}
            <div className="p-4 rounded-[6px] border border-border bg-card space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="size-3.5" /> Active Interview Gaps ({activeGaps.length})
                </h4>
                <span className="text-[10px] font-mono text-muted-foreground">Probed in Mock Sessions</span>
              </div>
              {activeGaps.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No active interview gaps detected.</p>
              ) : (
                <div className="space-y-2">
                  {activeGaps.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-[4px] border border-amber-500/20 bg-amber-500/5 flex items-start justify-between gap-2"
                    >
                      <p className="text-xs text-foreground leading-relaxed">{item.content}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteMemory(item.id)}
                        disabled={deletingId === item.id}
                        className="size-6 rounded-[2px] text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Column B: Resolved / Mastered Areas */}
            <div className="p-4 rounded-[6px] border border-border bg-card space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5" /> Mastered &amp; Resolved ({resolvedGaps.length})
                </h4>
                <span className="text-[10px] font-mono text-muted-foreground">STAR Score &gt;= 80%</span>
              </div>
              {resolvedGaps.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No weaknesses resolved yet.</p>
              ) : (
                <div className="space-y-2">
                  {resolvedGaps.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-[4px] border border-emerald-500/20 bg-emerald-500/5 flex items-start justify-between gap-2"
                    >
                      <p className="text-xs text-foreground leading-relaxed">{item.content}</p>
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono shrink-0 rounded-[2px] py-0">
                        Resolved
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab 4: Knowledge Graph Nodes */}
        <TabsContent value="graph" className="space-y-3">
          <div className="p-4 rounded-[6px] border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Cpu className="size-3.5 text-primary" /> Career Knowledge Graph Taxonomy
              </h4>
              <span className="text-[11px] font-mono text-muted-foreground">
                {knowledgeGraph?.nodesCount || 0} Nodes • {knowledgeGraph?.edgesCount || 0} Edges
              </span>
            </div>

            {knowledgeGraph?.summary && (
              <p className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-[4px] border border-border">
                {knowledgeGraph.summary}
              </p>
            )}

            {knowledgeGraph?.topNodes && knowledgeGraph.topNodes.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {knowledgeGraph.topNodes.map((node) => (
                  <div
                    key={node.id}
                    className="p-2 rounded-[4px] border border-border bg-muted/20 flex items-center gap-2 text-xs"
                  >
                    <span className="font-medium text-foreground">{node.label}</span>
                    <Badge variant="outline" className="text-[10px] font-mono uppercase rounded-[2px] py-0 px-1">
                      {node.type}
                    </Badge>
                    {node.weight && (
                      <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                        w:{node.weight}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">
                Knowledge graph nodes are extracted automatically from your verified profile projects and skills.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
