"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Zap,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Layers,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  RotateCcw,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { reportClientError } from "@/lib/ops/client-logger"

export const EVALUATOR_STORAGE_KEY = "careertrack_jd_evaluator_cache_v1"

export interface EvaluatorPersistedState {
  jdInput: string
  companyName: string
  jobTitle: string
  jobUrl: string
  source: string
  dossier: OpportunityDossier | null
  updatedAt: number
}

export function loadEvaluatorCache(): EvaluatorPersistedState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(EVALUATOR_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as EvaluatorPersistedState
    // Expire cache if older than 48 hours
    if (Date.now() - parsed.updatedAt > 48 * 60 * 60 * 1000) {
      localStorage.removeItem(EVALUATOR_STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveEvaluatorCache(state: {
  jdInput: string
  companyName: string
  jobTitle: string
  jobUrl: string
  source: string
  dossier: OpportunityDossier | null
}) {
  if (typeof window === "undefined") return
  try {
    if (
      !state.dossier &&
      !state.jdInput.trim() &&
      !state.jobUrl.trim() &&
      !state.companyName.trim() &&
      !state.jobTitle.trim()
    ) {
      localStorage.removeItem(EVALUATOR_STORAGE_KEY)
      return
    }
    const payload: EvaluatorPersistedState = {
      ...state,
      updatedAt: Date.now(),
    }
    localStorage.setItem(EVALUATOR_STORAGE_KEY, JSON.stringify(payload))
  } catch (e) {
    console.warn("Failed to persist evaluator cache:", e)
  }
}

export function clearEvaluatorCache() {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(EVALUATOR_STORAGE_KEY)
  } catch {}
}

export interface OpportunityDossier {
  success: boolean
  sourceUrl: string | null
  scrapedTitle: string | null
  roleSnapshot: {
    company: string
    role: string
    experienceAsked?: string
    keyStack: string[]
    workSetup?: string | null
  }
  matchScore: number
  confidence: "High" | "Medium" | "Low"
  verdict: string
  whyThisScore: string[]
  missingGaps: {
    missingKeywords: string[]
    missingProof?: string[]
    missingTools?: string[]
    stretchAreas?: string[]
    fixableGaps?: string[]
  }
  extractedSkills: string[]
  redFlags: string | null
  scamEvaluation: {
    riskScore: number
    level: "clean" | "suspicious" | "flagged"
    reasons: string[]
    isFlagged: boolean
  }
  companyIntel?: {
    tier?: string
    sizeSnippet?: string
    industry?: string
    reputationNotes?: string
  } | null
  finalRecommendation: string
  resumeAdvice?: {
    emphasize?: string[]
    addIfTruthful?: string[]
    foregroundProjects?: string[]
    needsCustomVersion?: boolean
    linkedInTweak?: boolean
  }
  applyStrategy?: {
    bestPath?: string
    outreachNeeded?: boolean
    contactTarget?: string | null
    timing?: string | null
    angle?: string | null
  }
  applicationId?: string | null
}

interface UniversalJDEvaluatorProps {
  initialText?: string
  initialUrl?: string
  onFinished?: () => void
  embedded?: boolean
  onEvaluatingChange?: (evaluating: boolean) => void
}

export function UniversalJDEvaluator({
  initialText = "",
  initialUrl = "",
  onFinished,
  embedded = false,
  onEvaluatingChange,
}: UniversalJDEvaluatorProps) {
  const router = useRouter()
  const [jdInput, setJdInput] = useState(initialText || initialUrl || "")
  const [companyName, setCompanyName] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [jobUrl, setJobUrl] = useState(initialUrl || "")
  const [source, setSource] = useState("LinkedIn")
  const [showOptions, setShowOptions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [dossier, setDossier] = useState<OpportunityDossier | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [isRestored, setIsRestored] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Notify parent modal of active evaluation status
  useEffect(() => {
    onEvaluatingChange?.(loading)
  }, [loading, onEvaluatingChange])

  // Hydrate or restore state on mount / prop change
  useEffect(() => {
    if (initialText || initialUrl) {
      setJdInput(initialText || initialUrl || "")
      setJobUrl(initialUrl || "")
      setDossier(null)
      setIsRestored(false)
      return
    }

    const cached = loadEvaluatorCache()
    if (cached) {
      if (cached.jdInput) setJdInput(cached.jdInput)
      if (cached.companyName) setCompanyName(cached.companyName)
      if (cached.jobTitle) setJobTitle(cached.jobTitle)
      if (cached.jobUrl) setJobUrl(cached.jobUrl)
      if (cached.source) setSource(cached.source)
      if (cached.dossier) {
        setDossier(cached.dossier)
        setIsRestored(true)
      } else if (cached.jdInput || cached.jobUrl) {
        setIsRestored(true)
      }
    }
  }, [initialText, initialUrl])

  // Automatically persist draft changes and generated dossiers
  useEffect(() => {
    if (loading) return
    saveEvaluatorCache({
      jdInput,
      companyName,
      jobTitle,
      jobUrl,
      source,
      dossier,
    })
  }, [jdInput, companyName, jobTitle, jobUrl, source, dossier, loading])

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setJdInput(text)
        toast.success("Pasted from clipboard")
      } else {
        toast.error("Clipboard is empty")
      }
    } catch {
      toast.error("Clipboard read permission denied. Please paste manually.")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedInput = jdInput.trim()
    if (!trimmedInput && !jobUrl.trim()) {
      toast.error("Please paste a job description or URL first")
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller
    setLoading(true)
    setLoadingStep(0)
    setDossier(null)
    setIsRestored(false)

    const steps = [
      "Extracting role snapshot & tech requirements...",
      "Scanning for scam patterns & phishing indicators...",
      "Matching with profile skills & Career Knowledge Graph...",
      "Compiling Opportunity Dossier & strategy...",
    ]

    let currentStep = 0
    const stepInterval = setInterval(() => {
      if (currentStep < steps.length - 1) {
        currentStep++
        setLoadingStep(currentStep)
      }
    }, 1400)

    try {
      const isUrl = /^https?:\/\/[^\s]+$/i.test(trimmedInput)
      const embeddedUrlMatch = trimmedInput.match(/https?:\/\/[^\s"'<>]+/i)
      const resolvedUrl = isUrl ? trimmedInput : (jobUrl.trim() || (embeddedUrlMatch ? embeddedUrlMatch[0] : undefined))

      const payload = {
        url: resolvedUrl,
        rawText: isUrl ? undefined : trimmedInput,
        companyName: companyName.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        source: source || (trimmedInput.toLowerCase().includes("linkedin") ? "LinkedIn" : "Direct"),
      }

      const res = await fetch("/api/discovery/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearInterval(stepInterval)

      if (!res.ok) {
        let errorMsg = `Evaluation failed (HTTP ${res.status})`
        try {
          const contentType = res.headers.get("content-type") || ""
          if (contentType.includes("application/json")) {
            const errorData = await res.json()
            errorMsg = errorData.error || errorData.message || errorMsg
          } else {
            const rawText = await res.text()
            if (rawText && rawText.length < 300 && !rawText.includes("<html") && !rawText.includes("<!DOCTYPE")) {
              errorMsg = rawText.trim()
            } else if (res.status === 504 || res.status === 408) {
              errorMsg = "Evaluation timed out on the server. Please copy and paste the job description text directly into the box."
            } else if (res.status === 502 || res.status === 503) {
              errorMsg = "Evaluation service is temporarily unavailable. Please try again or paste the JD text directly."
            } else if (res.status === 500) {
              errorMsg = "Server error while evaluating. Please copy and paste the job description text directly into the box."
            }
          }
        } catch {
          if (res.status === 504) {
            errorMsg = "Evaluation timed out. Please copy and paste the job description text directly."
          }
        }

        reportClientError("discovery:evaluate", new Error(errorMsg), {
          status: res.status,
          targetUrl: resolvedUrl,
          hasDirectText: Boolean(trimmedInput && !isUrl),
        })

        throw new Error(errorMsg)
      }

      let data: OpportunityDossier
      try {
        data = await res.json()
      } catch (parseErr) {
        reportClientError("discovery:evaluate:parse", parseErr, {
          targetUrl: resolvedUrl,
        })
        throw new Error("Received an unexpected response from evaluation service. Please try pasting the JD text directly.")
      }

      setDossier(data)
      setIsRestored(false)
      if (data.sourceUrl && !jobUrl) setJobUrl(data.sourceUrl)
      if (data.roleSnapshot.company && !companyName) setCompanyName(data.roleSnapshot.company)
      if (data.roleSnapshot.role && !jobTitle) setJobTitle(data.roleSnapshot.role)

      if (data.scamEvaluation?.isFlagged) {
        toast.warning("Caution: Potential scam or risky posting detected!")
      } else {
        toast.success("Opportunity Dossier generated!")
      }
    } catch (err: unknown) {
      clearInterval(stepInterval)
      if (err instanceof DOMException && err.name === "AbortError") {
        toast.info("Evaluation cancelled")
        return
      }
      console.error("Opportunity evaluation error:", err)
      const errMsg = err instanceof Error ? err.message : "Something went wrong during evaluation"

      reportClientError("discovery:evaluate", err, {
        inputPreview: jdInput.slice(0, 100),
        targetUrl: jobUrl,
      })

      toast.error(errMsg)
    } finally {
      setLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleStageOrSave = async (targetStatus: "Staged" | "Saved" | "Applied") => {
    if (!dossier) return
    setActionLoading(true)
    const toastId = toast.loading(targetStatus === "Staged" ? "Staging application for review..." : targetStatus === "Saved" ? "Saving application..." : "Marking as applied...")

    try {
      // 1. Create Application in PostgreSQL
      const appRes = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim() || dossier.roleSnapshot.company || "Target Company",
          jobTitle: jobTitle.trim() || dossier.roleSnapshot.role || "Target Role",
          jobUrl: jobUrl.trim() || dossier.sourceUrl || null,
          source,
          status: targetStatus,
          applicationDate: new Date().toISOString(),
          notes: jdInput.trim() || null,
        }),
      })

      if (!appRes.ok) {
        let errorMsg = "Failed to save application"
        try {
          const contentType = appRes.headers.get("content-type") || ""
          if (contentType.includes("application/json")) {
            const errorData = await appRes.json()
            errorMsg = errorData.error || errorMsg
          } else {
            const raw = await appRes.text()
            if (raw && raw.length < 200) errorMsg = raw.trim()
          }
        } catch {}

        reportClientError("discovery:stage-application", new Error(errorMsg), {
          targetStatus,
          company: companyName || dossier.roleSnapshot.company,
        })

        throw new Error(errorMsg)
      }

      let application: { id: string }
      try {
        application = await appRes.json()
      } catch (parseErr) {
        reportClientError("discovery:stage-application:parse", parseErr)
        throw new Error("Application record could not be confirmed. Please check your applications board.")
      }

      // 2. Persist Pre-computed Analysis to ApplicationAnalysis
      try {
        await fetch(`/api/applications/${application.id}/analysis`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            analysis: {
              roleSnapshot: dossier.roleSnapshot,
              matchScore: dossier.matchScore,
              confidence: dossier.confidence,
              verdict: dossier.verdict,
              whyThisScore: dossier.whyThisScore,
              missingGaps: dossier.missingGaps,
              resumeAdvice: dossier.resumeAdvice,
              applyStrategy: dossier.applyStrategy,
              redFlags: dossier.redFlags,
              finalRecommendation: dossier.finalRecommendation,
            },
            rawJd: jdInput.trim(),
          }),
        })
      } catch (analysisErr) {
        console.warn("Application created, but analysis linking threw an error:", analysisErr)
      }

      toast.success(
        targetStatus === "Staged"
          ? "Application staged to review pipeline!"
          : targetStatus === "Saved"
          ? "Application saved to tracker!"
          : "Application logged as applied!",
        { id: toastId }
      )

      handleDiscard()
      onFinished?.()
      router.push(`/applications/${application.id}`)
      router.refresh()
    } catch (err: unknown) {
      console.error(err)
      const errMsg = err instanceof Error ? err.message : "Failed to create application"
      reportClientError("discovery:stage-application", err, { targetStatus })
      toast.error(errMsg, { id: toastId })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDiscard = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setDossier(null)
    setJdInput("")
    setCompanyName("")
    setJobTitle("")
    setJobUrl("")
    setIsRestored(false)
    setLoading(false)
    clearEvaluatorCache()
  }

  // 1. Loading Animation State
  if (loading) {
    const steps = [
      "Extracting role snapshot & tech requirements...",
      "Scanning for scam patterns & phishing indicators...",
      "Matching with profile skills & Career Knowledge Graph...",
      "Compiling Opportunity Dossier & strategy...",
    ]

    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[360px] text-center border border-border bg-card rounded-md shadow-xs">
        <div className="relative flex items-center justify-center mb-6">
          <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <Zap className="absolute h-6 w-6 text-primary animate-pulse" />
        </div>

        <h3 className="text-sm font-semibold text-foreground tracking-tight mb-1">
          Evaluating Opportunity
        </h3>
        <p className="text-xs text-muted-foreground mb-6 max-w-xs">
          Scanning requirements, verifying security indicators, and cross-matching against your career knowledge graph...
        </p>

        <div className="w-full max-w-[280px] bg-muted rounded-full h-1.5 mb-3 overflow-hidden">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((loadingStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <p className="text-[11px] font-mono font-medium text-primary mb-4">
          {steps[loadingStep]}
        </p>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDiscard}
          className="text-xs h-7 px-3 border-border text-muted-foreground hover:text-foreground cursor-pointer rounded-sm"
        >
          Cancel Evaluation
        </Button>
      </div>
    )
  }

  // 2. Evaluated Dossier State
  if (dossier) {
    const {
      roleSnapshot,
      matchScore,
      verdict,
      confidence,
      whyThisScore,
      missingGaps,
      extractedSkills,
      redFlags,
      scamEvaluation,
      finalRecommendation,
      companyIntel,
    } = dossier

    const isHighRisk = scamEvaluation?.isFlagged || scamEvaluation?.riskScore >= 50
    const scoreColor =
      matchScore >= 80 ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5" :
      matchScore >= 60 ? "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5" :
      "text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/5"

    return (
      <Card className="border border-border bg-card shadow-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-98 duration-200">
        {isRestored && (
          <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border text-xs text-muted-foreground animate-in fade-in duration-150">
            <div className="flex items-center gap-1.5 font-medium">
              <RotateCcw className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Restored previously evaluated draft</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDiscard}
              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer font-medium"
            >
              Start New Scan
            </Button>
          </div>
        )}
        <CardHeader className="pb-3 border-b border-border/70 bg-muted/20">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {isHighRisk ? (
                  <Badge variant="destructive" className="text-[10px] gap-1 px-2 py-0.5 rounded-sm font-mono">
                    <ShieldAlert className="h-3 w-3" /> Suspicious / Scam Risk ({scamEvaluation.riskScore}/100)
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] gap-1 px-2 py-0.5 rounded-sm border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 font-mono">
                    <ShieldCheck className="h-3 w-3" /> Verified Safe Employer
                  </Badge>
                )}
                {roleSnapshot.workSetup && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                    {roleSnapshot.workSetup}
                  </Badge>
                )}
                {companyIntel?.tier && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-muted-foreground">
                    {companyIntel.tier}
                  </Badge>
                )}
              </div>

              <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight truncate">
                {roleSnapshot.role || "Target Role"}
              </h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{roleSnapshot.company || "Unknown Company"}</span>
                {dossier.sourceUrl && (
                  <a
                    href={dossier.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Score Ring */}
            <div className={`flex flex-col items-center justify-center h-14 w-14 shrink-0 rounded-xl border ${scoreColor}`}>
              <span className="text-lg font-bold tracking-tight">{matchScore}%</span>
              <span className="text-[10px] uppercase tracking-wider font-mono opacity-80">Fit</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto max-h-[440px]">
          {/* Verdict Banner */}
          <div className="p-3 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-medium">
              <span className="text-foreground font-semibold">Verdict:</span>
              <span className={matchScore >= 70 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                {verdict}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              Confidence: {confidence}
            </span>
          </div>

          {/* Scam Risk Alert Banner if any reasons flagged */}
          {scamEvaluation?.reasons && scamEvaluation.reasons.length > 0 && (
            <div className={`p-3 rounded-lg border flex gap-2.5 ${isHighRisk ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300" : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"}`}>
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold">Security Heuristics Alert</p>
                <ul className="list-disc list-inside space-y-0.5 opacity-90">
                  {scamEvaluation.reasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Red Flags / Cautions */}
          {redFlags && !isHighRisk && (
            <div className="p-3 rounded-lg border border-border/80 bg-muted/20 flex gap-2.5 text-xs text-muted-foreground">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Role Considerations</p>
                <p className="mt-0.5 leading-relaxed">{redFlags}</p>
              </div>
            </div>
          )}

          {/* Extracted Tech Stack */}
          {extractedSkills && extractedSkills.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" /> Required Tech Stack ({extractedSkills.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {extractedSkills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-0.5 text-xs font-mono bg-muted/60 text-foreground border border-border/80 rounded-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Why This Score */}
          {whyThisScore && whyThisScore.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                Match Insights & Knowledge Graph Traversal
              </h4>
              <ul className="space-y-1">
                {whyThisScore.map((insight, idx) => (
                  <li key={idx} className="text-xs text-foreground/90 flex items-start gap-2 leading-relaxed">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Gaps */}
          {missingGaps && missingGaps.missingKeywords && missingGaps.missingKeywords.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-border/60">
              <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                Missing Keywords & Tools
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {missingGaps.missingKeywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-0.5 text-[11px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-sm"
                  >
                    -{kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Recommendation */}
          {finalRecommendation && (
            <div className="pt-2 border-t border-border/60 space-y-1">
              <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                AI Next Action
              </h4>
              <p className="text-xs text-foreground/90 leading-relaxed font-normal">
                {finalRecommendation}
              </p>
            </div>
          )}
        </CardContent>

        {/* 1-Click Action Footer */}
        <div className="p-4 border-t border-border/80 bg-muted/20 flex flex-col gap-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              onClick={() => handleStageOrSave("Staged")}
              disabled={actionLoading}
              className="text-xs h-9 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Package & Stage Application</span>
            </Button>
            <Button
              onClick={() => handleStageOrSave("Applied")}
              disabled={actionLoading}
              variant="outline"
              className="text-xs h-9 font-medium border-border hover:bg-muted cursor-pointer"
            >
              <span>Mark as Applied</span>
            </Button>
          </div>
          <Button
            onClick={handleDiscard}
            disabled={actionLoading}
            variant="ghost"
            size="sm"
            className="text-xs h-8 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Discard & Evaluate Another Job
          </Button>
        </div>
      </Card>
    )
  }

  // 3. Default Input State
  return (
    <Card className={`border border-border bg-card shadow-sm overflow-hidden flex flex-col ${embedded ? "border-0 shadow-none bg-transparent" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
              Universal Opportunity Evaluator
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-primary border-primary/30">
                Autonomous
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Paste any job posting URL, raw JD, or informal LinkedIn/X/WhatsApp hiring post to get an instant match evaluation, tech stack extraction, and 1-click tailored application package.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex flex-col flex-1">
        <form onSubmit={handleSubmit} className="space-y-3.5 flex flex-col flex-1">
          {isRestored && (jdInput.trim() || jobUrl.trim()) && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 rounded-md border border-border text-xs text-muted-foreground animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 font-medium">
                <RotateCcw className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Restored draft inputs from your previous session</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDiscard}
                className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer font-medium"
              >
                Clear Draft
              </Button>
            </div>
          )}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="jd-input" className="text-xs font-semibold text-foreground">
                Job Posting URL, Description, or Feed Post
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePasteClipboard}
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer font-mono gap-1"
              >
                <Clipboard className="h-3 w-3" /> Paste
              </Button>
            </div>
            <Textarea
              id="jd-input"
              placeholder="Paste a LinkedIn feed post, hiring announcement, WhatsApp message, or job URL (e.g. 'We\'re Hiring: Full Stack Developer...', https://lnkd.in/...)"
              className="min-h-[130px] max-h-[220px] text-xs leading-relaxed bg-muted/20 border-border focus-visible:ring-1 rounded-lg resize-none placeholder:text-muted-foreground/60"
              value={jdInput}
              onChange={(e) => setJdInput(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowOptions(!showOptions)}
              className="text-xs h-7 text-primary hover:text-primary/90 hover:bg-primary/5 px-2 font-medium flex items-center gap-1 cursor-pointer"
            >
              {showOptions ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" /> Hide Manual Overrides
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" /> Manual Overrides & Source (Optional)
                </>
              )}
            </Button>
          </div>

          {showOptions && (
            <div className="grid gap-3 grid-cols-2 bg-muted/20 rounded-lg p-3 border border-border animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="space-y-1">
                <Label htmlFor="override-company" className="text-[11px] font-medium text-foreground">
                  Company Name (Override)
                </Label>
                <Input
                  id="override-company"
                  placeholder="e.g. Stripe"
                  className="h-8 text-xs bg-background"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="override-title" className="text-[11px] font-medium text-foreground">
                  Job Title (Override)
                </Label>
                <Input
                  id="override-title"
                  placeholder="e.g. Senior Frontend Engineer"
                  className="h-8 text-xs bg-background"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="col-span-2 space-y-1">
                <Label htmlFor="override-source" className="text-[11px] font-medium text-foreground">
                  Job Source
                </Label>
                <Select value={source} onValueChange={setSource} disabled={loading}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="LinkedIn" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {["LinkedIn", "Greenhouse", "Lever", "Indeed", "Wellfound", "Direct / Company Site", "Referral", "Other"].map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="pt-1 mt-auto">
            <Button
              type="submit"
              disabled={loading}
              className="w-full text-xs h-9 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Evaluate Opportunity</span>
              <ArrowRight className="h-3 w-3 opacity-70" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
