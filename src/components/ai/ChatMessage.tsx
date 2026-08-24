"use client"

import React, { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Bot, ChevronDown, ChevronUp, Copy, Check, ArrowUpRight } from "lucide-react"
import { toast } from "sonner"
import AnalysisResult from "./AnalysisResult"
import OutreachResult from "./OutreachResult"
import ToolChips from "./ToolChips"
import StreamingText from "./StreamingText"
import LoadingState from "./LoadingState"
import { type ToolInvocation } from "./AIChat"

interface Props {
  message: { id: string; role: string; content: string; toolInvocations?: ToolInvocation[] }
  isLast: boolean
  isStreaming: boolean
  onSuggestionClick?: (prompt: string) => void
  onRetry?: () => void
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
      icon: "📄",
      label: "Optimize Resume Points",
      prompt: "Rewrite my project bullet points with quantifiable impact metrics for better ATS ranking.",
    })
    list.push({
      icon: "🔍",
      label: "Identify Missing High-Priority Keywords",
      prompt: "Analyze this response and identify any key technical skills or keywords I should emphasize.",
    })
  } else {
    list.push({
      icon: "💡",
      label: "Elaborate with detailed examples & metrics",
      prompt: "Can you elaborate further with concrete examples and quantifiable impact?",
    })
    list.push({
      icon: "🚀",
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
  items: Array<{ label?: string; prompt?: string } | string>
  onPick?: (prompt: string) => void
}) {
  if (!items || items.length === 0) return null

  return (
    <div className="mt-2.5 not-prose">
      <p className="text-[12px] font-medium text-ink-2">Follow-ups</p>
      <div className="mt-0.5 flex flex-col">
        {items.map((s, i) => {
          const text = typeof s === "string" ? s : s.label || s.prompt || ""
          const promptToSend = typeof s === "string" ? s : s.prompt || s.label || ""
          return (
            <button
              key={text || i}
              type="button"
              onClick={() => onPick?.(promptToSend)}
              className="-mx-1.5 flex items-center gap-2 rounded-[7px] border-b border-line px-1.5 py-1.5 text-left text-[12.5px] text-ink transition-colors duration-100 hover:bg-hover-2 cursor-pointer"
              style={{ animation: `fade-up 350ms cubic-bezier(0.23,1,0.32,1) ${i * 90}ms both` }}
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
                className="shrink-0 text-ink-3"
              >
                <path d="M9 10l-5 5 5 5" />
                <path d="M20 4v7a4 4 0 0 1-4 4H4" />
              </svg>
              <span>{text}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
})

export default function ChatMessage({ message, isLast, isStreaming, onSuggestionClick, onRetry }: Props) {
  const isUser = message.role === "user"
  const isLongMessage = isUser && message.content && message.content.length > 250
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const hasEmbeddedSuggestions = Boolean(message.content && message.content.includes("```suggestions"))
  
  const suggestions = React.useMemo(() => {
    return !isUser && isLast && !isStreaming && message.content && !hasEmbeddedSuggestions
      ? getContextualSuggestions(message.content)
      : []
  }, [isUser, isLast, isStreaming, message.content, hasEmbeddedSuggestions])

  // Custom renderer overrides for ReactMarkdown with stable useMemo
  const mdComponents = React.useMemo(() => ({
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
          className.includes("language-streaming")
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
      
      if (className === "language-analysis") {
        try {
          const data = JSON.parse(String(children))
          return (
            <div className="my-4 p-1 rounded-xl bg-gradient-to-br from-primary/10 via-secondary/20 to-background border border-primary/20 shadow-sm not-prose">
              <AnalysisResult data={data} />
            </div>
          )
        } catch {
          return <code className={cn(className, isInline ? "text-primary bg-muted px-1.5 py-0.5 rounded text-xs font-mono font-medium" : "text-zinc-800 dark:text-zinc-100 font-mono text-xs")} {...props}>{children}</code>
        }
      }
      if (className === "language-outreach") {
        try {
          const data = JSON.parse(String(children))
          return (
            <div className="my-4 not-prose">
              <OutreachResult data={data} />
            </div>
          )
        } catch {
          return <code className={cn(className, isInline ? "text-primary bg-muted px-1.5 py-0.5 rounded text-xs font-mono font-medium" : "text-zinc-800 dark:text-zinc-100 font-mono text-xs")} {...props}>{children}</code>
        }
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
        try {
          const data = JSON.parse(String(children))
          if (Array.isArray(data) && data.length > 0) {
            return <FollowUpsList items={data} onPick={onSuggestionClick} />
          }
        } catch {
          return null
        }
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
        {message.toolInvocations && message.toolInvocations.length > 0 && (
          <div className="mb-3">
            <ToolChips toolInvocations={message.toolInvocations} />
            {message.toolInvocations.map((tool: ToolInvocation, idx: number) => (
              <React.Fragment key={idx}>
                {tool.state === 'result' && (tool.toolName === 'createApplication' || tool.toolName === 'updateApplicationStatus') && (
                  <div className="my-1.5 text-xs">
                    <Link 
                      href="/applications" 
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                    >
                      View Board Application <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
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
                      onClick={onRetry}
                      className="flex size-7 items-center justify-center rounded-md hover:bg-muted/80 hover:text-foreground transition-colors cursor-pointer"
                      title="Retry response"
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
        ) : isStreaming && (!message.toolInvocations || message.toolInvocations.length === 0) ? (
          <div className="py-2">
            <LoadingState label="Thinking" variant="Dots" />
          </div>
        ) : null}
      </div>
    </div>
  )
}
