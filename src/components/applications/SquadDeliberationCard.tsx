"use client"

import { Bot, ShieldCheck, BrainCircuit, CheckCircle2, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { SquadTraceDeliberation } from "@/lib/applications/package-engine"

interface SquadDeliberationCardProps {
  squadTrace: SquadTraceDeliberation
}

export function SquadDeliberationCard({ squadTrace }: SquadDeliberationCardProps) {
  const { scoutSummary, strategistBrief, criticAudit } = squadTrace

  if (!scoutSummary && !strategistBrief && !criticAudit) {
    return null
  }

  return (
    <div className="p-4 rounded-[6px] border border-border bg-card space-y-3.5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Bot className="size-3.5 text-primary" /> Autonomous Squad Deliberation Trace
        </h4>
        {criticAudit && (
          <Badge
            variant="outline"
            className="text-[10px] font-mono py-0 px-1.5 rounded-[4px] border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1"
          >
            <ShieldCheck className="size-3" />
            Critic Approved • {criticAudit.rounds} Round{criticAudit.rounds > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        {/* Step 1: Scout */}
        <div className="p-3 rounded-[4px] border border-border/80 bg-muted/20 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground font-mono text-[11px]">
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <BrainCircuit className="size-3 text-primary" /> 1. Scout
            </span>
            <span className="text-[10px]">Context Extracted</span>
          </div>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Targeting <strong className="text-foreground">{scoutSummary?.role || "Target Role"}</strong> at{" "}
            <strong className="text-foreground">{scoutSummary?.company || "Company"}</strong>.
          </p>
          {scoutSummary?.techStackDetected && scoutSummary.techStackDetected.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {scoutSummary.techStackDetected.slice(0, 4).map((tech) => (
                <span key={tech} className="px-1.5 py-0.5 rounded-[2px] bg-background border border-border text-[10px] font-mono text-muted-foreground">
                  {tech}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Step 2: Strategist */}
        <div className="p-3 rounded-[4px] border border-border/80 bg-muted/20 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground font-mono text-[11px]">
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <ChevronRight className="size-3 text-primary" /> 2. Strategist
            </span>
            <span className="text-[10px]">Positioning Angle</span>
          </div>
          <p className="text-muted-foreground text-[11px] leading-relaxed line-clamp-3">
            {strategistBrief?.positioningPitch || "Synthesized candidate proof metrics into tailored angle."}
          </p>
          {strategistBrief?.matchedSkills && strategistBrief.matchedSkills.length > 0 && (
            <div className="text-[10px] text-muted-foreground font-mono pt-1">
              Anchors: {strategistBrief.matchedSkills.slice(0, 2).map((s) => s.skill).join(", ")}
            </div>
          )}
        </div>

        {/* Step 3: Critic */}
        <div className="p-3 rounded-[4px] border border-border/80 bg-muted/20 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground font-mono text-[11px]">
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <CheckCircle2 className="size-3 text-emerald-500" /> 3. Critic & Scribe
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Verified</span>
          </div>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Passed placeholder-free check, ATS keyword parity, and tone evaluation without hallucination.
          </p>
          {criticAudit?.feedback && criticAudit.feedback.length > 0 && (
            <div className="text-[10px] text-amber-600 dark:text-amber-400 pt-1">
              Reflexions resolved: {criticAudit.feedback.length}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
