"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export function normalizeInternalHref(rawHref?: string): { isInternal: boolean; path: string } {
  if (!rawHref) return { isInternal: false, path: "" }
  const trimmed = rawHref.trim()
  if (trimmed.startsWith("/")) {
    return { isInternal: true, path: trimmed }
  }
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const url = new URL(trimmed)
      const host = url.hostname.toLowerCase()
      const isLocalOrInternal =
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "0.0.0.0" ||
        host.includes("careertrack") ||
        (typeof window !== "undefined" && url.host === window.location.host)

      if (isLocalOrInternal) {
        return { isInternal: true, path: url.pathname + url.search + url.hash }
      }
    }
  } catch {
    // fallback
  }
  return { isInternal: false, path: trimmed }
}
import {
  MessageSquare,
  Copy,
  Check,
  Pencil,
  RotateCcw,
  Mic,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Loader2,
  FileText,
  Layers,
  Target,
  FileSpreadsheet,
  Briefcase,
  Compass,
  Building2,
  Sliders,
} from "lucide-react"
import { toast } from "sonner"
import AnalysisResult from "./AnalysisResult"
import OutreachResult from "./OutreachResult"
import MockInterviewResult from "./MockInterviewResult"
import TailoredResumeResult from "./TailoredResumeResult"
import CoverLetterResult from "./CoverLetterResult"
import ToolChips from "./ToolChips"
import StreamingText from "./StreamingText"
import LoadingState from "./LoadingState"
import MermaidDiagram from "./MermaidDiagram"
import { type ToolInvocation } from "./AIChat"
import HITLConfirmForm from "./HITLConfirmForm"
import type { AgentPlanStep } from "@/lib/ai/graph/state"

interface Props {
  message: {
    id: string
    role: string
    content: string
    status?: string
    reasoning?: string
    plan?: AgentPlanStep[]
    toolInvocations?: ToolInvocation[]
    interruptData?: Record<string, unknown> | null
  }
  isLast: boolean
  isStreaming: boolean
  onSuggestionClick?: (prompt: string) => void
  onRetry?: (content?: string) => void
  onToolConfirm?: (toolName: string, args: Record<string, unknown>, action?: "APPROVE" | "REJECT") => void
  onEdit?: (messageId: string, newText: string) => void
}

interface Suggestion {
  icon: string
  label: string
  prompt: string
}

function extractTargetEntity(content: string, toolInvocations?: ToolInvocation[]): { company?: string; role?: string } {
  // Check tool invocations first for highest precision
  if (toolInvocations && toolInvocations.length > 0) {
    for (const tool of toolInvocations) {
      if (tool.result && typeof tool.result === "object") {
        const res = tool.result as Record<string, unknown>
        const app = res.application && typeof res.application === "object" ? (res.application as Record<string, unknown>) : null
        const comp = typeof res.companyName === "string" ? res.companyName : typeof app?.companyName === "string" ? app.companyName : undefined
        const role = typeof res.role === "string" ? res.role : typeof res.jobTitle === "string" ? res.jobTitle : typeof app?.jobTitle === "string" ? app.jobTitle : undefined
        if (comp) return { company: comp, role }
      }
      if (tool.args && typeof tool.args === "object") {
        const args = tool.args as Record<string, unknown>
        const comp = typeof args.companyName === "string" ? args.companyName : undefined
        const role = typeof args.role === "string" ? args.role : typeof args.jobTitle === "string" ? args.jobTitle : undefined
        if (comp) return { company: comp, role }
      }
    }
  }

  // Regex lookup from content
  const compMatch = content.match(/(?:at|for|to|company:?)\s+([A-Z][A-Za-z0-9&.-]{1,20})/i)
  const roleMatch = content.match(/(?:role|position|as\s+a(?:n)?)\s+([A-Z][A-Za-z0-9\s&.-]{2,25})/i)

  const rawComp = compMatch?.[1]?.trim().replace(/[.,;:!?'")\]]+$/, "")
  const rawRole = roleMatch?.[1]?.trim().replace(/[.,;:!?'")\]]+$/, "")

  return {
    company: rawComp,
    role: rawRole,
  }
}

function getContextualSuggestions(content: string, toolInvocations?: ToolInvocation[]): Suggestion[] {
  const lower = content.toLowerCase()
  // If it's a short greeting or brief message, never show suggestions
  if (content.length < 80 && (lower.includes("hi") || lower.includes("hello") || lower.includes("hey") || lower.includes("welcome"))) {
    return []
  }

  const { company, role } = extractTargetEntity(content, toolInvocations)
  const list: Suggestion[] = []

  // Case 1: Outreach Email Draft or Email Pitch was produced
  const hasOutreach = lower.includes("outreach email") || lower.includes("email outreach") || toolInvocations?.some((t) => t.toolName === "draftOutreachEmail")
  if (hasOutreach) {
    if (company) {
      list.push({
        icon: "",
        label: `Track ${company} as Applied`,
        prompt: `Track my application to ${company}${role ? ` for ${role}` : ""} as Applied`,
      })
      list.push({
        icon: "",
        label: `Interview Questions (${company})`,
        prompt: `What technical and behavioral questions does ${company} typically ask for ${role || "this role"}?`,
      })
      list.push({
        icon: "",
        label: `Company Intel & Culture`,
        prompt: `Give me an intel summary on ${company}'s engineering culture, tech stack, and interview rounds.`,
      })
    } else {
      list.push({
        icon: "",
        label: "Track in Application Board",
        prompt: "Track this application in my Application Board as Applied",
      })
      list.push({
        icon: "",
        label: "Shorten for LinkedIn DM",
        prompt: "Shorten this outreach message to under 80 words for a direct LinkedIn message.",
      })
      list.push({
        icon: "",
        label: "Expected Interview Questions",
        prompt: "What technical and behavioral questions are typically asked for this role?",
      })
    }
    return list.slice(0, 3)
  }

  // Case 2: JD Scan / Match Analysis
  if (lower.includes("analysis") || lower.includes("match score") || lower.includes("requirements") || lower.includes("verdict")) {
    if (company) {
      list.push({
        icon: "",
        label: `Draft Outreach Email (${company})`,
        prompt: `Write a customized, high-impact outreach email for the ${role || "role"} at ${company} focusing on my relevant projects.`,
      })
      list.push({
        icon: "",
        label: `Tailor Resume (${company})`,
        prompt: `Tailor my resume specifically for the ${role || "role"} at ${company}.`,
      })
      list.push({
        icon: "",
        label: `Launch Mock Interview (${company})`,
        prompt: `Launch the live spoken voice mock interview room for ${company}${role ? ` (${role})` : ""}.`,
      })
    } else {
      list.push({
        icon: "",
        label: "Draft Outreach Email",
        prompt: "Write a customized, high-impact outreach email for this role.",
      })
      list.push({
        icon: "",
        label: "Tailor Resume for JD",
        prompt: "Tailor my resume specifically for this role focusing on my relevant skills and projects.",
      })
      list.push({
        icon: "",
        label: "Launch Mock Interview",
        prompt: "Launch the live spoken voice mock interview room for this role.",
      })
    }
    return list.slice(0, 3)
  }

  // Case 3: Mock Interview Setup or Preparation
  const isMockInterviewSetup =
    lower.includes("launch voice mock room") ||
    lower.includes("voice mock room") ||
    lower.includes("conversational voice") ||
    lower.includes("autostart=true") ||
    lower.includes("```interview") ||
    lower.includes('"interviewtype"') ||
    toolInvocations?.some((t) => t.toolName === "setupMockInterview")

  if (isMockInterviewSetup) {
    // Room is already configured: Do NOT suggest redundant "Start Mock Interview" or "Launch Voice Mock Room"!
    list.push({
      icon: "",
      label: "Switch to System Design Focus",
      prompt: `Update this mock interview room to focus on System Design and Distributed Architecture${company ? ` for ${company}` : ""}.`,
    })
    list.push({
      icon: "",
      label: "Focus on Behavioral & STAR",
      prompt: "Focus the mock interview questions strictly on Behavioral, Leadership, and Conflict Resolution using the STAR method.",
    })
    list.push({
      icon: "",
      label: "Senior / Staff Difficulty",
      prompt: "Increase interview difficulty to Senior/Staff engineer level with rigorous trade-offs and edge cases.",
    })
    return list.slice(0, 3)
  }

  if (lower.includes("interview") || lower.includes("mock") || lower.includes("assessment")) {
    list.push({
      icon: "",
      label: company ? `Launch Voice Mock (${company})` : "Launch Voice Mock Room",
      prompt: company
        ? `Launch the live spoken voice mock interview room for ${company}${role ? ` (${role})` : ""}`
        : "Launch the live spoken voice mock interview room for my target role",
    })
    list.push({
      icon: "",
      label: "Model STAR Answers",
      prompt: "Provide concise, high-scoring STAR method answers for each of these interview questions.",
    })
    return list.slice(0, 2)
  }

  // Case 4: Resume / ATS
  if (lower.includes("resume") || lower.includes("ats")) {
    list.push({
      icon: "",
      label: "Optimize Resume Points",
      prompt: "Rewrite my project bullet points with quantifiable impact metrics for better ATS ranking.",
    })
    list.push({
      icon: "",
      label: "Identify Missing Keywords",
      prompt: "Analyze this response and identify any key technical skills or keywords I should emphasize.",
    })
    return list.slice(0, 2)
  }

  // Case 5: Weekly Goals / Target Tracking
  if (lower.includes("goal") || lower.includes("target")) {
    list.push({
      icon: "",
      label: "View Weekly Goals",
      prompt: "Show me my active weekly goals and current progress.",
    })
    list.push({
      icon: "",
      label: "Set New Application Goal",
      prompt: "Help me set an ambitious, achievable weekly goal for applications and networking.",
    })
    return list.slice(0, 2)
  }

  // Case 6: Integrations / Google Sheets
  if (lower.includes("sheet") || lower.includes("export") || lower.includes("csv") || lower.includes("sync")) {
    list.push({
      icon: "",
      label: "Sync to Google Sheets",
      prompt: "Sync all my tracked job applications to Google Sheets.",
    })
    list.push({
      icon: "",
      label: "Integration Settings",
      prompt: "What integrations are currently active and how do I configure them?",
    })
    return list.slice(0, 2)
  }

  // Default: Return EMPTY array! NEVER dump generic hardcoded buttons!
  return []
}

// Dedicated memoized FollowUps component to eliminate re-renders and animation resets
export const FollowUpsList = React.memo(function FollowUpsList({
  items,
  onPick,
}: {
  items: Array<Suggestion | string>
  onPick?: (prompt: string) => void
}) {
  if (!items || items.length === 0) return null

  // Flatten and split if any item contains multiple questions, newlines, or bullets
  const flattened: Array<{ label: string; prompt: string }> = []

  items.forEach((item) => {
    if (typeof item === "string") {
      const lines = item
        .split(/\r?\n+/)
        .map((l) => l.replace(/^[\d+.\-•*#\s\p{Emoji}\u2000-\u3300\ufe0f]+/gu, "").trim())
        .filter((l) => l.length > 0)
      lines.forEach((line) => {
        flattened.push({ label: line, prompt: line })
      })
    } else if (item && typeof item === "object") {
      let label = (item.label || item.prompt || "").trim()
      const prompt = (item.prompt || item.label || "").trim()
      label = label.replace(/^[\p{Emoji}\u2000-\u3300\ufe0f\s]+/gu, "").trim()
      if (label) {
        if (label.includes("\n")) {
          const lines = label
            .split(/\r?\n+/)
            .map((l) => l.replace(/^[\d+.\-•*#\s\p{Emoji}\u2000-\u3300\ufe0f]+/gu, "").trim())
            .filter((l) => l.length > 0)
          lines.forEach((line) => {
            flattened.push({ label: line, prompt: line })
          })
        } else {
          flattened.push({ label, prompt })
        }
      }
    }
  })

  if (flattened.length === 0) return null

  return (
    <div className="mt-3.5 pt-2.5 border-t border-border/40 not-prose space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <span className="size-1.5 rounded-full bg-primary/70 shrink-0" />
        <span>Suggested Next Steps</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {flattened.map((s, i) => (
          <button
            key={`${s.label}-${i}`}
            type="button"
            onClick={() => onPick?.(s.prompt)}
            className="group inline-flex items-center gap-1.5 rounded-[4px] border border-border/80 bg-background/80 hover:bg-muted hover:border-border px-2.5 py-1 text-left text-[11.5px] font-medium text-foreground transition-all cursor-pointer shadow-none active:scale-[0.98]"
          >
            <ArrowRight className="size-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-transform shrink-0" />
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
})

interface AnalysisData {
  matchScore?: number | null
  verdict?: string | null
  confidence?: string | null
  whyThisScore?: string[] | null
  missingGaps?: {
    missingKeywords?: string[]
    missingTools?: string[]
    missingProof?: string[]
    stretchAreas?: string[]
    fixableGaps?: string[]
  } | null
  scoreBreakdown?: {
    dimension: string
    score: number
    max: number
    notes: string
  }[] | null
  finalRecommendation?: string | null
  redFlags?: string | null
}

interface ScoreBreakdownItem {
  dimension: string
  score: number
  max: number
  notes?: string
}

function formatAnalysisContent(rawData: Record<string, unknown>): string {
  const data = rawData as unknown as AnalysisData
  const lines: string[] = []
  if (data.matchScore != null) {
    lines.push(`MATCH SCORE: ${data.matchScore}%`)
  }
  if (data.verdict) {
    lines.push(`VERDICT: ${data.verdict}`)
  }
  if (data.confidence) {
    lines.push(`CONFIDENCE: ${data.confidence}`)
  }
  if (data.finalRecommendation) {
    lines.push(`\nFINAL RECOMMENDATION:\n${data.finalRecommendation}`)
  }
  if (data.redFlags) {
    lines.push(`\nRED FLAGS:\n${data.redFlags}`)
  }
  if (data.whyThisScore && data.whyThisScore.length > 0) {
    lines.push(`\nKEY INSIGHTS:`)
    data.whyThisScore.forEach((item: string) => {
      lines.push(`• ${item}`)
    })
  }
  if (data.scoreBreakdown && data.scoreBreakdown.length > 0) {
    lines.push(`\nSCORE BREAKDOWN:`)
    data.scoreBreakdown.forEach((item: ScoreBreakdownItem) => {
      lines.push(`- ${item.dimension}: ${item.score}/${item.max} (${item.notes || ''})`)
    })
  }
  if (data.missingGaps) {
    const gaps = data.missingGaps
    if (gaps.missingKeywords && gaps.missingKeywords.length > 0) {
      lines.push(`\nMISSING KEYWORDS:\n${gaps.missingKeywords.join(", ")}`)
    }
    if (gaps.missingTools && gaps.missingTools.length > 0) {
      lines.push(`\nMISSING TOOLS:\n${gaps.missingTools.join(", ")}`)
    }
  }
  return lines.join("\n")
}

function extractStreamingJsonField(jsonStr: string, fieldName: string): string {
  const regex = new RegExp(`"${fieldName}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "i")
  const match = jsonStr.match(regex)
  if (match && match[1]) {
    try {
      return JSON.parse(`"${match[1]}"`) as string
    } catch {
      return match[1]
    }
  }
  const partialRegex = new RegExp(`"${fieldName}"\\s*:\\s*"([^"]*)$`, "i")
  const partialMatch = jsonStr.match(partialRegex)
  if (partialMatch && partialMatch[1]) {
    return partialMatch[1]
  }
  return ""
}

function extractStreamingJsonNumber(jsonStr: string, fieldName: string): number | null {
  const regex = new RegExp(`"${fieldName}"\\s*:\\s*(\\d+)`, "i")
  const match = jsonStr.match(regex)
  if (match && match[1]) {
    return parseInt(match[1], 10)
  }
  return null
}

function formatStreamingAnalysis(rawText: string): string {
  const matchScore = extractStreamingJsonNumber(rawText, "matchScore")
  const verdict = extractStreamingJsonField(rawText, "verdict")
  const confidence = extractStreamingJsonField(rawText, "confidence")
  const finalRec = extractStreamingJsonField(rawText, "finalRecommendation")
  const redFlags = extractStreamingJsonField(rawText, "redFlags")

  const lines: string[] = []
  if (matchScore !== null) {
    lines.push(`MATCH SCORE: ${matchScore}%`)
  }
  if (verdict) {
    lines.push(`VERDICT: ${verdict}`)
  }
  if (confidence) {
    lines.push(`CONFIDENCE: ${confidence}`)
  }
  if (finalRec) {
    lines.push(`\nFINAL RECOMMENDATION:\n${finalRec}`)
  }
  if (redFlags) {
    lines.push(`\nRED FLAGS:\n${redFlags}`)
  }
  return lines.join("\n")
}

function getAnalysisContent(rawText: string): string {
  try {
    const data = JSON.parse(rawText) as Record<string, unknown>
    return formatAnalysisContent(data)
  } catch {
    return formatStreamingAnalysis(rawText)
  }
}


function useSafeRouter() {
  try {
    return useRouter()
  } catch {
    return {
      push: (url: string) => {
        if (typeof window !== "undefined") {
          window.location.href = url
        }
      },
      replace: () => {},
      prefetch: () => {},
      back: () => {},
      forward: () => {},
      refresh: () => {},
    }
  }
}

export default function ChatMessage({ message, isLast, isStreaming, onSuggestionClick, onRetry, onToolConfirm, onEdit }: Props) {
  const router = useSafeRouter()
  const isUser = message.role === "user"
  const [copied, setCopied] = useState(false)
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [isNoteSaved, setIsNoteSaved] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [editText, setEditText] = useState(message.content)

  const handleSaveToNotes = async () => {
    if (isNoteSaved || isSavingNote || !message.content?.trim()) return
    setIsSavingNote(true)

    const firstLine = message.content.split("\n").find((l) => l.trim().length > 0) || "AI Career Note"
    const cleanTitle = firstLine.replace(/^[#*\s-]+/, "").slice(0, 60).trim() || "AI Revision Note"

    const lower = message.content.toLowerCase()
    let category = "General"
    if (lower.includes("star") || lower.includes("behavioral") || lower.includes("situation")) category = "Behavioral"
    else if (lower.includes("system design") || lower.includes("architecture") || lower.includes("scalability")) category = "System Design"
    else if (lower.includes("javascript") || lower.includes("react") || lower.includes("node") || lower.includes("technical") || lower.includes("algorithm")) category = "Technical"

    try {
      const res = await fetch("/api/prep-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cleanTitle,
          content: message.content,
          category,
        }),
      })

      if (!res.ok) throw new Error("Failed to save note")
      setIsNoteSaved(true)
      toast.success("Saved to your Revision Notes!", {
        action: {
          label: "View Notes",
          onClick: () => router.push("/interview-prep"),
        },
      })
    } catch {
      toast.error("Failed to save note to Revision Notes")
    } finally {
      setIsSavingNote(false)
    }
  }
  
  const hasEmbeddedSuggestions = Boolean(message.content && message.content.includes("```suggestions"))
  
  const suggestions = React.useMemo(() => {
    return !isUser && isLast && !isStreaming && message.content && !hasEmbeddedSuggestions
      ? getContextualSuggestions(message.content, message.toolInvocations)
      : []
  }, [isUser, isLast, isStreaming, message.content, hasEmbeddedSuggestions, message.toolInvocations])

  // Custom renderer overrides for ReactMarkdown with stable useMemo
  const mdComponents = React.useMemo(() => ({
    a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
      const { isInternal, path } = normalizeInternalHref(href)

      if (isInternal) {
        if (path.startsWith("/applications/") || path === "/applications") {
          return (
            <Link
              href={path}
              className="inline-flex items-center gap-1.5 px-3 py-1 my-2 rounded-sm bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 font-medium text-xs no-underline transition-all hover:shadow-xs group/btn cursor-pointer"
            >
              <span>{children}</span>
              <ArrowRight className="size-3 transition-transform group-hover/btn:translate-x-0.5" />
            </Link>
          )
        }

        if (path.startsWith("/interview-prep")) {
          return (
            <Link
              href={path}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 my-2 rounded-[4px] bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs no-underline transition-all hover:shadow-xs group/btn cursor-pointer shadow-none"
            >
              <Mic className="size-3.5 shrink-0" />
              <span>{children}</span>
              <ArrowRight className="size-3 transition-transform group-hover/btn:translate-x-0.5" />
            </Link>
          )
        }

        if (path.startsWith("/resumes")) {
          return (
            <Link
              href={path}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 my-2 rounded-[4px] bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs no-underline transition-all hover:shadow-xs group/btn cursor-pointer shadow-none"
            >
              <FileText className="size-3.5 shrink-0" />
              <span>{children}</span>
              <ArrowRight className="size-3 transition-transform group-hover/btn:translate-x-0.5" />
            </Link>
          )
        }

        if (path.startsWith("/weekly-goals")) {
          return (
            <Link
              href={path}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 my-2 rounded-[4px] bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs no-underline transition-all hover:shadow-xs group/btn cursor-pointer shadow-none"
            >
              <Target className="size-3.5 shrink-0" />
              <span>{children}</span>
              <ArrowRight className="size-3 transition-transform group-hover/btn:translate-x-0.5" />
            </Link>
          )
        }

        if (path.startsWith("/discovery")) {
          return (
            <Link
              href={path}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 my-2 rounded-[4px] bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs no-underline transition-all hover:shadow-xs group/btn cursor-pointer shadow-none"
            >
              <Compass className="size-3.5 shrink-0" />
              <span>{children}</span>
              <ArrowRight className="size-3 transition-transform group-hover/btn:translate-x-0.5" />
            </Link>
          )
        }

        if (path.startsWith("/companies")) {
          return (
            <Link
              href={path}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 my-2 rounded-[4px] bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs no-underline transition-all hover:shadow-xs group/btn cursor-pointer shadow-none"
            >
              <Building2 className="size-3.5 shrink-0" />
              <span>{children}</span>
              <ArrowRight className="size-3 transition-transform group-hover/btn:translate-x-0.5" />
            </Link>
          )
        }

        if (path.startsWith("/integrations")) {
          return (
            <Link
              href={path}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 my-2 rounded-[4px] bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs no-underline transition-all hover:shadow-xs group/btn cursor-pointer shadow-none"
            >
              <Sliders className="size-3.5 shrink-0" />
              <span>{children}</span>
              <ArrowRight className="size-3 transition-transform group-hover/btn:translate-x-0.5" />
            </Link>
          )
        }

        if (path.startsWith("/actions/")) {
          const url = new URL(path, "http://localhost")
          const actionType = url.pathname.replace("/actions/", "")
          
          let ActionIcon = MessageSquare
          if (actionType === "stage") ActionIcon = Layers
          else if (actionType === "goal") ActionIcon = Target
          else if (actionType === "sync-sheets") ActionIcon = FileSpreadsheet
          else if (actionType === "note") ActionIcon = Bookmark
          else if (actionType === "add") ActionIcon = Briefcase

          const handleActionClick = async () => {
            const company = url.searchParams.get("company")?.trim()
            const status = url.searchParams.get("status")?.trim() || "Saved"
            const title = url.searchParams.get("title")?.trim() || "Software Engineer"
            
            if (!company && actionType !== "sync-sheets" && actionType !== "goal" && actionType !== "note") {
              toast.error("Company name is required to execute this AI action")
              return
            }

            const toastId = toast.loading(
              actionType === "sync-sheets"
                ? "Syncing to Google Sheets..."
                : actionType === "goal"
                ? "Setting weekly goal..."
                : actionType === "note"
                ? "Saving to revision notes..."
                : actionType === "stage"
                ? `Packaging & staging ${company}...`
                : `Processing ${company || "action"}...`
            )
            
            try {
              if (actionType === "status") {
                const searchRes = await fetch(`/api/applications?search=${encodeURIComponent(company!)}&limit=1`)
                if (!searchRes.ok) throw new Error("Failed to search applications")
                const searchData = await searchRes.json()
                const app = searchData.applications?.[0] || searchData.data?.[0]
                if (!app) throw new Error(`Application for "${company}" not found`)
                
                const updateRes = await fetch(`/api/applications/${app.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status }),
                })
                if (!updateRes.ok) throw new Error("Failed to update status")
                toast.success(`Updated ${app.companyName} status to ${status}!`, { 
                  id: toastId,
                  action: {
                    label: "View Board",
                    onClick: () => router.push(`/applications/${app.id}`),
                  },
                  duration: 5000,
                })
              } else if (actionType === "stage") {
                const currentContent = message.content ? `[AI Staged from Assistant]\n${message.content}` : null
                const stageRes = await fetch("/api/applications", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    companyName: company,
                    jobTitle: title,
                    source: "AI Assistant",
                    status: "Staged",
                    notes: currentContent,
                    applicationDate: new Date().toISOString(),
                  }),
                })
                if (!stageRes.ok) {
                  const errJson = await stageRes.json().catch(() => ({}))
                  throw new Error(errJson.error || "Failed to stage application")
                }
                const newApp = await stageRes.json()

                toast.success(`Packaged & Staged ${company} (${title})!`, { 
                  id: toastId,
                  description: "Application moved to Staged on your tracking board.",
                  action: {
                    label: "View in Board",
                    onClick: () => router.push(`/applications/${newApp.id}`),
                  },
                  duration: 6000,
                })
              } else if (actionType === "goal") {
                const goalText =
                  url.searchParams.get("goal") ||
                  url.searchParams.get("title") ||
                  (company ? `Apply to ${company}` : "Complete weekly job search goals")
                const target = parseInt(url.searchParams.get("target") || "1", 10)

                const goalRes = await fetch("/api/weekly-goals", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    goal1: goalText,
                    goal1Target: target,
                    goal1Progress: 0,
                    goal1Status: "InProgress",
                    notes: company ? `Target company: ${company}` : "Created from Career Copilot",
                  }),
                })

                if (!goalRes.ok) {
                  const errJson = await goalRes.json().catch(() => ({}))
                  throw new Error(errJson.error || "Failed to set weekly goal")
                }

                toast.success(`Set as Weekly Goal!`, {
                  id: toastId,
                  description: `Goal: "${goalText}" (${target} target)`,
                  action: {
                    label: "View Goals",
                    onClick: () => router.push("/weekly-goals"),
                  },
                  duration: 6000,
                })
              } else if (actionType === "sync-sheets") {
                const syncRes = await fetch("/api/integrations/google-sheets/sync", {
                  method: "POST",
                })
                const syncData = await syncRes.json().catch(() => ({}))
                if (!syncRes.ok) {
                  if (syncRes.status === 400 && syncData.error?.toLowerCase().includes("webhook")) {
                    toast.error("Google Sheets Webhook Not Configured", {
                      id: toastId,
                      description: "Connect your Google Sheet in Integrations settings.",
                      action: {
                        label: "Configure",
                        onClick: () => router.push("/integrations"),
                      },
                      duration: 7000,
                    })
                    return
                  }
                  throw new Error(syncData.error || "Failed to sync applications to Google Sheets")
                }

                toast.success(`Synced ${syncData.count ?? 0} applications to Google Sheets!`, {
                  id: toastId,
                  duration: 5000,
                })
              } else if (actionType === "note") {
                const noteTitle = url.searchParams.get("title") || `${company || "Career Advice"} Notes`
                const noteRes = await fetch("/api/prep-notes", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: noteTitle,
                    content: message.content,
                    companyName: company || null,
                    category: "INTERVIEW_QA",
                  }),
                })

                if (!noteRes.ok) {
                  const errJson = await noteRes.json().catch(() => ({}))
                  throw new Error(errJson.error || "Failed to save note")
                }

                toast.success("Saved to Revision Notes!", {
                  id: toastId,
                  description: noteTitle,
                  action: {
                    label: "View Notes",
                    onClick: () => router.push("/interview-prep"),
                  },
                  duration: 5000,
                })
              } else if (actionType === "add") {
                const currentContent = message.content ? `[AI Generated Notes & Outreach]\n${message.content}` : null

                const addRes = await fetch("/api/applications", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    companyName: company,
                    jobTitle: title,
                    source: "AI Assistant",
                    status: status,
                    notes: currentContent,
                    applicationDate: new Date().toISOString(),
                  }),
                })
                if (!addRes.ok) {
                  const errJson = await addRes.json().catch(() => ({}))
                  throw new Error(errJson.error || "Failed to save application")
                }
                const newApp = await addRes.json()

                // Non-blocking background AI fit assessment trigger if content exists
                if (currentContent && newApp?.id) {
                  void fetch(`/api/ai/scan-jd`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      jdText: currentContent,
                      applicationId: newApp.id,
                    }),
                  }).catch(() => {
                    // Non-blocking
                  })
                }

                toast.success(`Tracked ${company} (${title})!`, { 
                  id: toastId,
                  description: `Status: ${status} • Notes & outreach draft auto-saved.`,
                  action: {
                    label: "View in Board",
                    onClick: () => router.push(`/applications/${newApp.id}`),
                  },
                  duration: 6000,
                })
              }
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : "Failed to execute action"
              toast.error(msg, { id: toastId })
            }
          }
          
          return (
            <button
              onClick={handleActionClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs border border-primary/20 my-2 cursor-pointer shadow-none transition-all duration-150 active:scale-95 not-prose"
            >
              <ActionIcon className="h-3.5 w-3.5 shrink-0" />
              <span>{children}</span>
            </button>
          )
        }

        return (
          <Link href={path} className="text-primary hover:underline font-medium inline-flex items-center gap-1">
            <span>{children}</span>
          </Link>
        )
      }

      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      )
    },
    table: ({ children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) => (
      <div className="my-4 w-full overflow-x-auto rounded-[6px] border border-border">
        <table className="w-full text-left text-xs" {...props}>{children}</table>
      </div>
    ),
    th: ({ children, ...props }: React.ThHTMLAttributes<HTMLTableHeaderCellElement>) => (
      <th className="border-b border-border bg-muted/60 px-3.5 py-2.5 font-semibold text-muted-foreground text-xs" {...props}>{children}</th>
    ),
    td: ({ children, ...props }: React.TdHTMLAttributes<HTMLTableDataCellElement>) => (
      <td className="border-b border-border/60 px-3.5 py-2.5 align-top last:border-0 text-xs text-foreground" {...props}>{children}</td>
    ),
    pre: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => {
      // If the child is a custom interactive block (suggestions, analysis, outreach, toolchips, etc.), unwrap it directly
      if (React.isValidElement(children)) {
        const childProps = children.props as { className?: string; children?: React.ReactNode } | undefined
        const className = childProps?.className || ""
        if (
          className.includes("language-suggestions") ||
          className.includes("language-analysis") ||
          className.includes("language-outreach") ||
          className.includes("language-cover-letter") ||
          className.includes("language-coverletter") ||
          className.includes("language-interview") ||
          className.includes("language-mock-interview") ||
          className.includes("language-tailored-resume") ||
          className.includes("language-resume") ||
          className.includes("language-toolchips") ||
          className.includes("language-tools") ||
          className.includes("language-streaming") ||
          className.includes("language-mermaid")
        ) {
          return <>{children}</>
        }

        // Also unwrap if language-json or language-js matches an interactive domain schema
        if (className.includes("language-json") || className.includes("language-js")) {
          const rawCode = typeof childProps?.children === "string" ? childProps.children : ""
          if (rawCode) {
            try {
              const parsed = JSON.parse(rawCode)
              if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                const isInteractiveSchema =
                  (Boolean(parsed.companyName || parsed.role || parsed.interviewType || parsed.turns || parsed.topics) &&
                    Boolean(
                      parsed.interviewType ||
                      parsed.turns ||
                      (Array.isArray(parsed.topics) && parsed.topics.length > 0) ||
                      parsed.summary?.toLowerCase().includes("interview") ||
                      parsed.summary?.toLowerCase().includes("spoken") ||
                      parsed.summary?.toLowerCase().includes("simulation")
                    )) ||
                  Boolean(parsed.subject && parsed.body && (parsed.format || parsed.companyName || parsed.isEmailDraft)) ||
                  Boolean(parsed.matchScore !== undefined && (parsed.verdict || parsed.whyThisScore || parsed.missingGaps || parsed.scoreBreakdown)) ||
                  Boolean((parsed.matchScore !== undefined || Array.isArray(parsed.highlights)) && (parsed.tailoredResume || parsed.optimizations || parsed.role))

                if (isInteractiveSchema) {
                  return <>{children}</>
                }
              }
            } catch {
              // keep default pre
            }
          }
        }
      }

      const extractText = (node: React.ReactNode): string => {
        if (!node) return ""
        if (typeof node === "string" || typeof node === "number") return String(node)
        if (Array.isArray(node)) return node.map(extractText).join("")
        if (React.isValidElement(node) && node.props && typeof node.props === "object" && "children" in node.props) {
          return extractText((node.props as { children?: React.ReactNode }).children)
        }
        return ""
      }
      const textContent = extractText(children)

      const handleCopy = () => {
        navigator.clipboard.writeText(textContent)
        toast.success("Copied to clipboard!")
      }

      return (
        <div className="relative group my-4 not-prose">
          <button
            onClick={handleCopy}
            className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded-sm bg-background/90 text-muted-foreground hover:text-foreground border border-border shadow-xs z-10 cursor-pointer"
            title="Copy code"
            aria-label="Copy code block to clipboard"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <pre className="whitespace-pre-wrap break-words rounded-[6px] border border-border bg-muted/40 text-foreground p-3.5 text-xs font-mono leading-relaxed overflow-x-auto shadow-none" {...props}>
            {children}
          </pre>
        </div>
      )
    },
    code: ({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) => {
      const isInline = !className || !className.includes("language-")

      if (className && (className === "language-mermaid" || className.includes("language-mermaid"))) {
        return <MermaidDiagram code={String(children)} />
      }
      
      if (className === "language-analysis") {
        const rawText = String(children)
        let rawData: Record<string, unknown> = {}
        try {
          rawData = JSON.parse(rawText)
        } catch {
          return (
            <div className="my-3 p-4 border border-border bg-muted/30 text-xs rounded-none">
              <div className="font-semibold text-foreground mb-2">Match Analysis</div>
              <pre className="whitespace-pre-wrap text-muted-foreground font-mono text-xs">{getAnalysisContent(rawText)}</pre>
            </div>
          )
        }
        return (
          <div className="my-3 not-prose">
            <AnalysisResult data={rawData} />
          </div>
        )
      }
      if (className === "language-interview" || className === "language-mock-interview") {
        const rawText = String(children)
        let rawData: Record<string, unknown> = {}
        try {
          rawData = JSON.parse(rawText)
        } catch {
          const entity = extractTargetEntity(message.content, message.toolInvocations)
          rawData = {
            summary: rawText,
            companyName: entity.company || "Target Company",
            role: entity.role || "Software Engineer",
          }
        }
        return (
          <div className="my-3 not-prose">
            <MockInterviewResult data={rawData} />
          </div>
        )
      }

      // Auto-promotion: When LLM outputs ```json or ```js representing domain schemas
      if (className === "language-json" || className === "language-js") {
        const rawText = String(children).trim()
        try {
          const parsed = JSON.parse(rawText)
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            // 1. Mock Interview Schema detection
            const isInterview =
              Boolean(parsed.companyName || parsed.role || parsed.interviewType || parsed.turns || parsed.topics) &&
              Boolean(
                parsed.interviewType ||
                parsed.turns ||
                (Array.isArray(parsed.topics) && parsed.topics.length > 0) ||
                parsed.summary?.toLowerCase().includes("interview") ||
                parsed.summary?.toLowerCase().includes("simulation") ||
                parsed.summary?.toLowerCase().includes("spoken")
              )
            if (isInterview) {
              return (
                <div className="my-3 not-prose">
                  <MockInterviewResult data={parsed} />
                </div>
              )
            }

            // 2. Outreach Email Draft Schema detection
            const isOutreach = Boolean(parsed.subject && parsed.body && (parsed.format || parsed.companyName || parsed.isEmailDraft))
            if (isOutreach) {
              const hasToolOutreach = message.toolInvocations?.some(
                (t) => t.toolName === "draftOutreachEmail" && t.state === "result" && Boolean(t.result)
              )
              if (!hasToolOutreach) {
                return (
                  <div className="my-3 not-prose">
                    <OutreachResult data={parsed} />
                  </div>
                )
              }
            }

            // 3. JD Match Analysis Schema detection
            const isAnalysis = parsed.matchScore !== undefined && (parsed.verdict || parsed.whyThisScore || parsed.missingGaps || parsed.scoreBreakdown)
            if (isAnalysis) {
              return (
                <div className="my-3 not-prose">
                  <AnalysisResult data={parsed} />
                </div>
              )
            }

            // 4. Tailored Resume Schema detection
            const isResume = (parsed.matchScore !== undefined || Array.isArray(parsed.highlights)) && (parsed.tailoredResume || parsed.optimizations || parsed.role)
            if (isResume) {
              return (
                <div className="my-3 not-prose">
                  <TailoredResumeResult data={parsed} />
                </div>
              )
            }
          }
        } catch {
          // not valid JSON, proceed to standard code block
        }
      }

      if (className === "language-tailored-resume" || className === "language-resume") {
        const rawText = String(children)
        let rawData: Record<string, unknown> = {}
        try {
          rawData = JSON.parse(rawText)
        } catch {
          const entity = extractTargetEntity(message.content, message.toolInvocations)
          rawData = {
            summary: rawText,
            companyName: entity.company || "Target Company",
            role: entity.role || "Software Engineer",
          }
        }
        return (
          <div className="my-3 not-prose">
            <TailoredResumeResult data={rawData} />
          </div>
        )
      }
      if (className === "language-outreach") {
        const hasToolOutreach = message.toolInvocations?.some(
          (t) => t.toolName === "draftOutreachEmail" && t.state === "result" && Boolean(t.result)
        )
        if (hasToolOutreach) {
          return null
        }

        const rawText = String(children)
        let rawData: Record<string, unknown> = {}
        try {
          rawData = JSON.parse(rawText)
        } catch {
          const subjectMatch = rawText.match(/Subject:\s*([^\n]+)/i)
          const subject = subjectMatch ? subjectMatch[1].trim() : "Job Application Outreach"
          const body = rawText.replace(/Subject:\s*[^\n]+\n*/i, "").trim()
          rawData = {
            subject,
            body: body || rawText,
            format: "Email Outreach Draft",
            isEmailDraft: true,
          }
        }
        return (
          <div className="my-3 not-prose">
            <OutreachResult data={rawData} />
          </div>
        )
      }
      if (className === "language-cover-letter" || className === "language-coverletter") {
        const rawText = String(children)
        const entity = extractTargetEntity(message.content, message.toolInvocations)
        return (
          <div className="my-3 not-prose">
            <CoverLetterResult
              content={rawText}
              companyName={entity.company}
              role={entity.role}
            />
          </div>
        )
      }
      if (className === "language-toolchips" || className === "language-tools") {
        try {
          const data = JSON.parse(String(children))
          return (
            <div className="my-3 not-prose">
              <ToolChips
                rows={data.rows}
                diffs={data.diffs}
                diffLines={data.diffLines}
                initialOpen={data.open ?? true}
              />
            </div>
          )
        } catch {
          return (
            <div className="my-3 not-prose">
              <ToolChips initialOpen={true} />
            </div>
          )
        }
      }
      if (className === "language-streaming") {
        try {
          const data = JSON.parse(String(children))
          return (
            <div className="my-3 not-prose">
              <StreamingText
                tokens={data.tokens}
                text={data.text}
                sources={data.sources}
                followUps={data.followUps}
                onFollowUpClick={onSuggestionClick}
              />
            </div>
          )
        } catch {
          return (
            <div className="my-3 not-prose">
              <StreamingText onFollowUpClick={onSuggestionClick} />
            </div>
          )
        }
      }
      if (className === "language-suggestions") {
        const rawText = String(children)
        let parsedSuggestions: { label?: string; prompt?: string }[] = []
        try {
          const parsed = JSON.parse(rawText)
          if (Array.isArray(parsed)) {
            parsedSuggestions = parsed
          } else if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
            parsedSuggestions = parsed.suggestions
          }
        } catch {
          const regex = /"([^"]+)"/g
          let match
          while ((match = regex.exec(rawText)) !== null) {
            if (match[1] !== "suggestions" && !match[1].startsWith("[")) {
              parsedSuggestions.push({ label: match[1], prompt: match[1] })
            }
          }
        }
        if (parsedSuggestions.length === 0) return null
        return (
          <FollowUpsList
            items={parsedSuggestions.map((s) => ({
              label: s.label || s.prompt || "",
              prompt: s.prompt || s.label || "",
              icon: "",
            }))}
            onPick={onSuggestionClick}
          />
        )
      }
      return <code className={cn(className, isInline ? "text-primary bg-muted px-1.5 py-0.5 rounded text-xs font-mono font-medium" : "text-zinc-800 dark:text-zinc-100 font-mono text-xs")} {...props}>{children}</code>
    }
  }), [onSuggestionClick, message.content, message.toolInvocations, router])

  if (isUser) {
    if (isEditing) {
      return (
        <div className="flex w-full justify-end my-2">
          <div className="flex flex-col items-end w-full max-w-[85%] sm:max-w-[75%] space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  if (editText.trim() && editText.trim() !== message.content) {
                    setIsEditing(false)
                    onEdit?.(message.id, editText.trim())
                  }
                } else if (e.key === "Escape") {
                  setIsEditing(false)
                  setEditText(message.content)
                }
              }}
              rows={Math.min(6, Math.max(2, editText.split("\n").length))}
              className="w-full bg-background border border-border rounded-xl p-3 text-xs sm:text-sm text-foreground outline-none resize-y min-h-[60px] focus:ring-1 focus:ring-primary focus:border-primary shadow-xs"
              autoFocus
            />
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setEditText(message.content)
                }}
                className="px-3 py-1 text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer rounded-md active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!editText.trim() || editText.trim() === message.content}
                onClick={() => {
                  setIsEditing(false)
                  onEdit?.(message.id, editText.trim())
                }}
                className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer rounded-md active:scale-95"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-end w-full my-1.5 group select-text">
        {/* User Pill Bubble - Clean pill with tap-to-toggle for actions on mobile */}
        <div
          onClick={() => setShowActions((prev) => !prev)}
          className="max-w-[85%] sm:max-w-[75%] rounded-2xl sm:rounded-3xl px-4 py-2 sm:px-4.5 sm:py-2.5 text-xs sm:text-[13.5px] font-normal bg-blue-600 dark:bg-blue-600 text-white shadow-xs break-words whitespace-pre-wrap leading-relaxed tracking-normal cursor-pointer active:scale-[0.99] transition-transform"
        >
          {message.content}
        </div>

        {/* Hover / Tap Action Bar Underneath - Aligned to right of the pill */}
        {!isStreaming && (
          <div
            className={cn(
              "flex items-center gap-0.5 mt-1 mr-1 text-muted-foreground transition-opacity duration-150 not-prose",
              showActions
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
            )}
          >
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(message.content)
                setCopied(true)
                toast.success("Copied to clipboard")
                setTimeout(() => setCopied(false), 2000)
              }}
              className="flex size-7 items-center justify-center rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Copy"
              aria-label="Copy message"
            >
              {copied ? (
                <Check className="size-3.5 text-emerald-500" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>

            {onRetry && (
              <button
                type="button"
                onClick={() => onRetry(message.id)}
                className="flex size-7 items-center justify-center rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Retry"
                aria-label="Retry message"
              >
                <RotateCcw className="size-3.5" />
              </button>
            )}

            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(true)
                  setEditText(message.content)
                }}
                className="flex size-7 items-center justify-center rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Edit"
                aria-label="Edit message"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  const showAvatar =
    Boolean(message.content) ||
    (message.toolInvocations && message.toolInvocations.length > 0) ||
    (message.plan && message.plan.length > 0) ||
    Boolean(message.interruptData)

  return (
    <div className="flex gap-3 w-full group justify-start my-1.5">
      {showAvatar && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-primary/10 border border-primary/20 text-primary mt-0.5 shadow-none" aria-hidden="true">
          <MessageSquare className="h-3.5 w-3.5" />
        </div>
      )}
      
      <div
        className={cn(
          "prose prose-sm dark:prose-invert max-w-none flex-1 min-w-0 pt-0.5",
          "prose-p:leading-relaxed prose-p:my-0",
          "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
          "prose-ul:list-[circle] prose-ul:my-2 prose-li:my-1",
          "prose-headings:text-foreground prose-headings:mb-2 prose-headings:mt-4 first:prose-headings:mt-0",
          "prose-strong:text-foreground prose-strong:font-semibold font-normal",
          "prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground"
        )}
      >
        {/* Reasoning / Thought Process Accordion */}
        {message.reasoning && (
          <div className="mb-1">
            <LoadingState reasoning={message.reasoning} isFinished={!isStreaming} />
          </div>
        )}

        {/* Multi-Step Execution Plan (shown only when concrete tools are executed) */}
        {message.plan &&
          message.plan.length > 0 &&
          message.plan.some((s) => Boolean(s.toolName) && s.toolName !== "null") && (
          <div className="my-2 p-2.5 bg-muted/30 border border-border font-sans text-xs space-y-1.5 not-prose">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between border-b border-border/50 pb-1">
              <span>Agent Execution Plan ({message.plan.filter((p) => p.status === "completed").length}/{message.plan.length})</span>
              {isStreaming && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />}
            </div>
            <div className="space-y-1 pt-0.5">
              {message.plan.map((step, idx) => (
                <div key={step.id || idx} className="flex items-center gap-2 text-[11px]">
                  <span className="font-mono text-muted-foreground text-[10px] w-4 shrink-0">{idx + 1}.</span>
                  <span className={cn(
                    "flex-1 truncate",
                    step.status === "completed" && "text-muted-foreground line-through opacity-75",
                    (step.status === "in_progress" || (step.status as string) === "running") && "text-foreground font-semibold",
                    step.status === "pending" && "text-muted-foreground/70"
                  )}>
                    {step.task || step.toolName || "Executing Step"}
                  </span>
                  <span className={cn(
                    "text-[10px] font-mono px-1.5 py-0.5 rounded uppercase shrink-0 font-medium",
                    step.status === "completed" && "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
                    (step.status === "in_progress" || (step.status as string) === "running") && "bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse",
                    step.status === "failed" && "bg-rose-500/10 text-rose-500 border border-rose-500/20",
                    step.status === "pending" && "bg-muted text-muted-foreground border border-border"
                  )}>
                    {step.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tool Calls - Terminal Style */}
        {message.toolInvocations && message.toolInvocations.length > 0 && (
          <div className="mb-2">
            <LoadingState
              toolInvocations={message.toolInvocations}
              isFinished={!isStreaming}
            />
            {message.toolInvocations.map((tool: ToolInvocation, idx: number) => (
              <React.Fragment key={idx}>
                {tool.state === 'result' && tool.toolName === 'draftOutreachEmail' && Boolean(tool.result) && (
                  <div className="my-2">
                    <OutreachResult data={tool.result as Record<string, unknown>} />
                  </div>
                )}
                {tool.state === 'result' && Boolean((tool.result as Record<string, unknown>)?.requiresConfirmation) && isLast && (
                  <HITLConfirmForm
                    toolName={tool.toolName}
                    args={tool.args || {}}
                    message={(tool.result as Record<string, unknown>).message as string}
                    onConfirm={(modifiedArgs: Record<string, unknown>) => onToolConfirm?.(tool.toolName, modifiedArgs, "APPROVE")}
                    onCancel={() => onToolConfirm?.(tool.toolName, {}, "REJECT")}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Human-in-the-Loop Interrupt Form from LangGraph */}
        {message.interruptData && isLast && (
          <div className="my-2">
            <HITLConfirmForm
              toolName={String(message.interruptData.toolName || message.interruptData.action || "confirm_action")}
              args={(message.interruptData.args || message.interruptData.input || {}) as Record<string, unknown>}
              message={String(message.interruptData.message || "The agent requires your confirmation before proceeding with this action.")}
              onConfirm={(modifiedArgs: Record<string, unknown>) =>
                onToolConfirm?.(
                  String(message.interruptData?.toolName || message.interruptData?.action || "confirm_action"),
                  modifiedArgs,
                  "APPROVE"
                )
              }
              onCancel={() =>
                onToolConfirm?.(
                  String(message.interruptData?.toolName || message.interruptData?.action || "confirm_action"),
                  {},
                  "REJECT"
                )
              }
            />
          </div>
        )}

        {message.content?.trim() ? (
          <>
            <div className="relative">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {(() => {
                  let text = message.content || ""
                  if (isStreaming) {
                    // Hide unclosed ```suggestions block while streaming to prevent flickering / jumping
                    text = text.replace(/```suggestions[\s\S]*$/i, "").trim()
                  }
                  return text
                })()}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-1.5 h-3.5 ml-1 bg-primary/70 rounded-xs animate-pulse align-middle" />
              )}
            </div>

            {/* Smart Action Bar & Follow-ups */}
            {!isStreaming && message.content?.trim() && (
              <div className="mt-3 not-prose">
                {/* Action Icons Row */}
                <div className="flex items-center gap-1 text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(message.content)
                      setCopied(true)
                      toast.success("Copied to clipboard")
                      setTimeout(() => setCopied(false), 2000)
                    }}
                    className="flex size-7 items-center justify-center rounded-md hover:bg-muted/80 hover:text-foreground transition-colors cursor-pointer"
                    title="Copy message"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="12" height="12" rx="2.5" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveToNotes}
                    disabled={isSavingNote}
                    className={cn(
                      "flex size-7 items-center justify-center rounded-md hover:bg-muted/80 transition-colors cursor-pointer",
                      isNoteSaved ? "text-primary hover:text-primary" : "hover:text-foreground"
                    )}
                    title={isNoteSaved ? "Saved to Revision Notes" : "Save to Revision Notes"}
                    aria-label="Save to Revision Notes"
                  >
                    {isSavingNote ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    ) : isNoteSaved ? (
                      <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Bookmark className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {onRetry && (
                    <button
                      type="button"
                      onClick={() => onRetry(message.id)}
                      className="flex size-7 items-center justify-center rounded-md hover:bg-muted/80 hover:text-foreground transition-colors cursor-pointer"
                      title="Regenerate response"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
                      </svg>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => toast.success("Thank you for the feedback!")}
                    className="flex size-7 items-center justify-center rounded-md hover:bg-muted/80 hover:text-foreground transition-colors cursor-pointer"
                    title="Helpful response"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 10v12M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => toast.info("Feedback recorded")}
                    className="flex size-7 items-center justify-center rounded-md hover:bg-muted/80 hover:text-foreground transition-colors cursor-pointer"
                    title="Unhelpful response"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 14V2M9 18.12L10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88z" />
                    </svg>
                  </button>
                </div>

                {/* Follow-ups Section */}
                {suggestions.length > 0 && onSuggestionClick && (
                  <FollowUpsList items={suggestions} onPick={onSuggestionClick} />
                )}
              </div>
            )}
          </>
        ) : isStreaming ? (
          <div className="py-1">
            <LoadingState
              label={message.status || undefined}
              reasoning={message.reasoning}
              toolInvocations={message.toolInvocations}
              isFinished={false}
            />
          </div>
        ) : (
          <div className="py-2.5 px-3 rounded-md bg-muted/40 border border-border/70 text-xs text-muted-foreground flex items-center justify-between gap-3 not-prose">
            <span>No response text recorded.</span>
            {onRetry && (
              <button
                type="button"
                onClick={() => onRetry(message.id)}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-sm border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
