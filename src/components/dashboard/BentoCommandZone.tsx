"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Bot, Plus, Sparkles, Loader2, Upload, Clipboard, CheckCircle, AlertCircle, FileText, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

interface BentoCommandZoneProps {
  activePipeline: number
  totalThisWeek?: number
}

type Mode = "scan" | "upload" | "manual"

export default function BentoCommandZone({ activePipeline, totalThisWeek = 0 }: BentoCommandZoneProps) {
  const { user } = useUser()
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("scan")

  // Scan state
  const [jdText, setJdText] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)

  // Real-time quick detection heuristic
  const [detectedCompany, setDetectedCompany] = useState<string | null>(null)
  const [detectedRole, setDetectedRole] = useState<string | null>(null)

  // Upload state
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Manual state
  const [manualCompany, setManualCompany] = useState("")
  const [manualTitle, setManualTitle] = useState("")
  const [manualSource, setManualSource] = useState("LinkedIn")
  const [manualLoading, setManualLoading] = useState(false)

  // Result Modal State
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [savingAction, setSavingAction] = useState(false)

  const firstName = user?.firstName || "there"
  const greeting = getGreeting()

  // Real-time lightweight extraction heuristic
  useEffect(() => {
    if (!jdText.trim()) {
      setDetectedCompany(null)
      setDetectedRole(null)
      return
    }
    // Simple heuristic regex checks for immediate visual feedback
    const companyMatch = jdText.match(/(?:at|about|company:?)\s+([A-Z][A-Za-z0-9\s&]{2,20})/i)
    const roleMatch = jdText.match(/(?:looking for a|hiring a|role:?|title:?)\s+([A-Z][A-Za-z0-9\s-]{3,25})/i)
    if (companyMatch) setDetectedCompany(companyMatch[1].trim())
    if (roleMatch) setDetectedRole(roleMatch[1].trim())
  }, [jdText])

  // Paste from clipboard
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setJdText(text)
        setMode("scan")
        toast.success("Pasted text from clipboard!")
      } else {
        toast.error("Clipboard is empty")
      }
    } catch {
      toast.error("Unable to access clipboard. Please paste manually.")
    }
  }

  // File upload handler
  const handleFileUpload = async (file: File) => {
    setUploading(true)
    const toastId = toast.loading(`Extracting text from ${file.name}...`)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/ai/parse-jd-file", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to parse file")
      }

      const data = await res.json()
      setJdText(data.text)
      setMode("scan")
      toast.success("JD text extracted successfully!", { id: toastId })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload error"
      toast.error(msg, { id: toastId })
    } finally {
      setUploading(false)
    }
  }

  // Drag and drop events
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  // AI Scan Submission
  const handleAiScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!jdText.trim()) {
      toast.error("Please paste or upload a Job Description first")
      return
    }

    setAiLoading(true)
    setLoadingStep(0)
    setAnalysisResult(null)

    const steps = [
      "Extracting role snapshot & tech stack...",
      "Matching with your profile skills...",
      "Evaluating strengths & red flags...",
      "Compiling application strategy...",
    ]

    let currentStep = 0
    const stepInterval = setInterval(() => {
      if (currentStep < steps.length - 1) {
        currentStep++
        setLoadingStep(currentStep)
      }
    }, 1400)

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
      toast.success("AI Compatibility Scan Completed!")
    } catch (error: unknown) {
      clearInterval(stepInterval)
      const errMsg = error instanceof Error ? error.message : "Something went wrong"
      toast.error(errMsg)
    } finally {
      setAiLoading(false)
    }
  }

  // Save Application from Analysis
  const handleSaveFromAI = async (targetStatus: string) => {
    if (!analysisResult) return
    setSavingAction(true)
    const toastId = toast.loading(`Saving to ${targetStatus}...`)

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
        throw new Error(errorData.error || "Failed to save application")
      }

      const application = await appRes.json()

      await fetch(`/api/applications/${application.id}/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: analysisResult, rawJd: jdText }),
      })

      toast.success("Application tracked successfully!", { id: toastId })
      setAnalysisResult(null)
      setJdText("")
      router.push(`/applications/${application.id}`)
      router.refresh()
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to save"
      toast.error(errMsg, { id: toastId })
    } finally {
      setSavingAction(false)
    }
  }

  // Manual Creation
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
        throw new Error(data.error || "Failed to create application")
      }

      const app = await res.json()
      toast.success("Application created!")
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

  return (
    <>
      <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xl p-5 sm:p-6 shadow-sm hover:border-border transition-all duration-300">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          
          {/* Left Column: Greeting & Status Micro-Badge */}
          <div className="lg:w-5/12 space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-border/60 bg-muted/40 text-[11px] font-mono text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-status-applied animate-pulse" />
              <span>{activePipeline} Active Roles in Pipeline</span>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {greeting}, {firstName}
              </h1>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Paste any job description or drop a file to instantly analyze compatibility and track it.
              </p>
            </div>

            {totalThisWeek > 0 && (
              <div className="pt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px] font-mono border-border/60">
                  +{totalThisWeek} added this week
                </Badge>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Command Control */}
          <div className="lg:w-7/12 min-w-0 space-y-3">
            
            {/* Quick Chips Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMode("scan")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    mode === "scan"
                      ? "bg-secondary text-secondary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <Sparkles className="h-3 w-3 inline mr-1" />
                  Text Intake
                </button>

                <button
                  type="button"
                  onClick={() => setMode("upload")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    mode === "upload"
                      ? "bg-secondary text-secondary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <Upload className="h-3 w-3 inline mr-1" />
                  Drop File
                </button>

                <button
                  type="button"
                  onClick={() => setMode("manual")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    mode === "manual"
                      ? "bg-secondary text-secondary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <Plus className="h-3 w-3 inline mr-1" />
                  Manual Entry
                </button>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePasteClipboard}
                className="h-7 text-[11px] font-mono text-muted-foreground hover:text-foreground px-2 cursor-pointer"
              >
                <Clipboard className="h-3 w-3 mr-1" />
                Paste Clipboard
              </Button>
            </div>

            {/* MODE 1: Text Area Scan */}
            {mode === "scan" && (
              <form onSubmit={handleAiScan} className="space-y-2.5">
                <div className="relative">
                  <Textarea
                    placeholder="Paste job description here..."
                    className="min-h-[100px] max-h-[160px] text-xs leading-relaxed resize-none bg-background/80 border-border/80 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 rounded-xl"
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                  />
                  {(detectedCompany || detectedRole) && (
                    <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
                      {detectedCompany && (
                        <span className="text-[9px] font-mono bg-muted/80 border border-border/60 text-muted-foreground px-2 py-0.5 rounded-full">
                          🏢 {detectedCompany}
                        </span>
                      )}
                      {detectedRole && (
                        <span className="text-[9px] font-mono bg-muted/80 border border-border/60 text-muted-foreground px-2 py-0.5 rounded-full truncate max-w-[120px]">
                          💼 {detectedRole}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {jdText.length > 0 ? `${jdText.length} chars` : "Supports full JD text"}
                  </span>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={aiLoading || !jdText.trim()}
                    className="text-xs font-semibold h-8 px-4 cursor-pointer"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary-foreground" />
                        Intake & Analyze
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* MODE 2: Drop File */}
            {mode === "upload" && (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border/80 hover:border-primary/50 bg-background/50 hover:bg-muted/30 transition-all rounded-xl p-6 text-center cursor-pointer flex flex-col items-center justify-center space-y-2 min-h-[110px]"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileUpload(e.target.files[0])
                  }}
                />
                {uploading ? (
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                ) : (
                  <FileText className="h-6 w-6 text-muted-foreground" />
                )}
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {uploading ? "Extracting file text..." : "Click or drag & drop JD file (PDF, TXT)"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                    Text will automatically load into analysis mode
                  </p>
                </div>
              </div>
            )}

            {/* MODE 3: Manual Entry */}
            {mode === "manual" && (
              <form onSubmit={handleManualSubmit} className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    placeholder="Company name"
                    className="h-9 text-xs bg-background/80 border-border/80"
                    value={manualCompany}
                    onChange={(e) => setManualCompany(e.target.value)}
                    disabled={manualLoading}
                  />
                  <Input
                    placeholder="Job title"
                    className="h-9 text-xs bg-background/80 border-border/80"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    disabled={manualLoading}
                  />
                  <Select value={manualSource} onValueChange={setManualSource} disabled={manualLoading}>
                    <SelectTrigger className="h-9 text-xs bg-background/80 border-border/80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["LinkedIn", "Bdjobs", "Indeed", "Wellfound", "Facebook", "Referral", "Other"].map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={manualLoading || !manualCompany.trim() || !manualTitle.trim()}
                    className="text-xs font-semibold h-8 px-4 cursor-pointer"
                  >
                    {manualLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Add Application
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}

          </div>
        </div>
      </div>

      {/* Floating Action Modal for AI Fit Analysis Results */}
      {analysisResult && (
        <Dialog open={!!analysisResult} onOpenChange={() => setAnalysisResult(null)}>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border-border bg-card p-6 shadow-2xl">
            <DialogHeader className="border-b border-border pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-semibold text-primary uppercase tracking-wider">
                    AI Fit Analysis
                  </span>
                  <DialogTitle className="text-base font-bold text-foreground mt-0.5">
                    {analysisResult.roleSnapshot?.role || "Target Role"}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    {analysisResult.roleSnapshot?.company || "Unknown Company"}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary/40 bg-muted/40 font-mono font-bold text-sm text-foreground">
                  {analysisResult.matchScore}%
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Verdict Banner */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border text-xs">
                <span className="font-semibold text-foreground">Verdict: {analysisResult.verdict}</span>
                <span className="text-[10px] font-mono text-muted-foreground">Confidence: {analysisResult.confidence}</span>
              </div>

              {/* Red flags if any */}
              {analysisResult.redFlags && (
                <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/5 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-destructive font-semibold">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Cautions & Red Flags</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">{analysisResult.redFlags}</p>
                </div>
              )}

              {/* Highlights */}
              {analysisResult.whyThisScore?.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Why this score</h4>
                  <ul className="space-y-1">
                    {analysisResult.whyThisScore.map((reason: string, i: number) => (
                      <li key={i} className="text-xs text-foreground/90 flex items-start gap-2">
                        <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing keywords */}
              {analysisResult.missingGaps?.missingKeywords?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Missing Keywords</h4>
                  <div className="flex flex-wrap gap-1">
                    {analysisResult.missingGaps.missingKeywords.map((kw: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-[10px] font-mono border-border/80">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendation */}
              <div className="pt-2 border-t border-border/60">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Recommendation</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{analysisResult.finalRecommendation}</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAnalysisResult(null)}
                className="text-xs cursor-pointer"
              >
                Discard
              </Button>
              <Button
                size="sm"
                disabled={savingAction}
                onClick={() => handleSaveFromAI("Saved")}
                className="text-xs font-semibold cursor-pointer"
              >
                {savingAction ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Save as Saved <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
              <Button
                size="sm"
                disabled={savingAction}
                onClick={() => handleSaveFromAI("Applied")}
                className="text-xs font-semibold cursor-pointer"
              >
                {savingAction ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Mark Applied
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}
