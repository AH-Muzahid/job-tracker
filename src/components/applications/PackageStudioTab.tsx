"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Layers, Bot, Zap, ArrowRight, CheckCircle2, Clock, Globe, ExternalLink, ShieldCheck, FileText, ChevronRight, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { ApplicationPackageItem } from "@/lib/applications/package-engine"

interface PackageStudioTabProps {
  applicationId: string
}

export function PackageStudioTab({ applicationId }: PackageStudioTabProps) {
  const [pkg, setPkg] = useState<ApplicationPackageItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchPackage() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/applications/${applicationId}/package`)
      if (!res.ok) throw new Error("Failed to load application package")
      const data = await res.json()
      setPkg(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load package")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (applicationId) {
      fetchPackage()
    }
  }, [applicationId])

  if (loading) {
    return (
      <div className="space-y-4 py-2">
        <Skeleton className="h-16 w-full rounded-xl bg-muted" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-36 rounded-xl bg-muted" />
          <Skeleton className="h-36 rounded-xl bg-muted" />
        </div>
        <Skeleton className="h-28 rounded-xl bg-muted" />
      </div>
    )
  }

  if (error || !pkg) {
    return (
      <div className="p-8 text-center border border-dashed border-border rounded-xl space-y-3">
        <p className="text-sm text-muted-foreground">{error || "No package generated yet."}</p>
        <Button variant="outline" size="sm" onClick={fetchPackage}>
          <RefreshCw className="size-3.5 mr-1.5" /> Try Again
        </Button>
      </div>
    )
  }

  const nba = pkg.nextBestAction
  const intel = pkg.companyIntel
  const techStack = pkg.techStack || []

  return (
    <div className="space-y-5">
      {/* 1. Next Best Tactical Action Linear Banner */}
      {nba && (
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mt-0.5 shrink-0">
              <Zap className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground tracking-tight">{nba.title}</span>
                <Badge variant="outline" className="text-[10px] uppercase font-mono py-0 px-1 text-primary border-primary/30">
                  Recommended Action
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{nba.description}</p>
            </div>
          </div>

          <Link href={nba.href}>
            <Button size="sm" className="h-8 text-xs font-medium shrink-0 w-full sm:w-auto">
              {nba.ctaLabel} <ChevronRight className="size-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      )}

      {/* 2. Side-by-Side Asset Health & Company Intel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card A: Multi-Asset Readiness Grid */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="size-3.5" /> Collateral Readiness
            </h4>
            <span className="text-[10px] font-mono text-muted-foreground">Automated Assets</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/60">
              <span className="text-foreground">Tailored ATS Resume</span>
              {pkg.resume.hasTailoredResume ? (
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                  ✓ Generated ({pkg.resume.atsScore || 85}%)
                </Badge>
              ) : (
                <span className="text-muted-foreground font-mono">Default Linked</span>
              )}
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/60">
              <span className="text-foreground">Cover Letter</span>
              {pkg.coverLetter.hasCoverLetter ? (
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                  ✓ Ready
                </Badge>
              ) : (
                <span className="text-muted-foreground font-mono">Not Created</span>
              )}
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/60">
              <span className="text-foreground">Recruiter Outreach Draft</span>
              {pkg.outreach.hasOutreachDraft ? (
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                  ✓ Pitch Prepared
                </Badge>
              ) : (
                <span className="text-muted-foreground font-mono">Pending</span>
              )}
            </div>
          </div>
        </div>

        {/* Card B: Company Intelligence */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Globe className="size-3.5" /> Company Dossier
            </h4>
            <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
              {intel.companyName}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Industry</span>
              <span className="font-medium text-foreground">{intel.industry || "Technology"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Funding / Stage</span>
              <span className="font-medium text-foreground">{intel.stage || "Private"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Team Scale</span>
              <span className="font-medium text-foreground">{intel.headcount || "50-200"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Matched Canonical Tech Stack */}
      {techStack.length > 0 && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-2.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Layers className="size-3.5" /> Target Tech Stack Extracted
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {techStack.map((tech) => (
              <Badge key={tech} variant="secondary" className="text-xs py-0.5 px-2 bg-muted border border-border text-foreground font-mono">
                {tech}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
