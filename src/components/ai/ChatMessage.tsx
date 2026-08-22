"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Sparkles, ChevronDown, ChevronUp, Copy } from "lucide-react"
import { toast } from "sonner"
import AnalysisResult from "./AnalysisResult"
import OutreachResult from "./OutreachResult"
import { type ToolInvocation } from "./AIChat"

interface Props {
  message: { id: string; role: string; content: string; toolInvocations?: ToolInvocation[] }
  isLast: boolean
  isStreaming: boolean
}

export default function ChatMessage({ message, isStreaming }: Props) {
  const isUser = message.role === "user"
  const isLongMessage = isUser && message.content && message.content.length > 250
  const [isExpanded, setIsExpanded] = useState(false)

  // Custom renderer overrides for ReactMarkdown to handle interactive AI actions
  const mdComponents = {
    a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
      if (href && href.startsWith("/actions/")) {
        const url = new URL(href, "http://localhost")
        const actionType = url.pathname.replace("/actions/", "")
        
        const handleActionClick = async () => {
          const company = url.searchParams.get("company")
          const status = url.searchParams.get("status")
          const title = url.searchParams.get("title")
          
          const toastId = toast.loading(`Running AI action: ${children}...`)
          
          try {
            if (actionType === "status") {
              const searchRes = await fetch(`/api/applications?search=${encodeURIComponent(company || "")}&limit=1`)
              const searchData = await searchRes.json()
              const app = searchData.applications?.[0] || searchData.data?.[0]
              if (!app) throw new Error(`Application for "${company}" not found`)
              
              const updateRes = await fetch(`/api/applications/${app.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
              })
              if (!updateRes.ok) throw new Error()
              toast.success(`Successfully updated ${app.companyName} status to ${status}!`, { id: toastId })
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
              if (!addRes.ok) throw new Error()
              const newApp = await addRes.json()
              toast.success(`Added application for ${company}! Redirecting...`, { id: toastId })
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs border-0 mt-2 cursor-pointer shadow-sm transition-all duration-150 active:scale-95"
          >
            <Sparkles className="h-3 w-3" />
            {children}
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
      <div className="my-6 w-full overflow-y-auto rounded-xl border">
        <table className="w-full text-left text-sm" {...props}>{children}</table>
      </div>
    ),
    th: ({ children, ...props }: React.ThHTMLAttributes<HTMLTableHeaderCellElement>) => (
      <th className="border-b bg-muted/50 px-4 py-3 font-semibold text-muted-foreground" {...props}>{children}</th>
    ),
    td: ({ children, ...props }: React.TdHTMLAttributes<HTMLTableDataCellElement>) => (
      <td className="border-b px-4 py-3 align-top last:border-0" {...props}>{children}</td>
    ),
    pre: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => {
      // Extract text content for copying
      let textContent = ""
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child) && child.props && typeof child.props === "object" && "children" in child.props) {
          textContent = String((child.props as { children?: React.ReactNode }).children)
        }
      })

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
      return <code className={cn(className, isInline && "text-primary bg-muted px-1.5 py-0.5 rounded text-xs")} {...props}>{children}</code>
    }
  }

  return (
    <div className={cn("flex gap-4 w-full", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-start justify-center pt-1">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
      )}
      
      <div
        className={cn(
          "prose prose-sm dark:prose-invert",
          isUser 
            ? "max-w-[85%] sm:max-w-[75%] bg-muted/60 rounded-3xl px-5 py-3" 
            : "max-w-none flex-1 min-w-0 pt-0.5",
          "prose-p:leading-relaxed prose-p:my-0",
          "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
          "prose-ul:list-[circle] prose-ul:my-2 prose-li:my-1",
          "prose-headings:text-foreground prose-headings:mb-2 prose-headings:mt-4 first:prose-headings:mt-0",
          "prose-strong:text-foreground prose-strong:font-semibold font-normal",
          "prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground",
          isUser && "relative pr-10" // Make room for the toggle button
        )}
      >
        {message.toolInvocations && message.toolInvocations.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
            {message.toolInvocations.map((tool: ToolInvocation, idx: number) => (
              <React.Fragment key={idx}>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md border border-border/50 w-fit">
                  {tool.state === 'call' ? (
                    <span className="animate-spin leading-none inline-block h-3.5 w-3.5 border-2 border-primary/40 border-t-primary rounded-full"></span>
                  ) : (
                    <span className="leading-none text-emerald-500 font-bold">✓</span>
                  )}
                  <span className="font-medium">
                    {tool.toolName === 'scrapeJobLink' && "Scanning web page..."}
                    {tool.toolName === 'createApplication' && "Saving to tracker..."}
                    {tool.toolName === 'updateApplicationStatus' && "Updating tracker..."}
                    {tool.toolName === 'searchApplications' && "Searching your database..."}
                    {tool.toolName === 'setWeeklyGoals' && "Setting weekly goals..."}
                    {tool.toolName === 'getResumeSummary' && "Analyzing your resume..."}
                    {tool.toolName === 'getPipelineStats' && "Fetching pipeline stats..."}
                    {tool.toolName === 'getPrepNotes' && "Fetching interview notes..."}
                    {tool.toolName === 'addPrepQuestions' && "Saving prep questions..."}
                    {tool.toolName === 'draftOutreachEmail' && "Drafting email outreach..."}
                    {!['scrapeJobLink', 'createApplication', 'updateApplicationStatus', 'searchApplications', 'setWeeklyGoals', 'getResumeSummary', 'getPipelineStats', 'getPrepNotes', 'addPrepQuestions', 'draftOutreachEmail'].includes(tool.toolName) && `Running ${tool.toolName}...`}
                  </span>
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
                className="absolute bottom-2 right-2 p-1.5 bg-background/50 hover:bg-background/80 text-muted-foreground hover:text-foreground rounded-full transition-colors"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            )}
          </>
        ) : isStreaming && (!message.toolInvocations || message.toolInvocations.length === 0) ? (
          <div className="flex items-center gap-3 h-5 px-1">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary/80"></span>
            </span>
            <span className="text-sm font-medium text-muted-foreground animate-pulse">
              Agent is processing...
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
