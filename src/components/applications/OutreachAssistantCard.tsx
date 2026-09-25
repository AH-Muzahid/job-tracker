"use client"

import { useState } from "react"
import { Mail, Copy, Check, Send, RotateCcw, CheckSquare, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OutreachDrafts } from "./types"

interface OutreachAssistantCardProps {
  analysisExists: boolean
  outreachDrafts: OutreachDrafts | null
  outreachLoading: boolean
  draftSubject: string
  draftBody: string
  copiedSubject: boolean
  copiedBody: boolean
  saveStatus?: "idle" | "saving" | "saved" | "error"
  onManualSave?: () => void
  setDraftSubject: (val: string) => void
  setDraftBody: (val: string) => void
  onGenerateOutreach: () => void
  onOpenMailClient: () => void
  onMarkAppliedManually: () => void
  onCopyToClipboard: (text: string, type: "to" | "subject" | "body") => void
  // pass notes to extract recipient email
  jdNotes?: string
}

export function OutreachAssistantCard({
  analysisExists,
  outreachDrafts,
  outreachLoading,
  draftSubject,
  draftBody,
  copiedSubject,
  copiedBody,
  saveStatus = "idle",
  onManualSave,
  setDraftSubject,
  setDraftBody,
  onGenerateOutreach,
  onOpenMailClient,
  onMarkAppliedManually,
  onCopyToClipboard,
  jdNotes = "",
}: OutreachAssistantCardProps) {
  const [copiedTo, setCopiedTo] = useState(false)

  // Auto extract email address from JD description
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi
  const inferredEmails = jdNotes.match(emailRegex) || []
  const recipientEmail = inferredEmails[0] || "hr@company.com"

  const handleCopyRecipient = () => {
    onCopyToClipboard(recipientEmail, "to")
    setCopiedTo(true)
    setTimeout(() => setCopiedTo(false), 2000)
  }

  if (outreachLoading) {
    return (
      <div className="py-12 px-4 space-y-3 flex flex-col items-center justify-center text-center">
        <div className="relative flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-foreground animate-spin" />
          <Mail className="absolute h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-foreground">Drafting High-Impact Outreach</h4>
          <p className="text-xs text-muted-foreground font-mono">
            Extracting role details & matching your credentials...
          </p>
        </div>
        <div className="w-full max-w-[200px] h-1 rounded-full bg-muted overflow-hidden mt-2">
          <div className="h-full rounded-full bg-foreground animate-pulse w-3/4" />
        </div>
      </div>
    )
  }

  if (!outreachDrafts) {
    return (
      <div className="text-center py-12 px-4 space-y-4 max-w-sm mx-auto">
        <div className="h-10 w-10 rounded-full bg-muted/40 border border-border flex items-center justify-center mx-auto text-muted-foreground">
          <Mail className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-foreground">Tailored Outreach Draft</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Generate an AI-tailored outreach email highlighting your matching skills and portfolio projects for this job.
          </p>
        </div>
        <Button 
          size="sm" 
          onClick={onGenerateOutreach} 
          disabled={!analysisExists}
          className="text-xs sm:text-sm h-8 sm:h-9 rounded-[4px] font-medium cursor-pointer gap-2 shadow-none"
        >
          <Mail className="h-3.5 w-3.5" /> Draft Outreach Email
        </Button>
        {!analysisExists && (
          <p className="text-xs text-muted-foreground/70">Run AI Assessment first to unlock outreach generation.</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Email Composer Container */}
      <div className="rounded-[6px] border border-border bg-background overflow-hidden">
        {/* Recipient Row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border text-sm">
          <span className="w-16 text-muted-foreground font-medium uppercase text-xs shrink-0">To:</span>
          <span className="text-foreground font-mono text-xs sm:text-sm flex-1 truncate select-all">{recipientEmail}</span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleCopyRecipient}
            className="h-8 w-8 rounded-[4px] text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
            title="Copy email address"
          >
            {copiedTo ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {/* Subject Row */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border text-sm">
          <span className="w-16 text-muted-foreground font-medium uppercase text-xs shrink-0">Subject:</span>
          <input
            value={draftSubject}
            onChange={(e) => setDraftSubject(e.target.value)}
            className="flex-1 bg-transparent text-foreground text-xs sm:text-sm h-8 outline-none font-medium"
          />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onCopyToClipboard(draftSubject, "subject")}
            className="h-8 w-8 rounded-[4px] text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
            title="Copy subject line"
          >
            {copiedSubject ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {/* Message Body */}
        <div className="p-4 space-y-2">
          <div className="flex justify-between items-center text-xs sm:text-sm text-foreground font-medium">
            <div className="flex items-center gap-2.5">
              <span>Message Content</span>
              {saveStatus === "saving" && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-mono">
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> Saving...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                  <Check className="h-3 w-3" /> Draft saved to cloud
                </span>
              )}
              {saveStatus === "error" && (
                <span className="inline-flex items-center gap-1 text-xs text-rose-500 font-mono">
                  Cloud save failed
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {onManualSave && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onManualSave}
                  disabled={saveStatus === "saving"}
                  className="h-7 text-xs gap-1 px-2 rounded-[4px] text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Save draft immediately to Postgres"
                >
                  Save
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onCopyToClipboard(draftBody, "body")}
                className="h-7 text-xs gap-1.5 px-2.5 rounded-[4px] text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {copiedBody ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedBody ? "Copied" : "Copy Body"}
              </Button>
            </div>
          </div>
          <textarea
            value={draftBody}
            onChange={(e) => setDraftBody(e.target.value)}
            className="w-full min-h-[220px] max-h-[340px] text-xs sm:text-sm bg-muted/15 p-3.5 rounded-[4px] border border-border text-foreground leading-relaxed outline-none resize-none font-sans focus:border-foreground/30"
          />
        </div>
      </div>

      {/* Before Sending Checklist */}
      {outreachDrafts.beforeSendChecklist && outreachDrafts.beforeSendChecklist.length > 0 && (
        <div className="rounded-[6px] bg-muted/20 border border-border p-4 space-y-2.5">
          <h5 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-foreground" /> Before Sending Checklist
          </h5>
          <div className="space-y-2">
            {outreachDrafts.beforeSendChecklist.map((item: string, idx: number) => (
              <div key={idx} className="text-xs sm:text-sm text-muted-foreground leading-relaxed flex items-start gap-2.5">
                <span className="text-foreground select-none mt-0.5 font-bold">•</span>
                <span className="text-foreground/90">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <Button 
            onClick={onOpenMailClient}
            className="text-xs sm:text-sm h-8 sm:h-9 px-3.5 sm:px-4 rounded-[4px] font-medium cursor-pointer gap-2 shadow-none"
          >
            <Send className="h-3.5 w-3.5" /> Send In Email Client
          </Button>
          <Button 
            variant="outline" 
            onClick={onMarkAppliedManually}
            className="text-xs sm:text-sm h-8 sm:h-9 px-3.5 sm:px-4 rounded-[4px] border-border text-foreground hover:bg-muted/40 cursor-pointer font-medium"
          >
            Mark Applied
          </Button>
        </div>
        <Button 
            variant="ghost" 
            size="sm" 
            onClick={onGenerateOutreach}
            className="text-xs sm:text-sm h-8 sm:h-9 px-3 rounded-[4px] text-muted-foreground hover:text-foreground cursor-pointer gap-1.5 font-medium"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Regenerate Draft
          </Button>
      </div>
    </div>
  )
}
