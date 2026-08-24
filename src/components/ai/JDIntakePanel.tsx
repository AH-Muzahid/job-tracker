"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bot, Sparkles, ChevronDown, ChevronUp, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

export function JDIntakePanel() {
  const router = useRouter()
  const [jdText, setJdText] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [jobUrl, setJobUrl] = useState("")
  const [source, setSource] = useState("LinkedIn")
  const [showOptions, setShowOptions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  
  // Preview Analysis State
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!jdText.trim()) {
      toast.error("Please paste a job description first")
      return
    }

    setLoading(true)
    setLoadingStep(0)
    setAnalysisResult(null)

    // Simulate progress steps for a premium, alive feel
    const steps = [
      "Extracting role snapshot & tech stack...",
      "Matching with your profile skills & resume...",
      "Evaluating strengths, gaps & red flags...",
      "Compiling final application strategy..."
    ]

    let currentStep = 0
    const stepInterval = setInterval(() => {
      if (currentStep < steps.length - 1) {
        currentStep++
        setLoadingStep(currentStep)
      }
    }, 1500)

    try {
      let finalJdText = jdText.trim()

      // Auto-detect URL input
      if (/^https?:\/\/[^\s]+$/i.test(finalJdText)) {
        toast.info("Scraping job post from URL...")
        const scrapeRes = await fetch("/api/ai/scrape-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: finalJdText }),
        })

        if (scrapeRes.ok) {
          const scraped = await scrapeRes.json()
          if (!jobUrl) setJobUrl(scraped.url)
          finalJdText = scraped.text
          setJdText(finalJdText)
          toast.success("Job description extracted from page!")
        } else {
          toast.warning("Could not auto-scrape page content. Analyzing URL text directly.")
        }
      }

      // Call scan-jd without applicationId to get just a preview analysis
      const response = await fetch("/api/ai/scan-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jdText: finalJdText,
        }),
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
      console.error(error)
      const errMsg = error instanceof Error ? error.message : "Something went wrong during analysis"
      toast.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAction = async (targetStatus: string) => {
    if (!analysisResult) return
    setActionLoading(true)
    const toastId = toast.loading(`Saving job to ${targetStatus}...`)
    
    try {
      // 1. Create application with the fields parsed by AI
      const appRes = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim() || analysisResult.roleSnapshot.company || "Unknown Company",
          jobTitle: jobTitle.trim() || analysisResult.roleSnapshot.role || "Target Role",
          jobUrl: jobUrl.trim() || null,
          source,
          status: targetStatus,
          applicationDate: new Date().toISOString(),
          notes: jdText
        })
      })

      if (!appRes.ok) {
        const errorData = await appRes.json()
        throw new Error(errorData.error || "Failed to save application")
      }

      const application = await appRes.json()

      // 2. Save pre-computed analysis if available
      if (analysisResult) {
        try {
          const analysisRes = await fetch(`/api/applications/${application.id}/analysis`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              analysis: analysisResult,
              rawJd: jdText
            })
          })

          if (!analysisRes.ok) {
            console.warn("Application was created, but AI analysis failed to save.")
          }
        } catch (analysisErr) {
          console.error("Network error while saving AI analysis:", analysisErr)
        }
      }

      toast.success("Application saved successfully!", { id: toastId })
      
      // Reset form and redirect to the workbench
      handleDiscard()
      router.push(`/applications/${application.id}`)
      router.refresh()
    } catch (err: unknown) {
      console.error(err)
      const errMsg = err instanceof Error ? err.message : "Failed to save application"
      toast.error(errMsg, { id: toastId })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDiscard = () => {
    setAnalysisResult(null)
    setJdText("")
    setCompanyName("")
    setJobTitle("")
    setJobUrl("")
  }


  // 1. Loading State
  if (loading) {
    const steps = [
      "Extracting role snapshot & tech stack...",
      "Matching with your profile skills & resume...",
      "Evaluating strengths, gaps & red flags...",
      "Compiling final application strategy..."
    ]

    return (
      <Card className="border border-border bg-card shadow-xl overflow-hidden h-full flex flex-col justify-center items-center p-8 min-h-[380px]">
        <div className="relative flex items-center justify-center mb-6">
          <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <Bot className="absolute h-6 w-6 text-primary animate-pulse" />
        </div>
        
        <h3 className="text-sm font-bold text-foreground mb-1 text-center">AI Job Fit Analysis</h3>
        <p className="text-xs text-muted-foreground text-center mb-6 max-w-[260px]">
          Reading the job details and evaluating your compatibility...
        </p>
        
        <div className="w-full max-w-[280px] bg-secondary/40 rounded-full h-1.5 mb-4">
          <div 
            className="bg-primary h-1.5 rounded-full transition-all duration-500" 
            style={{ width: `${((loadingStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <p className="text-[11px] font-semibold text-primary text-center">
          {steps[loadingStep]}
        </p>
      </Card>
    )
  }

  // 2. Preview Analysis State
  if (analysisResult) {
    const { roleSnapshot, matchScore, verdict, confidence, whyThisScore, missingGaps, redFlags, finalRecommendation } = analysisResult
    
    return (
      <Card className="border border-border bg-card shadow-xl overflow-hidden h-full flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <CardHeader className="pb-3 border-b border-border bg-secondary/15">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary mb-1">
                <Sparkles className="h-2.5 w-2.5" /> AI Analysis Ready
              </span>
              <h3 className="text-sm font-bold text-foreground truncate">{roleSnapshot.role || "Target Role"}</h3>
              <p className="text-xs text-muted-foreground truncate">{roleSnapshot.company || "Unknown Company"}</p>
            </div>
            
            <div 
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 text-xs font-bold bg-background shadow-sm"
              style={{
                borderColor: 
                  matchScore >= 80 
                    ? "#10b981" 
                    : matchScore >= 60 
                      ? "#f59e0b" 
                      : "#f43f5e",
                color:
                  matchScore >= 80 
                    ? "#10b981" 
                    : matchScore >= 60 
                      ? "#f59e0b" 
                      : "#f43f5e",
              }}
            >
              {matchScore}%
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 space-y-4 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] max-h-[300px]">
          {/* Verdict Banner */}
          <div className={`p-3 rounded-lg border flex items-center justify-between text-xs font-semibold ${
            matchScore >= 80 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-450" 
              : matchScore >= 60 
                ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-455" 
                : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-455"
          }`}>
            <span>Verdict: {verdict}</span>
            <span className="text-[10px] opacity-80">Confidence: {confidence}</span>
          </div>

          {/* Red Flags Banner */}
          {redFlags && (
            <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/15 flex gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Cautions / Red Flags</h4>
                <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5 leading-relaxed">{redFlags}</p>
              </div>
            </div>
          )}

          {/* Highlights */}
          {whyThisScore && whyThisScore.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Why this score</h4>
              <ul className="space-y-1">
                {whyThisScore.map((reason: string, i: number) => (
                  <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5 leading-relaxed">
                    <span className="text-primary font-bold select-none">•</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Tech & Tools */}
          {missingGaps && (
            <div className="space-y-3 pt-1 border-t border-border/60">
              {missingGaps.missingKeywords && missingGaps.missingKeywords.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Missing Keywords</h4>
                  <div className="flex flex-wrap gap-1">
                    {missingGaps.missingKeywords.map((kw: string, i: number) => (
                      <span key={i} className="text-[9px] bg-secondary text-secondary-foreground border border-border px-1.5 py-0.5 rounded font-medium">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {missingGaps.missingTools && missingGaps.missingTools.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Missing Tools</h4>
                  <div className="flex flex-wrap gap-1">
                    {missingGaps.missingTools.map((t: string, i: number) => (
                      <span key={i} className="text-[9px] bg-secondary text-secondary-foreground border border-border px-1.5 py-0.5 rounded font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recommendation */}
          <div className="pt-2 border-t border-border/60">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">AI Recommendation</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{finalRecommendation}</p>
          </div>
        </CardContent>
        
        {/* Actions Footer */}
        <div className="p-4 border-t border-border bg-secondary/10 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handleSaveAction("Saved")}
              disabled={actionLoading}
              className="text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold cursor-pointer"
            >
              Save Job
            </Button>
            <Button
              onClick={() => handleSaveAction("Applied")}
              disabled={actionLoading}
              variant="outline"
              className="text-xs h-9 border-border text-foreground hover:bg-accent hover:text-accent-foreground font-semibold cursor-pointer"
            >
              Mark Applied
            </Button>
          </div>
          <Button
            onClick={handleDiscard}
            disabled={actionLoading}
            variant="ghost"
            className="text-xs h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 font-semibold cursor-pointer"
          >
            Discard & Scan Another
          </Button>
        </div>
      </Card>
    )
  }

  // 3. Input Form State (Default)
  return (
    <Card className="border border-border bg-card/40 backdrop-blur-md shadow-xl overflow-hidden h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold tracking-wide flex items-center gap-1.5 text-foreground">
              Smart Intake & Fit Analysis
              <span className="inline-flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                <Sparkles className="h-2.5 w-2.5" /> AI
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Paste a JD to analyze compatibility, match skills, and see red flags before saving.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 flex flex-col flex-1">
        <form onSubmit={handleSubmit} className="space-y-3.5 flex flex-col flex-1">
          <div className="space-y-1.5">
            <Label htmlFor="jd" className="text-xs font-semibold text-foreground/80">
              Job Description (JD)
            </Label>
            <Textarea
              id="jd"
              placeholder="Paste the full job description text here..."
              className="min-h-[140px] max-h-[220px] text-xs leading-relaxed bg-background border-input text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 focus:border-primary transition-all resize-none outline-none flex-1 p-3 rounded-lg"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="pt-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowOptions(!showOptions)}
              className="text-xs h-7 text-primary hover:text-primary/80 hover:bg-primary/5 px-2 font-medium flex items-center gap-1 cursor-pointer"
            >
              {showOptions ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" /> Hide Manual Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" /> Overrides & Manual Fields
                </>
              )}
            </Button>
          </div>

          {showOptions && (
            <div className="grid gap-3 grid-cols-2 bg-secondary/20 rounded-lg p-3 border border-border/80 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-1">
                <Label htmlFor="company" className="text-[10px] font-semibold text-foreground/80">
                  Company Name (Override)
                </Label>
                <Input
                  id="company"
                  placeholder="e.g. Google"
                  className="h-8 text-xs bg-background border-input text-foreground"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="title" className="text-[10px] font-semibold text-foreground/80">
                  Job Title (Override)
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. Frontend Engineer"
                  className="h-8 text-xs bg-background border-input text-foreground"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="col-span-2 space-y-1">
                <Label htmlFor="url" className="text-[10px] font-semibold text-foreground/80">
                  Job URL
                </Label>
                <Input
                  id="url"
                  placeholder="https://linkedin.com/jobs/view/..."
                  className="h-8 text-xs bg-background border-input text-foreground"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="col-span-2 space-y-1">
                <Label htmlFor="source" className="text-[10px] font-semibold text-foreground/80">
                  Source
                </Label>
                <Select value={source} onValueChange={setSource} disabled={loading}>
                  <SelectTrigger className="h-8 text-xs bg-background border-input text-foreground">
                    <SelectValue placeholder="LinkedIn" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-foreground text-xs">
                    {["LinkedIn", "Bdjobs", "Indeed", "Wellfound", "Facebook", "Referral", "Other"].map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex gap-2.5 pt-2 mt-auto">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/95 font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {loading ? "Intaking & Analyzing..." : "Intake & Analyze Job"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
