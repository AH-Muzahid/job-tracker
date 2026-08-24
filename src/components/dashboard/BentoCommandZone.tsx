"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Plus, Sparkles, Upload, Clipboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

import { useUI } from "@/lib/store"
import { ScanIntakeMode } from "./command-zone/ScanIntakeMode"
import { UploadMode } from "./command-zone/UploadMode"
import { ManualEntryMode } from "./command-zone/ManualEntryMode"

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
  const [detectedCompany, setDetectedCompany] = useState<string | null>(null)
  const [detectedRole, setDetectedRole] = useState<string | null>(null)

  // Upload state
  const [uploading, setUploading] = useState(false)

  // Manual state
  const [manualCompany, setManualCompany] = useState("")
  const [manualTitle, setManualTitle] = useState("")
  const [manualSource, setManualSource] = useState("LinkedIn")
  const [manualLoading, setManualLoading] = useState(false)

  const { setAiSidebarOpen, setPendingPrompt } = useUI()

  const firstName = user?.firstName || "there"
  const greeting = getGreeting()

  // Real-time lightweight extraction heuristic
  useEffect(() => {
    if (!jdText.trim()) {
      setDetectedCompany(null)
      setDetectedRole(null)
      return
    }
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

  // AI Scan Submission
  const handleAiScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!jdText.trim()) {
      toast.error("Please paste or upload a Job Description first")
      return
    }

    setAiLoading(true)
    
    // Set the prompt and open the sidebar
    setPendingPrompt(`Analyze this job description:\n\n${jdText}`)
    setAiSidebarOpen(true)
    
    toast.success("AI Assistant opened!")
    
    // Slight delay to allow UI to transition
    setTimeout(() => {
      setAiLoading(false)
      setJdText("")
      setMode("scan")
    }, 500)
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
      <section
        role="region"
        aria-label="Application Command Center"
        className="rounded-xl border border-border/80 bg-card/60 backdrop-blur-2xl p-5 sm:p-6 shadow-sm hover:border-zinc-700 transition-all duration-200 relative overflow-hidden"
      >
        {/* Top Vercel Header Row */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-xs" />
            <span className="text-xs font-mono font-medium text-foreground tracking-tight">Production Pipeline</span>
            <span className="text-[10px] font-mono text-zinc-500 border border-border/60 bg-muted/40 px-2 py-0.5 rounded">
              Active Sprint
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePasteClipboard}
              className="h-7 text-xs font-mono text-zinc-400 hover:text-foreground border-border/80 bg-background/50 px-2.5 rounded-lg cursor-pointer"
            >
              <Clipboard className="h-3 w-3 mr-1 text-zinc-400" />
              Paste JD
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setMode("manual")}
              className="h-7 text-xs font-medium bg-foreground text-background hover:bg-zinc-200 px-3 rounded-lg cursor-pointer shadow-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Log Job
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          {/* Left Column: Greeting & Summary */}
          <div className="lg:w-5/12 space-y-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground font-sans">
                {greeting}, {firstName}
              </h1>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Scan job postings with AI, track interview stages, and optimize your application velocity in one place.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs font-mono">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/60 bg-muted/30 text-zinc-300">
                <span className="text-emerald-400 font-bold">{activePipeline}</span>
                <span className="text-[11px] text-zinc-500">in flight</span>
              </div>
              {totalThisWeek > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/60 bg-muted/30 text-zinc-300">
                  <span className="text-blue-400 font-bold">+{totalThisWeek}</span>
                  <span className="text-[11px] text-zinc-500">this week</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Interactive Command Control */}
          <div className="lg:w-7/12 min-w-0 space-y-3">
            {/* Vercel-Style Segmented Tabs */}
            <div className="flex items-center justify-between gap-2 p-1 rounded-lg border border-border/60 bg-muted/30">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMode("scan")}
                  aria-pressed={mode === "scan"}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    mode === "scan"
                      ? "bg-background text-foreground shadow-xs font-semibold border border-border/60"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Sparkles className="h-3 w-3 text-primary" />
                  AI Intake
                </button>

                <button
                  type="button"
                  onClick={() => setMode("upload")}
                  aria-pressed={mode === "upload"}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    mode === "upload"
                      ? "bg-background text-foreground shadow-xs font-semibold border border-border/60"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Upload className="h-3 w-3 text-zinc-400" />
                  PDF / File
                </button>

                <button
                  type="button"
                  onClick={() => setMode("manual")}
                  aria-pressed={mode === "manual"}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    mode === "manual"
                      ? "bg-background text-foreground shadow-xs font-semibold border border-border/60"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Plus className="h-3 w-3 text-zinc-400" />
                  Quick Entry
                </button>
              </div>

              <span className="text-[10px] font-mono text-zinc-500 pr-2 hidden sm:inline">
                ⌘V to paste
              </span>
            </div>

            {/* MODE 1: Text Area Scan */}
            {mode === "scan" && (
              <ScanIntakeMode
                jdText={jdText}
                setJdText={setJdText}
                detectedCompany={detectedCompany}
                detectedRole={detectedRole}
                aiLoading={aiLoading}
                onSubmit={handleAiScan}
              />
            )}

            {/* MODE 2: Drop File */}
            {mode === "upload" && (
              <UploadMode uploading={uploading} onFileUpload={handleFileUpload} />
            )}

            {/* MODE 3: Manual Entry */}
            {mode === "manual" && (
              <ManualEntryMode
                manualCompany={manualCompany}
                setManualCompany={setManualCompany}
                manualTitle={manualTitle}
                setManualTitle={setManualTitle}
                manualSource={manualSource}
                setManualSource={setManualSource}
                manualLoading={manualLoading}
                onSubmit={handleManualSubmit}
              />
            )}
          </div>
        </div>
      </section>
    </>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}
