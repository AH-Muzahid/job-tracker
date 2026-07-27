"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Bot, Plus, Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

interface CommandZoneProps {
  activePipeline: number
  totalThisWeek?: number
  onManualFormOpen?: () => void
}

type TabMode = "ai" | "manual"

export default function CommandZone({ activePipeline, totalThisWeek = 0 }: CommandZoneProps) {
  const { user } = useUser()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabMode>("ai")

  // AI Scan state
  const [jdText, setJdText] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)

  // Manual form state
  const [manualCompany, setManualCompany] = useState("")
  const [manualTitle, setManualTitle] = useState("")
  const [manualSource, setManualSource] = useState("LinkedIn")
  const [manualLoading, setManualLoading] = useState(false)

  // AI analysis result modal state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [savingAction, setSavingAction] = useState(false)

  const greeting = getGreeting()
  const firstName = user?.firstName || "there"

  // AI Scan handler
  const handleAiScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!jdText.trim()) {
      toast.error("Please paste a job description first")
      return
    }

    setAiLoading(true)
    setLoadingStep(0)
    setAnalysisResult(null)

    const steps = [
      "Extracting role snapshot & tech stack...",
      "Matching with your profile skills...",
      "Evaluating strengths & gaps...",
      "Compiling application strategy...",
    ]

    let currentStep = 0
    const stepInterval = setInterval(() => {
      if (currentStep < steps.length - 1) {
        currentStep++
        setLoadingStep(currentStep)
      }
    }, 1500)

    try {
      const response = await fetch("/api/ai/scan-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText }),
      })

      clearInterval(stepInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to scan JD")
      }

      const data = await response.json()
      setAnalysisResult(data)
      toast.success("AI Fit Analysis Complete!")
    } catch (error: unknown) {
      clearInterval(stepInterval)
      const errMsg = error instanceof Error ? error.message : "Something went wrong"
      toast.error(errMsg)
    } finally {
      setAiLoading(false)
    }
  }

  // Save from AI analysis
  const handleSaveFromAI = async (targetStatus: string) => {
    if (!analysisResult) return
    setSavingAction(true)
    const toastId = toast.loading(`Saving job as ${targetStatus}...`)

    try {
      const appRes = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: analysisResult.roleSnapshot?.company || "Unknown Company",
          jobTitle: analysisResult.roleSnapshot?.role || "Target Role",
          source: "LinkedIn",
          status: targetStatus,
          applicationDate: new Date().toISOString(),
          notes: jdText,
        }),
      })

      if (!appRes.ok) {
        const errorData = await appRes.json()
        throw new Error(errorData.error || "Failed to save")
      }

      const application = await appRes.json()

      // Save analysis
      await fetch(`/api/applications/${application.id}/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: analysisResult, rawJd: jdText }),
      })

      toast.success("Application saved!", { id: toastId })
      resetAI()
      router.push(`/applications/${application.id}`)
      router.refresh()
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to save"
      toast.error(errMsg, { id: toastId })
    } finally {
      setSavingAction(false)
    }
  }

  const resetAI = () => {
    setAnalysisResult(null)
    setJdText("")
  }

  // Manual form handler
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCompany.trim() || !manualTitle.trim()) {
      toast.error("Company and Job Title are required")
      return
    }

    setManualLoading(true)
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: manualCompany.trim(),
          jobTitle: manualTitle.trim(),
          source: manualSource,
          status: "Saved",
          applicationDate: new Date().toISOString(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create")
      }

      const app = await res.json()
      toast.success("Application added!")
      setManualCompany("")
      setManualTitle("")
      router.push(`/applications/${app.id}`)
      router.refresh()
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to create"
      toast.error(errMsg)
    } finally {
      setManualLoading(false)
    }
  }

  // Loading state for AI
  if (aiLoading) {
    const steps = [
      "Extracting role snapshot & tech stack...",
      "Matching with your profile skills...",
      "Evaluating strengths & gaps...",
      "Compiling application strategy...",
    ]

    return (
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 animate-fade-in-up">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative flex items-center justify-center mb-6">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <Bot className="absolute h-5 w-5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Analyzing Job Description</h3>
          <p className="text-xs text-muted-foreground text-center mb-6 max-w-[280px]">
            Reading the job details and evaluating your compatibility...
          </p>
          <div className="w-full max-w-[300px] h-1.5 rounded-full bg-muted overflow-hidden mb-3">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${((loadingStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <p className="text-[11px] font-medium text-primary">{steps[loadingStep]}</p>
        </div>
      </div>
    )
  }

  // Analysis result view
  if (analysisResult) {
    const { roleSnapshot, matchScore, verdict, confidence, whyThisScore, missingGaps, redFlags, finalRecommendation } = analysisResult

    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in-up">
        {/* Result header */}
        <div className="p-4 sm:p-5 border-b border-border bg-muted/30">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary mb-1">
                <Sparkles className="h-2.5 w-2.5" /> AI Analysis Complete
              </span>
              <h3 className="text-sm font-bold text-foreground truncate">{roleSnapshot?.role || "Target Role"}</h3>
              <p className="text-xs text-muted-foreground truncate">{roleSnapshot?.company || "Unknown Company"}</p>
            </div>
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[3px] text-xs font-bold bg-card"
              style={{ borderColor: `hsl(var(${matchScore >= 80 ? "--success" : matchScore >= 60 ? "--warning" : "--destructive"}))`, color: `hsl(var(${matchScore >= 80 ? "--success" : matchScore >= 60 ? "--warning" : "--destructive"}))` }}
            >
              {matchScore}%
            </div>
          </div>
        </div>

        {/* Result body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[300px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Verdict */}
          <div className="p-3 rounded-lg border border-border bg-muted/20 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Verdict: {verdict}</span>
            <span className="text-[10px] text-muted-foreground">Confidence: {confidence}</span>
          </div>

          {/* Red Flags */}
          {redFlags && (
            <div className="p-3 rounded-lg border border-border bg-muted/20">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Cautions</h4>
              <p className="text-[11px] text-foreground/80 leading-relaxed">{redFlags}</p>
            </div>
          )}

          {/* Why this score */}
          {whyThisScore && whyThisScore.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Why this score</h4>
              <ul className="space-y-1">
                {whyThisScore.map((reason: string, i: number) => (
                  <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5 leading-relaxed">
                    <span className="text-primary font-bold select-none mt-px">•</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing gaps */}
          {missingGaps && (
            <div className="space-y-2 pt-1 border-t border-border">
              {missingGaps.missingKeywords?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Missing Keywords</h4>
                  <div className="flex flex-wrap gap-1">
                    {missingGaps.missingKeywords.map((kw: string, i: number) => (
                      <span key={i} className="text-[9px] bg-muted text-muted-foreground border border-border px-1.5 py-0.5 rounded font-medium">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {missingGaps.missingTools?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Missing Tools</h4>
                  <div className="flex flex-wrap gap-1">
                    {missingGaps.missingTools.map((t: string, i: number) => (
                      <span key={i} className="text-[9px] bg-muted text-muted-foreground border border-border px-1.5 py-0.5 rounded font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recommendation */}
          <div className="pt-2 border-t border-border">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Recommendation</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{finalRecommendation}</p>
          </div>
        </div>

        {/* Action footer */}
        <div className="p-4 border-t border-border flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handleSaveFromAI("Saved")}
              disabled={savingAction}
              size="sm"
              className="text-xs font-semibold cursor-pointer"
            >
              Save Job
            </Button>
            <Button
              onClick={() => handleSaveFromAI("Applied")}
              disabled={savingAction}
              variant="outline"
              size="sm"
              className="text-xs font-semibold cursor-pointer"
            >
              Mark Applied
            </Button>
          </div>
          <Button
            onClick={resetAI}
            disabled={savingAction}
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Discard & Scan Another
          </Button>
        </div>
      </div>
    )
  }

  // Default: Command Zone
  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6 animate-fade-in-up">
      <div className="flex flex-col lg:flex-row gap-5 lg:gap-8">
        {/* Left: greeting + context */}
        <div className="lg:w-2/5 space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {greeting}, {firstName}!
          </h1>
          <p className="text-sm text-muted-foreground">
            You have <span className="font-semibold text-foreground">{activePipeline}</span> active applications in your pipeline
          </p>
          {totalThisWeek > 0 && (
            <p className="text-xs text-muted-foreground">
              +{totalThisWeek} added this week
            </p>
          )}
        </div>

        {/* Right: dual mode action area */}
        <div className="flex-1 min-w-0">
          {/* Tab switcher */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted w-fit mb-4">
            <button
              onClick={() => setActiveTab("ai")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === "ai"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              AI Scan
            </button>
            <button
              onClick={() => setActiveTab("manual")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === "manual"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              Manual Add
            </button>
          </div>

          {/* AI Scan tab */}
          {activeTab === "ai" && (
            <form onSubmit={handleAiScan} className="space-y-3">
              <Textarea
                placeholder="Paste a job description here to analyze fit, match skills, and get AI recommendations..."
                className="min-h-[100px] max-h-[160px] text-xs leading-relaxed resize-none bg-background border-input placeholder:text-muted-foreground/50"
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
              />
              <Button
                type="submit"
                size="sm"
                className="text-xs font-semibold cursor-pointer"
                disabled={!jdText.trim()}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Analyze & Track
              </Button>
            </form>
          )}

          {/* Manual add tab */}
          {activeTab === "manual" && (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  placeholder="Company name"
                  className="h-9 text-xs bg-background border-input"
                  value={manualCompany}
                  onChange={(e) => setManualCompany(e.target.value)}
                  disabled={manualLoading}
                />
                <Input
                  placeholder="Job title"
                  className="h-9 text-xs bg-background border-input"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  disabled={manualLoading}
                />
                <Select value={manualSource} onValueChange={setManualSource} disabled={manualLoading}>
                  <SelectTrigger className="h-9 text-xs bg-background border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["LinkedIn", "Bdjobs", "Indeed", "Wellfound", "Facebook", "Referral", "Other"].map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                size="sm"
                className="text-xs font-semibold cursor-pointer"
                disabled={manualLoading || !manualCompany.trim() || !manualTitle.trim()}
              >
                {manualLoading ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Adding...</>
                ) : (
                  <><Plus className="h-3.5 w-3.5" /> Add to Pipeline</>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}
