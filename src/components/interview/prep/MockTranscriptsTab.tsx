"use client"

import React, { useState, useMemo } from "react"
import {
  History,
  Calendar,
  Trash2,
  ChevronRight,
  Bot,
  User,
  Mic,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Building2,
  BrainCircuit,
  BarChart3,
  Clock,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { InterviewSessionItem } from "./types"
import { GapDoctorSection } from "../conversational/GapDoctorSection"
import {
  computeLongitudinalMasteryAnalytics,
  classifyCompanyTier,
  CompanyTierType,
} from "@/lib/interview/company-benchmarks"

interface MockTranscriptsTabProps {
  sessions: InterviewSessionItem[]
  loading: boolean
  onDeleteSession: (id: string) => Promise<void>
  onStartMockInterview: () => void
}

type SubViewType = "overview" | "transcripts" | "weaknesses"

export function MockTranscriptsTab({
  sessions,
  loading,
  onDeleteSession,
  onStartMockInterview,
}: MockTranscriptsTabProps) {
  const [selectedSession, setSelectedSession] = useState<InterviewSessionItem | null>(null)
  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [activeSubView, setActiveSubView] = useState<SubViewType>("overview")

  // Compute longitudinal analytics client-side for zero-latency updates
  const analytics = useMemo(() => {
    return computeLongitudinalMasteryAnalytics(sessions)
  }, [sessions])

  const getTierBadgeStyle = (tier: CompanyTierType) => {
    switch (tier) {
      case "Tier 1 (Big Tech)":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25"
      case "Tier 2 (Scaleup / Enterprise)":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25"
      default:
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
    }
  }

  const getReadinessBadgeStyle = (readiness: string) => {
    switch (readiness) {
      case "Ready":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
      case "Competitive":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25"
      case "Borderline":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
      case "Gap Identified":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  const getProficiencyBadgeStyle = (status: string) => {
    switch (status) {
      case "Mastered":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
      case "Proficient":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25"
      case "Developing":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
      default:
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
    }
  }

  const getScoreBadgeColor = (score: number) => {
    if (score >= 85) return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
    if (score >= 70) return "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/25"
    return "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/25"
  }

  return (
    <div className="space-y-6">
      {/* 1. Header & Navigation Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-semibold text-foreground">
              Interview History & Longitudinal Mastery
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {sessions.length} Recorded
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track readiness velocity, company hiring bar benchmarks, and recurring weakness patterns over time.
          </p>
        </div>

        {sessions.length > 0 && (
          <div className="flex items-center gap-1.5 p-1 bg-muted/40 border border-border rounded-lg self-start sm:self-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveSubView("overview")}
              className={cn(
                "h-7 text-xs px-2.5 cursor-pointer font-medium",
                activeSubView === "overview" && "bg-background text-foreground shadow-xs"
              )}
            >
              <BarChart3 className="size-3.5 mr-1.5" />
              Mastery & Tiers
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveSubView("transcripts")}
              className={cn(
                "h-7 text-xs px-2.5 cursor-pointer font-medium",
                activeSubView === "transcripts" && "bg-background text-foreground shadow-xs"
              )}
            >
              <History className="size-3.5 mr-1.5" />
              Transcripts ({sessions.length})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveSubView("weaknesses")}
              className={cn(
                "h-7 text-xs px-2.5 cursor-pointer font-medium",
                activeSubView === "weaknesses" && "bg-background text-foreground shadow-xs"
              )}
            >
              <BrainCircuit className="size-3.5 mr-1.5" />
              Weakness Radar ({analytics.recurringWeaknesses.length})
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="relative border border-border bg-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-5 bg-background space-y-3">
                <Skeleton className="h-4 w-32 rounded-sm" />
                <Skeleton className="h-3.5 w-48 rounded-sm" />
                <Skeleton className="h-3 w-24 rounded-sm" />
              </div>
            ))}
          </div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-lg bg-card/40 space-y-3">
          <History className="size-8 text-muted-foreground mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">No Mock Sessions Recorded Yet</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Take a live spoken mock interview to unlock longitudinal score progression, company difficulty benchmarks, and targeted weakness diagnosis.
            </p>
          </div>
          <Button
            onClick={onStartMockInterview}
            size="sm"
            className="text-xs h-8 px-4 font-medium cursor-pointer mt-2"
          >
            <Mic className="size-3.5 mr-1.5" />
            Start First Mock Interview
          </Button>
        </div>
      ) : (
        <>
          {/* 2. Longitudinal Executive Metric Strip */}
          <div className="relative border border-border bg-border">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
              {/* Avg Readiness Score */}
              <div className="p-4 sm:p-5 bg-background space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground">Overall Readiness</span>
                  <Award className="size-3.5 text-muted-foreground" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                    {analytics.averageScore > 0 ? analytics.averageScore : "--"}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">/ 100</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono">
                  {analytics.trajectoryChange > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <TrendingUp className="size-3" />
                      +{analytics.trajectoryChange} pts velocity
                    </span>
                  ) : analytics.trajectoryChange < 0 ? (
                    <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                      <TrendingDown className="size-3" />
                      {analytics.trajectoryChange} pts velocity
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-0.5">
                      <Target className="size-3" />
                      Baseline calibrated
                    </span>
                  )}
                </div>
              </div>

              {/* Pass Rate */}
              <div className="p-4 sm:p-5 bg-background space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground">Interview Pass Rate</span>
                  <CheckCircle2 className="size-3.5 text-muted-foreground" />
                </div>
                <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                  {analytics.passRate}%
                </div>
                <span className="text-[11px] font-mono text-muted-foreground block">
                  {analytics.verdictDistribution.strongHire + analytics.verdictDistribution.hire} Hire verdicts
                </span>
              </div>

              {/* Practice Volume */}
              <div className="p-4 sm:p-5 bg-background space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground">Spoken Practice</span>
                  <Clock className="size-3.5 text-muted-foreground" />
                </div>
                <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                  ~{analytics.estimatedPracticeMinutes}m
                </div>
                <span className="text-[11px] font-mono text-muted-foreground block">
                  across {analytics.totalSessions} sessions
                </span>
              </div>

              {/* Tier 1 Big Tech Readiness */}
              <div className="p-4 sm:p-5 bg-background space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground">Tier 1 Big Tech Bar</span>
                  <Building2 className="size-3.5 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 text-xs font-mono font-medium rounded-full border",
                      getReadinessBadgeStyle(analytics.companyTierBenchmarks["Tier 1 (Big Tech)"].readiness)
                    )}
                  >
                    {analytics.companyTierBenchmarks["Tier 1 (Big Tech)"].readiness}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground block">
                  Target: 85 pts standard
                </span>
              </div>
            </div>
          </div>

          {/* 3. Sub-View: Mastery & Company Tier Benchmarks */}
          {activeSubView === "overview" && (
            <div className="space-y-6">
              {/* Benchmarking Grid: Left = Company Tiers, Right = Round Archetypes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Panel 1: Company Difficulty Tiers */}
                <div className="border border-border rounded-lg p-5 bg-card space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Building2 className="size-4 text-primary" />
                        Company Difficulty Benchmarks
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Your evaluated performance against hiring bar standards.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-1">
                    {(
                      Object.values(analytics.companyTierBenchmarks) as Array<
                        (typeof analytics.companyTierBenchmarks)["Tier 1 (Big Tech)"]
                      >
                    ).map((tierData) => {
                      const percentage = Math.min(
                        Math.max(
                          tierData.sessionCount > 0 ? (tierData.averageScore / 100) * 100 : 0,
                          0
                        ),
                        100
                      )

                      return (
                        <div
                          key={tierData.tier}
                          className="p-3.5 rounded-md border border-border bg-background/60 space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded-full border",
                                  getTierBadgeStyle(tierData.tier)
                                )}
                              >
                                {tierData.tierShort}
                              </span>
                              <span className="text-xs font-semibold text-foreground">
                                {tierData.tier}
                              </span>
                            </div>

                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded-full border",
                                getReadinessBadgeStyle(tierData.readiness)
                              )}
                            >
                              {tierData.readiness}
                            </span>
                          </div>

                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {tierData.description}
                          </p>

                          {/* Progress Bar vs Benchmark */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="text-muted-foreground">
                                Your Avg:{" "}
                                <strong className="text-foreground">
                                  {tierData.sessionCount > 0 ? `${tierData.averageScore} pts` : "No data"}
                                </strong>
                              </span>
                              <span className="text-muted-foreground">
                                Target:{" "}
                                <strong className="text-foreground">{tierData.benchmarkTarget} pts</strong>
                              </span>
                            </div>

                            <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary/50">
                              <div
                                className={cn(
                                  "h-full transition-all duration-300",
                                  tierData.averageScore >= tierData.benchmarkTarget
                                    ? "bg-emerald-500"
                                    : tierData.averageScore >= tierData.benchmarkTarget - 7
                                    ? "bg-blue-500"
                                    : "bg-amber-500"
                                )}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>

                          {tierData.companies.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              <span className="text-[10px] font-mono text-muted-foreground">Tested at:</span>
                              {tierData.companies.map((c) => (
                                <span
                                  key={c}
                                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border text-foreground"
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Panel 2: Round Archetype Mastery */}
                <div className="border border-border rounded-lg p-5 bg-card space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Target className="size-4 text-primary" />
                        Round Archetype Mastery
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Proficiency across Behavioral, System Design, and Technical rounds.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    {Object.keys(analytics.roundArchetypes).length === 0 ? (
                      <p className="text-xs text-muted-foreground italic p-4 text-center">
                        No round archetypes evaluated yet.
                      </p>
                    ) : (
                      Object.values(analytics.roundArchetypes).map((arch) => {
                        const pct = Math.min(Math.max((arch.averageScore / 100) * 100, 0), 100)

                        return (
                          <div
                            key={arch.roundType}
                            className="p-3.5 rounded-md border border-border bg-background/60 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-foreground">
                                  {arch.roundType} Round
                                </span>
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  ({arch.sessionCount} session{arch.sessionCount > 1 ? "s" : ""})
                                </span>
                              </div>

                              <span
                                className={cn(
                                  "inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded-full border",
                                  getProficiencyBadgeStyle(arch.status)
                                )}
                              >
                                {arch.status}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-mono">
                                <span className="text-muted-foreground">
                                  Avg Score:{" "}
                                  <strong className="text-foreground">{arch.averageScore} / 100</strong>
                                </span>
                                <span className="text-muted-foreground">
                                  Best: <strong className="text-foreground">{arch.highestScore}</strong>
                                </span>
                              </div>

                              <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary/50">
                                <div
                                  className={cn(
                                    "h-full transition-all duration-300",
                                    arch.averageScore >= 85
                                      ? "bg-emerald-500"
                                      : arch.averageScore >= 75
                                      ? "bg-blue-500"
                                      : "bg-amber-500"
                                  )}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Panel 3: Chronological Score Trajectory Timeline */}
              {analytics.scoreProgression.length > 0 && (
                <div className="border border-border rounded-lg p-5 bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <TrendingUp className="size-4 text-primary" />
                        Longitudinal Score Progression
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Chronological trajectory of scored mock rounds.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
                    {analytics.scoreProgression.map((p, idx) => (
                      <div
                        key={p.id}
                        className="p-3 rounded-md border border-border bg-background space-y-2 hover:bg-muted/10 transition-colors"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                          <span>#{idx + 1} • {new Date(p.date).toLocaleDateString()}</span>
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded border text-[10px] font-semibold font-mono",
                              getScoreBadgeColor(p.score)
                            )}
                          >
                            {p.score} pts
                          </span>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-foreground truncate">
                            {p.targetCompany}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {p.interviewType} • {p.targetRole}
                          </p>
                        </div>

                        {p.verdict && (
                          <div className="pt-1 border-t border-border/60">
                            <span className="text-[10px] font-mono text-muted-foreground">
                              Verdict: <strong className="text-foreground">{p.verdict}</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. Sub-View: Recurring Weakness Radar */}
          {activeSubView === "weaknesses" && (
            <div className="space-y-4">
              <div className="border border-border rounded-lg p-5 bg-card space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <BrainCircuit className="size-4 text-primary" />
                    Cross-Session Weakness Radar
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Knowledge gaps diagnosed repeatedly across multiple mock rounds. The AI interviewer tests these in Turn 3.
                  </p>
                </div>

                {analytics.recurringWeaknesses.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-border rounded-md space-y-2">
                    <CheckCircle2 className="size-6 text-emerald-500 mx-auto" />
                    <p className="text-xs font-semibold text-foreground">Zero Recurring Weaknesses Flagged</p>
                    <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                      All diagnosed knowledge gaps were addressed or no repeated shortcomings have surfaced yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {analytics.recurringWeaknesses.map((w) => (
                      <div
                        key={w.topic}
                        className="p-4 rounded-md border border-border bg-background space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            {w.topic}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 font-medium">
                            Flagged {w.occurrences}x
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                          <span className="capitalize">{w.type} gap</span>
                          <span>•</span>
                          <span
                            className={cn(
                              "font-medium",
                              w.highestSeverity === "high"
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-amber-600 dark:text-amber-400"
                            )}
                          >
                            {w.highestSeverity.toUpperCase()} Severity
                          </span>
                        </div>

                        {w.companies.length > 0 && (
                          <div className="pt-2 border-t border-border flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-mono text-muted-foreground">Encountered at:</span>
                            {w.companies.map((c) => (
                              <span
                                key={c}
                                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border text-foreground"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. Sub-View: Full Transcripts List */}
          {activeSubView === "transcripts" && (
            <div className="relative border border-border bg-border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
                {sessions.map((session) => {
                  const tier = classifyCompanyTier(session.targetCompany)
                  const score =
                    session.score ??
                    (session.report?.overallScore ? Number(session.report.overallScore) : null)

                  return (
                    <div
                      key={session.id}
                      className="bg-background p-4 sm:p-5 flex flex-col justify-between gap-3.5 group transition-colors hover:bg-muted/10"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-muted border border-border text-foreground">
                              {session.interviewType} Round
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium rounded border",
                                getTierBadgeStyle(tier.tier)
                              )}
                            >
                              {tier.tierShort}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {score !== null && (
                              <span
                                className={cn(
                                  "px-2 py-0.5 text-[10px] font-mono font-bold rounded border",
                                  getScoreBadgeColor(score)
                                )}
                              >
                                {score} pts
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                              <Calendar className="size-3" />
                              <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                            </span>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-semibold text-foreground">
                            {session.targetCompany}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {session.targetRole}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedSession(session)
                              setSessionModalOpen(true)
                            }}
                            className="h-7 text-xs px-2.5 border-border cursor-pointer font-medium"
                          >
                            <span>Review Debrief</span>
                            <ChevronRight className="size-3 ml-1" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteSession(session.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md cursor-pointer opacity-80 group-hover:opacity-100"
                          title="Remove Session"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Dual Conversational Transcript & Gap Analysis Modal */}
      {selectedSession && (
        <Dialog open={sessionModalOpen} onOpenChange={setSessionModalOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-background border-border text-foreground p-4 sm:p-6">
            <DialogHeader className="pb-3 border-b border-border space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-muted border border-border text-foreground">
                  {selectedSession.interviewType}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {new Date(selectedSession.createdAt).toLocaleDateString()}
                </span>
              </div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                {selectedSession.targetCompany} — {selectedSession.targetRole}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Complete verbal transcript and AI STAR assessment.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 pt-2">
              {/* STAR Gap Analysis Section */}
              {selectedSession.report?.knowledgeGaps && selectedSession.report.knowledgeGaps.length > 0 && (
                <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
                  <h4 className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
                    Performance Evaluation & Knowledge Gaps
                  </h4>
                  <GapDoctorSection
                    gaps={selectedSession.report.knowledgeGaps}
                    targetCompany={selectedSession.targetCompany}
                    targetRole={selectedSession.targetRole}
                  />
                </div>
              )}

              {/* Spoken Dual Conversation Transcript */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
                  Spoken Conversation Transcript
                </h4>

                <div className="space-y-3.5 pt-1">
                  {selectedSession.dialogue && selectedSession.dialogue.length > 0 ? (
                    selectedSession.dialogue.map((msg: { role: string; text: string; timestamp?: string }, idx: number) => {
                      const isUser = msg.role === "candidate" || msg.role === "user"

                      return (
                        <div
                          key={idx}
                          className={cn(
                            "flex flex-col space-y-1",
                            isUser ? "items-end" : "items-start"
                          )}
                        >
                          {/* Message Sender Header */}
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground px-1">
                            {isUser ? (
                              <>
                                <span>{msg.timestamp || ""}</span>
                                <span className="font-semibold text-foreground flex items-center gap-1">
                                  <span>You (Candidate)</span>
                                  <User className="size-3 text-primary" />
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="font-semibold text-foreground flex items-center gap-1">
                                  <Bot className="size-3 text-muted-foreground" />
                                  <span>Interviewer (AI)</span>
                                </span>
                                <span>{msg.timestamp || ""}</span>
                              </>
                            )}
                          </div>

                          {/* Dual Chat Bubble */}
                          <div
                            className={cn(
                              "rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed max-w-[90%] sm:max-w-[82%] whitespace-pre-wrap",
                              isUser
                                ? "bg-primary/10 border border-primary/25 text-foreground rounded-tr-xs"
                                : "bg-card border border-border text-foreground rounded-tl-xs shadow-2xs"
                            )}
                          >
                            {msg.text}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No transcript messages recorded.</p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSessionModalOpen(false)}
                className="h-8 text-xs cursor-pointer"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
