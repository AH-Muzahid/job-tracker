"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Info, CheckCircle2, ArrowLeft, AlertCircle,
  Calendar, MapPin, Banknote, Wifi,
  ArrowRight, RefreshCw, Check
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { OpportunityHeroHeader } from "./detail/OpportunityHeroHeader"
import { OpportunityJobDetailsCard } from "./detail/OpportunityJobDetailsCard"
import { OpportunityMatchScoreCard } from "./detail/OpportunityMatchScoreCard"
import { OpportunitySimilarStrip } from "./detail/OpportunitySimilarStrip"
import type { OpportunityDetailData, SimilarOpportunityItem, DetailTab } from "./detail/types"

interface OpportunityDetailPageProps {
  id: string
}

export function OpportunityDetailPage({ id }: OpportunityDetailPageProps) {
  const [data, setData] = useState<{
    opportunity: OpportunityDetailData
    similarOpportunities: SimilarOpportunityItem[]
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DetailTab>("overview")

  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPackaging, setIsPackaging] = useState(false)
  const [isStaged, setIsStaged] = useState(false)
  const [stagedAppId, setStagedAppId] = useState<string | null>(null)

  // Fetch opportunity details
  useEffect(() => {
    let isMounted = true

    async function fetchDetail() {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/discovery/${id}`)
        const json = await res.json()
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to load opportunity details")
        }

        if (isMounted) {
          setData(json.data)
          setIsSaved(json.data.opportunity.isSaved)
          setIsStaged(json.data.opportunity.isStaged)
          setStagedAppId(json.data.opportunity.applicationId)
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Could not load opportunity")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchDetail()
    return () => {
      isMounted = false
    }
  }, [id])

  // Save / Unsave toggle with 0ms optimistic update
  const handleSaveToggle = async () => {
    if (!data) return
    const prevSaved = isSaved
    const nextSaved = !prevSaved

    setIsSaved(nextSaved)
    setIsSaving(true)
    toast.success(nextSaved ? "Saved to Tracker" : "Removed from Saved")

    try {
      const res = await fetch("/api/jobs/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: nextSaved ? "save" : "unsave",
          jobId: data.opportunity.matchId || data.opportunity.id,
          companyName: data.opportunity.company,
          jobTitle: data.opportunity.title,
          jobUrl: data.opportunity.url,
          location: data.opportunity.location,
          salary: data.opportunity.salary,
        }),
      })
      if (!res.ok) throw new Error("Save action failed")
    } catch {
      setIsSaved(prevSaved)
      toast.error("Failed to update saved status")
    } finally {
      setIsSaving(false)
    }
  }

  // 1-Click Package & Stage action
  const handlePackage = async () => {
    if (!data || isPackaging || isStaged) return

    setIsPackaging(true)
    try {
      const res = await fetch(`/api/discovery/${id}/package`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: data.opportunity.company,
          jobTitle: data.opportunity.title,
          jobUrl: data.opportunity.url,
          location: data.opportunity.location,
          salary: data.opportunity.salary,
          fitScore: data.opportunity.fitScore,
          notes: `Fit Score: ${data.opportunity.fitScore}%\nLocation: ${data.opportunity.location || "N/A"}\nSource: Autonomous Job Discovery`,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Packaging failed")
      }

      setIsStaged(true)
      const createdAppId = json.data?.applicationId
      if (createdAppId) setStagedAppId(createdAppId)

      toast.success(
        `Application packaged and staged for ${data.opportunity.company}!`,
        {
          description: "Outreach email and tailored resume pre-generated in Workbench.",
          action: createdAppId
            ? {
                label: "View Workbench",
                onClick: () => {
                  window.location.href = `/applications/${createdAppId}`
                },
              }
            : undefined,
        }
      )
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to package application")
    } finally {
      setIsPackaging(false)
    }
  }

  // Parse structured description sections (About, Responsibilities, Qualifications)
  const parsedDescription = useMemo(() => {
    if (!data?.opportunity.description) {
      return {
        intro: "We are seeking a talented professional to join our team and build high-impact solutions.",
        responsibilities: [
          "Define product vision, strategy, and roadmap aligned with business goals.",
          "Work closely with cross-functional engineering, design, and product teams to deliver features.",
          "Conduct user research, market analysis, and evaluate customer feedback.",
          "Measure product performance and iterate rapidly based on data insights.",
          "Communicate with stakeholders and team members across the organization.",
        ],
        qualifications: [
          "3+ years of experience in product, engineering, or related software development.",
          "Strong analytical, problem-solving, and communication skills.",
          "Experience with modern software stacks and agile development methodologies.",
          "Proven track record of collaborating across multidisciplinary teams.",
          "Bachelor's degree or equivalent practical industry experience.",
        ],
      }
    }

    const text = data.opportunity.description
    const respMatch = text.match(/(?:responsibilities|duties|what you['’]ll do|key responsibilities)[:\n]([\s\S]*?)(?=(?:qualifications|requirements|what you['’]ll need|who you are|benefits|$))/i)
    const qualMatch = text.match(/(?:qualifications|requirements|what you['’]ll need|who you are)[:\n]([\s\S]*?)(?=(?:benefits|perks|about us|$))/i)

    const parseBullets = (rawSection?: string) => {
      if (!rawSection) return []
      return rawSection
        .split(/\n|\r\n|•|\*/)
        .map((s) => s.trim().replace(/^[-•*]\s*/, ""))
        .filter((s) => s.length > 15 && s.length < 300)
        .slice(0, 5)
    }

    const responsibilities = parseBullets(respMatch?.[1])
    const qualifications = parseBullets(qualMatch?.[1])

    let intro = text
    if (respMatch?.index !== undefined && respMatch.index > 20) {
      intro = text.slice(0, respMatch.index).trim()
    } else if (qualMatch?.index !== undefined && qualMatch.index > 20) {
      intro = text.slice(0, qualMatch.index).trim()
    }
    if (intro.length > 500) intro = intro.slice(0, 480) + "..."

    return {
      intro: intro || "Join our team to design, build, and scale innovative software products that serve users worldwide.",
      responsibilities: responsibilities.length > 0 ? responsibilities : [
        "Define product vision, strategy, and roadmap aligned with business goals.",
        "Work closely with cross-functional teams to deliver high-impact features.",
        "Conduct user research and iterate based on actionable product metrics.",
        "Communicate clearly with technical and non-technical stakeholders.",
      ],
      qualifications: qualifications.length > 0 ? qualifications : [
        "3+ years of experience in product management or software engineering.",
        "Strong analytical, problem-solving, and team communication skills.",
        "Experience collaborating with cross-functional agile teams.",
        "Bachelor's degree in Computer Science, Engineering, or equivalent experience.",
      ],
    }
  }, [data?.opportunity.description])

  const workMode = useMemo(() => {
    if (!data?.opportunity) return { label: "On-site" }
    if (data.opportunity.isRemote) return { label: "Remote" }
    const locLower = (data.opportunity.location || "").toLowerCase()
    if (locLower.includes("hybrid")) return { label: "Hybrid" }
    return { label: "On-site" }
  }, [data?.opportunity])

  const experienceDisplay = useMemo(() => {
    if (!data?.opportunity) return "3-5 years"
    const exp = data.opportunity.rationaleParsed?.experienceFit || ""
    const match = exp.match(/(\d+(?:\s*[-–]\s*\d+|\+)?\s*(?:years|yrs))/i)
    if (match) return match[1]
    if (exp.length > 0 && exp.length <= 25) return exp
    return data.opportunity.employmentType ? "3-5 years" : "Mid / Senior Level"
  }, [data?.opportunity])

  const salaryDisplay = useMemo(() => {
    if (!data?.opportunity) return ""
    return data.opportunity.cleanSalary || data.opportunity.salary || "Competitive Salary"
  }, [data?.opportunity])

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse py-4">
        <div className="h-5 w-44 bg-muted/40 rounded-sm" />
        <div className="h-44 w-full bg-card border border-border rounded-[6px]" />
        <div className="h-10 w-full bg-muted/20 rounded-sm" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            <div className="h-96 bg-card border border-border rounded-[6px]" />
          </div>
          <div className="lg:col-span-4 space-y-4">
            <div className="h-64 bg-card border border-border rounded-[6px]" />
            <div className="h-72 bg-card border border-border rounded-[6px]" />
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !data) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
          <AlertCircle className="size-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Opportunity Not Found</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {error || "The opportunity you're looking for may have expired or been removed from the discovery feed."}
        </p>
        <Link
          href="/discovery"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-[4px] text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Opportunities</span>
        </Link>
      </div>
    )
  }

  const { opportunity, similarOpportunities } = data

  const tabs: { id: DetailTab; label: string; mobileLabel: string }[] = [
    { id: "overview", label: "Overview", mobileLabel: "Overview" },
    { id: "match", label: "Match Analysis", mobileLabel: "Match" },
    { id: "company", label: "Company", mobileLabel: "Company" },
    { id: "similar", label: "Similar Jobs", mobileLabel: "Similar" },
  ]

  return (
    <div className="space-y-5 sm:space-y-6 pb-20 sm:pb-8">
      {/* 1. Hero Header */}
      <OpportunityHeroHeader
        opportunity={opportunity}
        isSaved={isSaved}
        isSaving={isSaving}
        isPackaging={isPackaging}
        isStaged={isStaged}
        stagedApplicationId={stagedAppId}
        onSaveToggle={handleSaveToggle}
        onPackage={handlePackage}
      />

      {/* 2. Tabs Row (Matching Desktop & Mobile mockups) */}
      <div className="border-b border-border">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap cursor-pointer",
                activeTab === tab.id
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <span className="sm:hidden">{tab.mobileLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Tab Contents */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Left Column: About the Role (~65% / 8 cols) */}
          <div className="lg:col-span-8 bg-transparent sm:bg-card border-0 sm:border border-border rounded-none sm:rounded-[6px] p-0 sm:p-6 shadow-none space-y-5">
            <div className="space-y-2">
              <h2 className="text-base font-bold text-foreground tracking-tight">About the role</h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {parsedDescription.intro}
              </p>
            </div>

            {/* Mobile 5-item Key Specs List (Direct 1:1 match with media_1790363520553.png) */}
            <div className="lg:hidden space-y-3 pt-1 pb-1 text-xs sm:text-sm text-foreground">
              {/* 1. Job Type */}
              <div className="flex items-center gap-3">
                <Calendar className="size-4 text-muted-foreground shrink-0" />
                <span>{opportunity.employmentType || "Full-time"}</span>
              </div>

              {/* 2. Work Mode */}
              <div className="flex items-center gap-3">
                {opportunity.isRemote ? (
                  <Wifi className="size-4 text-muted-foreground shrink-0" />
                ) : (
                  <MapPin className="size-4 text-muted-foreground shrink-0" />
                )}
                <span>{workMode.label}</span>
              </div>

              {/* 3. Location */}
              <div className="flex items-center gap-3">
                <MapPin className="size-4 text-muted-foreground shrink-0" />
                <span>{opportunity.location || "Remote"}</span>
              </div>

              {/* 4. Salary */}
              {salaryDisplay && (
                <div className="flex items-center gap-3">
                  <Banknote className="size-4 text-muted-foreground shrink-0" />
                  <span className="tabular-nums font-medium">{salaryDisplay}</span>
                </div>
              )}

              {/* 5. Experience */}
              <div className="flex items-center gap-3">
                <Calendar className="size-4 text-muted-foreground shrink-0" />
                <span>{experienceDisplay}</span>
              </div>
            </div>

            {/* Mobile In-flow Primary Action Button (Matching media_1790363520553.png) */}
            <div className="lg:hidden pt-2">
              {isStaged ? (
                <Link
                  href={stagedAppId ? `/applications/${stagedAppId}` : "/applications?status=Staged"}
                  className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-[6px] text-sm font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-colors shadow-xs"
                >
                  <Check className="size-4 stroke-[2.5]" />
                  <span>Staged in Workbench</span>
                  <ArrowRight className="size-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handlePackage}
                  disabled={isPackaging}
                  className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-[6px] text-sm font-semibold bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
                >
                  {isPackaging ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" />
                      <span>Packaging Application...</span>
                    </>
                  ) : (
                    <>
                      <span>Package & Stage</span>
                      <ArrowRight className="size-4 stroke-[2]" />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Key Responsibilities */}
            <div className="space-y-2.5 pt-2 sm:pt-1">
              <h3 className="text-xs sm:text-sm font-bold text-foreground">Key Responsibilities</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                {parsedDescription.responsibilities.map((resp, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="size-1.5 rounded-full bg-primary/70 shrink-0 mt-2" />
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Qualifications */}
            <div className="space-y-2.5 pt-1">
              <h3 className="text-xs sm:text-sm font-bold text-foreground">Qualifications</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                {parsedDescription.qualifications.map((qual, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="size-1.5 rounded-full bg-primary/70 shrink-0 mt-2" />
                    <span>{qual}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Note Alert Callout Box (Matching media_1790344251697.png) */}
            <div className="flex items-start gap-3 p-3.5 rounded-sm bg-sky-50 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/40 text-xs">
              <Info className="size-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold text-sky-900 dark:text-sky-300">Note: </span>
                <span className="text-sky-800/90 dark:text-sky-400/90 leading-relaxed">
                  This is a high-match opportunity ({opportunity.fitScore}% match) based on your verified skills and background. Make sure to tailor your resume and highlight relevant experience for the best chance of success.
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Job Details & Match Score Stacked Vertically (~35% / 4 cols) */}
          <div className="hidden lg:block lg:col-span-4 space-y-5">
            <OpportunityJobDetailsCard opportunity={opportunity} />
            <OpportunityMatchScoreCard opportunity={opportunity} />
          </div>
        </div>
      )}

      {/* Match Analysis Tab */}
      {activeTab === "match" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 bg-transparent sm:bg-card border-0 sm:border border-border rounded-none sm:rounded-[6px] p-0 sm:p-6 shadow-none space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground">AI Match Analysis</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Detailed 100-point algorithmic evaluation comparing your background to this opportunity.
              </p>
            </div>

            {/* 4 Pillars Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-sm bg-muted/40 border border-border/70 space-y-1">
                <div className="text-[11px] text-muted-foreground font-medium">Skills Match</div>
                <div className="text-base font-bold text-foreground tabular-nums">
                  {opportunity.scores.skillsMatch}%
                </div>
              </div>
              <div className="p-3 rounded-sm bg-muted/40 border border-border/70 space-y-1">
                <div className="text-[11px] text-muted-foreground font-medium">Experience Fit</div>
                <div className="text-base font-bold text-foreground tabular-nums">
                  {opportunity.scores.experienceMatch}%
                </div>
              </div>
              <div className="p-3 rounded-sm bg-muted/40 border border-border/70 space-y-1">
                <div className="text-[11px] text-muted-foreground font-medium">Role Alignment</div>
                <div className="text-base font-bold text-foreground tabular-nums">
                  {opportunity.scores.roleFit}%
                </div>
              </div>
              <div className="p-3 rounded-sm bg-muted/40 border border-border/70 space-y-1">
                <div className="text-[11px] text-muted-foreground font-medium">Company Fit</div>
                <div className="text-base font-bold text-foreground tabular-nums">
                  {opportunity.scores.companyFit}%
                </div>
              </div>
            </div>

            {/* Key Match Insights */}
            {opportunity.rationaleParsed?.allPoints && opportunity.rationaleParsed.allPoints.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs sm:text-sm font-bold text-foreground">Verified Alignment Signals</h3>
                <div className="space-y-2">
                  {opportunity.rationaleParsed.allPoints.map((point, idx) => (
                    <div key={idx} className="p-3 rounded-sm bg-muted/30 border border-border/60 text-xs sm:text-sm space-y-0.5">
                      <div className="font-semibold text-foreground">{point.title}</div>
                      <div className="text-muted-foreground leading-relaxed">{point.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-5">
            <OpportunityMatchScoreCard opportunity={opportunity} />
          </div>
        </div>
      )}

      {/* Company Tab */}
      {activeTab === "company" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 bg-transparent sm:bg-card border-0 sm:border border-border rounded-none sm:rounded-[6px] p-0 sm:p-6 shadow-none space-y-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">{opportunity.company}</h2>
                <CheckCircle2 className="size-4 fill-blue-500 text-white dark:text-zinc-950 shrink-0" />
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {opportunity.companyEnrichment?.domain || "Technology"} • {opportunity.location}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-sm bg-muted/40 border border-border/70 space-y-0.5">
                <div className="text-[11px] text-muted-foreground">Headquarters</div>
                <div className="text-xs sm:text-sm font-semibold text-foreground">{opportunity.location}</div>
              </div>
              <div className="p-3 rounded-sm bg-muted/40 border border-border/70 space-y-0.5">
                <div className="text-[11px] text-muted-foreground">Work Style</div>
                <div className="text-xs sm:text-sm font-semibold text-foreground">
                  {opportunity.isRemote ? "Remote-First" : "Hybrid / On-site"}
                </div>
              </div>
              <div className="p-3 rounded-sm bg-muted/40 border border-border/70 space-y-0.5">
                <div className="text-[11px] text-muted-foreground">Verified Board</div>
                <div className="text-xs sm:text-sm font-semibold text-foreground">
                  {opportunity.sourceBoard}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h3 className="text-xs sm:text-sm font-bold text-foreground">Company Overview</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {opportunity.companyEnrichment?.description ||
                  `${opportunity.company} is an industry-leading organization building transformative digital products. They actively hire high-impact engineering and product professionals.`}
              </p>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-5">
            <OpportunityJobDetailsCard opportunity={opportunity} />
          </div>
        </div>
      )}

      {/* Similar Jobs Tab */}
      {activeTab === "similar" && (
        <div className="space-y-4">
          <OpportunitySimilarStrip opportunities={similarOpportunities} />
        </div>
      )}

      {/* 4. Bottom Section: Similar Opportunities (Always rendered on Desktop Overview) */}
      {activeTab === "overview" && (
        <div className="hidden sm:block">
          <OpportunitySimilarStrip opportunities={similarOpportunities} />
        </div>
      )}
    </div>
  )
}
