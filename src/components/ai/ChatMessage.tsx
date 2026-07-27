"use client"

import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { User, Sparkles } from "lucide-react"
import { toast } from "sonner"

interface Props {
  message: { id: string; role: string; content: string }
  isLast: boolean
  isStreaming: boolean
}

export default function ChatMessage({ message, isStreaming }: Props) {
  const isUser = message.role === "user"

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
    }
  }

  return (
    <div className={cn("flex gap-4", isUser ? "flex-row" : "flex-row")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-0.5",
          isUser
            ? "bg-foreground/10 text-foreground"
            : "bg-primary text-primary-foreground"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
          {isUser ? "You" : "Assistant"}
        </div>
        <div
          className={cn(
            "prose prose-sm dark:prose-invert max-w-none",
            "prose-p:leading-relaxed prose-p:my-0",
            "prose-pre:bg-muted prose-pre:border prose-pre:rounded-lg",
            "prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-normal",
            "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
            "prose-ul:my-1 prose-li:my-0.5",
            "prose-headings:text-foreground prose-headings:mb-2 prose-headings:mt-4 first:prose-headings:mt-0",
            "prose-strong:text-foreground",
            "prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground"
          )}
        >
          {message.content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {message.content}
            </ReactMarkdown>
          ) : isStreaming ? (
            <span className="inline-flex gap-1">
              <span className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:0ms]" />
              <span className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:150ms]" />
              <span className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:300ms]" />
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
