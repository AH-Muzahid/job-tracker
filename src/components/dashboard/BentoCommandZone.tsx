"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Plus, Sparkles, Upload, Clipboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
      </div>

    </>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}
