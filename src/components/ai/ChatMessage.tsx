"use client"

import React, { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Bot, ChevronDown, ChevronUp, Copy, Check, Pencil } from "lucide-react"
import { toast } from "sonner"
import AnalysisResult from "./AnalysisResult"
import OutreachResult from "./OutreachResult"
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

function getContextualSuggestions(content: string): Suggestion[] {
  const lower = content.toLowerCase()
  // If it's a short greeting or casual conversation, never dump generic buttons
  if (content.length < 120 && (lower.includes("hi") || lower.includes("hello") || lower.includes("hey") || lower.includes("good") || lower.includes("welcome"))) {
    return []
  }

  const list: Suggestion[] = []

  if (lower.includes("analysis") || lower.includes("match score") || lower.includes("requirements") || lower.includes("verdict")) {
    list.push({
      icon: "",
      label: "Draft Tailored Cover Letter",
      prompt: "Write a customized cover letter for this role focusing on my relevant skills and projects.",
    })
    list.push({
      icon: "",
      label: "5 Interview Questions",
      prompt: "Give me 5 specific technical and behavioral interview questions tailored for this role.",
    })
  } else if (lower.includes("interview") || lower.includes("mock") || lower.includes("assessment")) {
    list.push({
      icon: "",
      label: "Model STAR Answers",
      prompt: "Provide concise, high-scoring STAR method answers for each of these interview questions.",
    })
    list.push({
      icon: "",
      label: "Start Mock Interview",
      prompt: "Let's conduct a live interactive mock interview based on these questions.",
    })
  } else if (lower.includes("resume") || lower.includes("ats")) {
    list.push({
      icon: "",
      label: "Optimize Resume Points",
      prompt: "Rewrite my project bullet points with quantifiable impact metrics for better ATS ranking.",
    })
    list.push({
      icon: "",
      label: "Identify Missing High-Priority Keywords",
      prompt: "Analyze this response and identify any key technical skills or keywords I should emphasize.",
    })
  } else {
    list.push({
      icon: "",
      label: "Elaborate with detailed examples & metrics",
      prompt: "Can you elaborate further with concrete examples and quantifiable impact?",
    })
    list.push({
      icon: "",
      label: "What are the recommended action items?",
      prompt: "What are the recommended action items and next steps from here?",
    })
  }

  return list.slice(0, 3)
}

// Dedicated memoized FollowUps component to eliminate re-renders and animation resets
const FollowUpsList = React.memo(function FollowUpsList({
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
    <div className="mt-3 not-prose space-y-1.5">
      <p className="text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider">
        Follow-up Questions
      </p>
      <div className="flex flex-wrap gap-2">
        {flattened.map((s, i) => (
          <button
            key={`${s.label}-${i}`}
            type="button"
            onClick={() => onPick?.(s.prompt)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted hover:border-border/80 cursor-pointer shadow-2xs active:scale-95"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-muted-foreground"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
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


export default function ChatMessage({ message, isLast, isStreaming, onSuggestionClick, onRetry, onToolConfirm, onEdit }: Props) {
  const isUser = message.role === "user"
  const isLongMessage = isUser && message.content && message.content.length > 250
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(message.content)
  
  const hasEmbeddedSuggestions = Boolean(message.content && message.content.includes("```suggestions"))
  
  const suggestions = React.useMemo(() => {
    return !isUser && isLast && !isStreaming && message.content && !hasEmbeddedSuggestions
      ? getContextualSuggestions(message.content)
      : []
  }, [isUser, isLast, isStreaming, message.content, hasEmbeddedSuggestions])

  // Custom renderer overrides for ReactMarkdown with stable useMemo
  const mdComponents = React.useMemo(() => ({
    a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
      if (href && (href.startsWith("/applications/") || href === "/applications")) {
        return (
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 px-3 py-1 my-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 font-medium text-xs no-underline transition-all hover:shadow-xs group/btn cursor-pointer"
          >
            <span>{children}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover/btn:translate-x-0.5">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </Link>
        )
      }

      if (href && href.startsWith("/actions/")) {
        const url = new URL(href, "http://localhost")
        const actionType = url.pathname.replace("/actions/", "")
        
        const handleActionClick = async () => {
          const company = url.searchParams.get("company")?.trim()
          const status = url.searchParams.get("status")?.trim() || "Saved"
          const title = url.searchParams.get("title")?.trim() || "Software Engineer"
          
          if (!company) {
            toast.error("Company name is required to execute this AI action")
            return
          }

          const toastId = toast.loading(`Processing ${company}...`)
          
          try {
            if (actionType === "status") {
              const searchRes = await fetch(`/api/applications?search=${encodeURIComponent(company)}&limit=1`)
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
                  onClick: () => window.open(`/applications/${app.id}`, "_blank"),
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
                  onClick: () => window.open(`/applications/${newApp.id}`, "_blank"),
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs border border-primary/20 my-2 cursor-pointer shadow-xs transition-all duration-150 active:scale-95 not-prose"
          >
            <Bot className="h-3.5 w-3.5 shrink-0" />
            <span>{children}</span>
          </button>
        )
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      )
    },
    table: ({ children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) => (
      <div className="my-6 w-full overflow-y-auto rounded-xl border border-border/70">
        <table className="w-full text-left text-sm" {...props}>{children}</table>
      </div>
    ),
    th: ({ children, ...props }: React.ThHTMLAttributes<HTMLTableHeaderCellElement>) => (
      <th className="border-b border-border/70 bg-muted/50 px-4 py-3 font-semibold text-muted-foreground text-xs" {...props}>{children}</th>
    ),
    td: ({ children, ...props }: React.TdHTMLAttributes<HTMLTableDataCellElement>) => (
      <td className="border-b border-border/50 px-4 py-3 align-top last:border-0 text-xs" {...props}>{children}</td>
    ),
    pre: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => {
      // If the child is a custom interactive block (suggestions, analysis, outreach, toolchips, etc.), unwrap it directly
      if (React.isValidElement(children)) {
        const childProps = children.props as { className?: string } | undefined
        const className = childProps?.className || ""
        if (
          className.includes("language-suggestions") ||
          className.includes("language-analysis") ||
          className.includes("language-outreach") ||
          className.includes("language-toolchips") ||
          className.includes("language-tools") ||
          className.includes("language-streaming") ||
          className.includes("language-mermaid")
        ) {
          return <>{children}</>
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
            className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md bg-white/90 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 shadow-xs z-10 cursor-pointer"
            title="Copy code"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <pre className="whitespace-pre-wrap break-words rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-100/90 dark:bg-zinc-900/90 text-zinc-800 dark:text-zinc-100 p-4 text-xs font-mono leading-relaxed overflow-x-auto shadow-2xs" {...props}>
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
      if (className === "language-outreach") {
        const rawText = String(children)
        let rawData: Record<string, unknown> = {}
        try {
          rawData = JSON.parse(rawText)
        } catch {
          return (
            <div className="my-3 p-4 border border-border bg-muted/30 text-xs rounded-none">
              <div className="font-semibold text-foreground mb-2">Email Outreach Draft</div>
              <pre className="whitespace-pre-wrap text-muted-foreground font-mono text-xs">{rawText}</pre>
            </div>
          )
        }
        return (
          <div className="my-3 not-prose">
            <OutreachResult data={rawData} />
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
        let suggestions: { label?: string; prompt?: string }[] = []
        try {
          const parsed = JSON.parse(rawText)
          if (Array.isArray(parsed)) {
            suggestions = parsed
          } else if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
            suggestions = parsed.suggestions
          }
        } catch {
          const regex = /"([^"]+)"/g
          let match
          while ((match = regex.exec(rawText)) !== null) {
            if (match[1] !== "suggestions" && !match[1].startsWith("[")) {
              suggestions.push({ label: match[1], prompt: match[1] })
            }
          }
        }
        if (suggestions.length === 0) return null
        return (
          <div className="my-3 flex flex-wrap gap-2 not-prose">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSuggestionClick?.(s.prompt || s.label || "")}
                className="px-3 py-1.5 text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer rounded-none"
              >
                {s.label || s.prompt}
              </button>
            ))}
          </div>
        )
      }
      return <code className={cn(className, isInline ? "text-primary bg-muted px-1.5 py-0.5 rounded text-xs font-mono font-medium" : "text-zinc-800 dark:text-zinc-100 font-mono text-xs")} {...props}>{children}</code>
    }
  }), [onSuggestionClick])

  const showAvatar = !isUser && (Boolean(message.content) || (message.toolInvocations && message.toolInvocations.length > 0))

  return (
    <div className={cn("flex gap-3 w-full group", isUser ? "justify-end" : "justify-start")}>
      {showAvatar && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-500 mt-0.5 shadow-2xs">
          <Bot className="h-3.5 w-3.5" />
        </div>
      )}
      
      <div
        className={cn(
          "prose prose-sm dark:prose-invert",
          isUser 
            ? "max-w-[85%] sm:max-w-[75%] bg-muted/60 border border-border/70 rounded-xl px-3.5 py-2 text-foreground text-xs" 
            : "max-w-none flex-1 min-w-0 pt-0.5",
          "prose-p:leading-relaxed prose-p:my-0",
          "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
          "prose-ul:list-[circle] prose-ul:my-2 prose-li:my-1",
          "prose-headings:text-foreground prose-headings:mb-2 prose-headings:mt-4 first:prose-headings:mt-0",
          "prose-strong:text-foreground prose-strong:font-semibold font-normal",
          "prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground",
          isUser && "relative pr-9" // Make room for the toggle button
        )}
      >
        {/* Reasoning / Thought Process Accordion */}
        {message.reasoning && (
          <div className="mb-1">
            <LoadingState reasoning={message.reasoning} isFinished={!isStreaming} />
          </div>
        )}

        {/* Multi-Step Execution Plan */}
        {message.plan && message.plan.length > 0 && (
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
                    "text-[9px] font-mono px-1.5 py-0.2 rounded uppercase shrink-0 font-medium",
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

        {isEditing ? (
          <div className="flex flex-col gap-2 w-full min-w-[240px]">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground outline-none resize-y min-h-[60px] focus:border-foreground/35"
              autoFocus
            />
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setEditText(message.content)
                }}
                className="px-2.5 py-1 text-[10px] font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer rounded-sm active:scale-95"
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
                className="px-2.5 py-1 text-[10px] font-medium bg-primary text-primary-foreground hover:bg-primary/95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer rounded-sm active:scale-95"
              >
                Save
              </button>
            </div>
          </div>
        ) : message.content ? (
          <>
            <div className={cn(
              "transition-all duration-200 overflow-hidden relative",
              isLongMessage && !isExpanded ? "max-h-[120px]" : "max-h-none"
            )}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {(() => {
                  let text = message.content || ""
                  if (isStreaming && !isUser) {
                    // Hide unclosed ```suggestions block while streaming to prevent flickering / jumping
                    text = text.replace(/```suggestions[\s\S]*$/i, "").trim()
                  }
                  if (isUser) {
                    const parts = text.split("```")
                    if (parts.length === 3 && parts[0].trim() === "" && parts[2].trim() === "") {
                      text = parts[1].replace(/^[a-zA-Z]*\n/, "")
                    }
                  }
                  return text
                })()}
              </ReactMarkdown>
              {isStreaming && !isUser && (
                <span className="inline-block w-1.5 h-3.5 ml-1 bg-primary/70 rounded-xs animate-pulse align-middle" />
              )}
              {isLongMessage && !isExpanded && (
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-muted/60 to-transparent pointer-events-none" />
              )}
            </div>
            
            {isLongMessage && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="absolute bottom-2 right-2 p-1 bg-background/60 hover:bg-background/90 text-muted-foreground hover:text-foreground rounded-full transition-colors"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}

            {/* User message action bar */}
            {isUser && !isStreaming && (
              <div className="flex items-center justify-end gap-1 mt-1.5 not-prose">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(message.content)
                    toast.success("Copied to clipboard")
                  }}
                  className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Copy message"
                >
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </button>
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true)
                      setEditText(message.content)
                    }}
                    className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Edit message"
                  >
                    <Pencil className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                )}
                {onRetry && (
                  <button
                    type="button"
                    onClick={() => onRetry(message.id)}
                    className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Retry this message"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
                    </svg>
                    <span>Retry</span>
                  </button>
                )}
              </div>
            )}

            {/* Smart Action Bar & Follow-ups */}
            {!isUser && !isStreaming && message.content && (
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
              reasoning={message.reasoning}
              toolInvocations={message.toolInvocations}
              isFinished={false}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
