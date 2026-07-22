"use client"

import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { User, Sparkles } from "lucide-react"

interface Props {
  message: { id: string; role: string; content: string }
  isLast: boolean
  isStreaming: boolean
}

export default function ChatMessage({ message, isStreaming }: Props) {
  const isUser = message.role === "user"

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
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
