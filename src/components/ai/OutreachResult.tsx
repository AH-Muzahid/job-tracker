"use client"
import React, { useState } from "react"
import { Check, Copy } from "lucide-react"

interface OutreachData {
  format?: string
  subject?: string
  body?: string
  checklist?: string[]
}

export default function OutreachResult({ data }: { data: Record<string, unknown> }) {
  const outreach = data as unknown as OutreachData
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!outreach.body) return
    navigator.clipboard.writeText(outreach.body)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!outreach.body) return null

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2.5">
        <div className="text-sm font-medium text-foreground">
          {outreach.format || "Outreach Template"}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-500" />
              <span className="text-green-500">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      
      <div className="p-4 space-y-4">
        {outreach.subject && (
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject</span>
            <p className="text-sm font-medium">{outreach.subject}</p>
          </div>
        )}
        
        <div className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Body</span>
          <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90 leading-relaxed bg-transparent p-0 m-0 border-0">
            {outreach.body}
          </pre>
        </div>

        {outreach.checklist && outreach.checklist.length > 0 && (
          <div className="pt-3 border-t">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Checklist</span>
            <ul className="space-y-1">
              {outreach.checklist.map((item, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
