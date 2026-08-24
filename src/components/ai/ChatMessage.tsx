"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Sparkles, ChevronDown, ChevronUp, Copy, Check, CheckCircle2, ArrowUpRight } from "lucide-react"
import { toast } from "sonner"
import AnalysisResult from "./AnalysisResult"
import OutreachResult from "./OutreachResult"
import { type ToolInvocation } from "./AIChat"

interface Props {
  message: { id: string; role: string; content: string; toolInvocations?: ToolInvocation[] }
  isLast: boolean
  isStreaming: boolean
  onSuggestionClick?: (prompt: string) => void
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
      icon: "📝",
      label: "Draft Tailored Cover Letter",
      prompt: "Write a customized cover letter for this role focusing on my relevant skills and projects.",
    })
    list.push({
      icon: "🎯",
      label: "5 Interview Questions",
      prompt: "Give me 5 specific technical and behavioral interview questions tailored for this role.",
    })
  } else if (lower.includes("interview") || lower.includes("mock") || lower.includes("assessment")) {
    list.push({
      icon: "💡",
      label: "Model STAR Answers",
      prompt: "Provide concise, high-scoring STAR method answers for each of these interview questions.",
    })
    list.push({
      icon: "🎤",
      label: "Start Mock Interview",
      prompt: "Let's conduct a live interactive mock interview based on these questions.",
    })
  } else if (lower.includes("resume") || lower.includes("ats")) {
    list.push({
      icon: "✨",
      label: "Optimize Resume Points",
      prompt: "Rewrite my project bullet points with quantifiable impact metrics for better ATS ranking.",
    })
  }

  return list.slice(0, 3)
}

export default function ChatMessage({ message, isLast, isStreaming, onSuggestionClick }: Props) {
  const isUser = message.role === "user"
  const isLongMessage = isUser && message.content && message.content.length > 250
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const hasEmbeddedSuggestions = Boolean(message.content && message.content.includes("```suggestions"))
  const suggestions = !isUser && isLast && !isStreaming && message.content && !hasEmbeddedSuggestions ? getContextualSuggestions(message.content) : []

  // Custom renderer overrides for ReactMarkdown to handle interactive AI actions
  const mdComponents = {
    a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
      if (href && href.startsWith("/actions/")) {
        const url = new URL(href, "http://localhost")
        const actionType = url.pathname.replace("/actions/", "")
        
        const handleActionClick = async () => {
          const company = url.searchParams.get("company")?.trim()
          const status = url.searchParams.get("status")?.trim()
          const title = url.searchParams.get("title")?.trim()
          
          if (!company) {
            toast.error("Company name is required to execute this AI action")
            return
          }

          const toastId = toast.loading(`Executing: ${children}...`)
          
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
              toast.success(`Updated ${app.companyName} status to ${status}!`, { id: toastId })
            } else if (actionType === "add") {
              const addRes = await fetch("/api/applications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  companyName: company,
                  jobTitle: title || "Frontend Engineer",
                  source: "LinkedIn",
                  status: status || "Saved",
                  applicationDate: new Date().toISOString(),
                }),
              })
              if (!addRes.ok) throw new Error("Failed to create application")
              const newApp = await addRes.json()
              toast.success(`Added application for ${company}!`, { id: toastId })
              window.location.href = `/applications/${newApp.id}`
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
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
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
        <div className="relative group my-4">
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md bg-secondary/80 text-secondary-foreground hover:bg-secondary shadow-sm z-10"
            title="Copy code"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <pre className="whitespace-pre-wrap break-words rounded-xl border bg-muted p-4 text-sm" {...props}>
            {children}
          </pre>
        </div>
      )
    },
    code: ({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) => {
      const isInline = !className || !className.includes("language-")
      
      if (className === "language-analysis") {
        try {
          const data = JSON.parse(String(children))
          return (
            <div className="my-4 p-1 rounded-xl bg-gradient-to-br from-primary/10 via-secondary/20 to-background border border-primary/20 shadow-sm">
              <AnalysisResult data={data} />
            </div>
          )
        } catch {
          // If parsing fails, fallback to standard code block
          return <code className={cn(className, isInline && "text-primary bg-muted px-1.5 py-0.5 rounded text-xs")} {...props}>{children}</code>
        }
      }
      if (className === "language-outreach") {
        try {
          const data = JSON.parse(String(children))
          return (
            <div className="my-4">
              <OutreachResult data={data} />
            </div>
          )
        } catch {
          return <code className={cn(className, isInline && "text-primary bg-muted px-1.5 py-0.5 rounded text-xs")} {...props}>{children}</code>
        }
      }
      if (className === "language-suggestions") {
        try {
          const data = JSON.parse(String(children))
          if (Array.isArray(data) && data.length > 0) {
            return (
              <div className="mt-3.5 pt-2.5 border-t border-border/40 flex flex-wrap items-center gap-1.5 not-prose">
                <span className="text-[10px] font-semibold text-muted-foreground/75 flex items-center gap-1 w-full mb-0.5 uppercase tracking-wider">
                  <Sparkles className="h-3 w-3 text-primary" /> Suggested next actions:
                </span>
                {data.map((s: { icon?: string; label: string; prompt: string }, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSuggestionClick?.(s.prompt)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary/40 hover:bg-primary/10 hover:text-primary hover:border-primary/40 border border-border/80 transition-all duration-150 active:scale-95 shadow-xs cursor-pointer text-foreground"
                  >
                    <span>{s.icon || "✨"}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            )
          }
        } catch {
          return null
        }
      }
      return <code className={cn(className, isInline && "text-primary bg-muted px-1.5 py-0.5 rounded text-xs")} {...props}>{children}</code>
    }
  }

  return (
    <div className={cn("flex gap-3 w-full group", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted border border-border/80 text-foreground/80 mt-0.5 shadow-2xs">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
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
        {message.toolInvocations && message.toolInvocations.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
            {message.toolInvocations.map((tool: ToolInvocation, idx: number) => (
              <React.Fragment key={idx}>
                <div className="flex items-center justify-between gap-2.5 text-xs text-foreground bg-secondary/40 backdrop-blur-xs px-3 py-2 rounded-xl border border-border/80 shadow-xs w-full sm:w-fit not-prose">
                  <div className="flex items-center gap-2 min-w-0">
                    {tool.state === 'call' ? (
                      <span className="animate-spin leading-none inline-block h-3.5 w-3.5 border-2 border-primary/40 border-t-primary rounded-full shrink-0"></span>
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    )}
                    <span className="font-medium text-xs truncate">
                      {tool.toolName === 'scrapeJobLink' && "Scanning job details from URL..."}
                      {tool.toolName === 'createApplication' && "Created application in tracker"}
                      {tool.toolName === 'updateApplicationStatus' && "Updated status in tracker"}
                      {tool.toolName === 'deleteApplication' && "Deleted application from tracker"}
                      {tool.toolName === 'syncToGoogleSheets' && "Synced applications to Google Sheet"}
                      {tool.toolName === 'batchImportApplications' && "Batch imported job applications"}
                      {tool.toolName === 'researchCompanyIntel' && "Researched company intelligence"}
                      {tool.toolName === 'sendOutreachEmailViaResend' && "Dispatched email via Resend"}
                      {tool.toolName === 'searchApplications' && "Searched database applications"}
                      {tool.toolName === 'setWeeklyGoals' && "Saved weekly placement goals"}
                      {tool.toolName === 'getResumeSummary' && "Retrieved verified career graph"}
                      {tool.toolName === 'getPipelineStats' && "Fetched conversion metrics"}
                      {tool.toolName === 'getPrepNotes' && "Loaded interview prep notes"}
                      {tool.toolName === 'savePrepNote' && "Saved note to prep workspace"}
                      {tool.toolName === 'recordMockInterviewScore' && "Recorded mock interview evaluation"}
                      {tool.toolName === 'tailorResumeForJob' && "Generated ATS tailored resume"}
                      {tool.toolName === 'addPrepQuestions' && "Saved interview question bank"}
                      {tool.toolName === 'draftOutreachEmail' && "Drafted cold outreach"}
                      {tool.toolName === 'queryCareerKnowledgeGraph' && "Queried Career Knowledge Graph"}
                      {tool.toolName === 'syncCareerKnowledgeGraph' && "Synchronized Knowledge Graph"}
                      {tool.toolName === 'saveUserMemory' && "Saved user preference memory"}
                      {tool.toolName === 'forgetUserMemory' && "Removed outdated memory"}
                      {!['scrapeJobLink', 'createApplication', 'updateApplicationStatus', 'deleteApplication', 'syncToGoogleSheets', 'batchImportApplications', 'researchCompanyIntel', 'sendOutreachEmailViaResend', 'searchApplications', 'setWeeklyGoals', 'getResumeSummary', 'getPipelineStats', 'getPrepNotes', 'savePrepNote', 'recordMockInterviewScore', 'tailorResumeForJob', 'addPrepQuestions', 'draftOutreachEmail', 'queryCareerKnowledgeGraph', 'syncCareerKnowledgeGraph', 'saveUserMemory', 'forgetUserMemory'].includes(tool.toolName) && `Executed ${tool.toolName}`}
                    </span>
                  </div>
                  {tool.state === 'result' && (tool.toolName === 'createApplication' || tool.toolName === 'updateApplicationStatus') && (
                    <a 
                      href="/applications" 
                      className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:underline shrink-0 ml-2"
                    >
                      View Board <ArrowUpRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {tool.state === 'result' && tool.toolName === 'draftOutreachEmail' && Boolean(tool.result) && (
                  <div className="my-2">
                    <OutreachResult data={tool.result as Record<string, unknown>} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {message.content ? (
          <>
            <div className={cn(
              "transition-all duration-200 overflow-hidden relative",
              isLongMessage && !isExpanded ? "max-h-[120px]" : "max-h-none"
            )}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {(() => {
                  let text = message.content
                  if (isUser) {
                    const parts = text.split("```")
                    if (parts.length === 3 && parts[0].trim() === "" && parts[2].trim() === "") {
                      text = parts[1].replace(/^[a-zA-Z]*\n/, "")
                    }
                  }
                  return text
                })()}
              </ReactMarkdown>
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

            {/* Smart Suggested Action Buttons */}
            {suggestions.length > 0 && onSuggestionClick && (
              <div className="mt-3.5 pt-2.5 border-t border-border/40 flex flex-wrap items-center gap-1.5 not-prose">
                <span className="text-[10px] font-semibold text-muted-foreground/75 flex items-center gap-1 w-full mb-0.5 uppercase tracking-wider">
                  <Sparkles className="h-3 w-3 text-primary" /> Suggested next actions:
                </span>
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSuggestionClick(s.prompt)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary/40 hover:bg-primary/10 hover:text-primary hover:border-primary/40 border border-border/80 transition-all duration-150 active:scale-95 shadow-xs cursor-pointer text-foreground"
                  >
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Perplexity-style Assistant Bottom Bar */}
            {!isUser && !isStreaming && message.content && (
              <div className="flex items-center gap-2 mt-3 pt-2 text-[11px] text-muted-foreground/80 not-prose opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(message.content)
                    setCopied(true)
                    toast.success("Answer copied to clipboard")
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-muted/80 hover:text-foreground transition-colors cursor-pointer text-xs"
                  title="Copy answer"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            )}
          </>
        ) : isStreaming && (!message.toolInvocations || message.toolInvocations.length === 0) ? (
          <div className="flex items-center gap-2 h-6 px-1 text-xs text-muted-foreground">
            <span className="animate-spin inline-block h-3.5 w-3.5 border-2 border-muted-foreground/30 border-t-foreground rounded-full"></span>
            <span>Thinking...</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
