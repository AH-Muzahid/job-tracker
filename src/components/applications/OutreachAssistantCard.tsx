"use client"

import { useState } from "react"
import { Mail, Copy, Check, Send, RotateCcw, CheckSquare, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

  return (
    <Card className="border border-border bg-card/60 backdrop-blur-md shadow-lg overflow-hidden rounded-2xl">
      <CardHeader className="pb-3 border-b border-border/50 bg-secondary/10">
        <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-foreground/85">
          <Mail className="h-4 w-4 text-primary" />
          Outreach Assistant
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {outreachLoading ? (
          <div className="py-6 px-4 space-y-3 flex flex-col items-center justify-center text-center animate-fade-in-up">
            <div className="relative flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <Mail className="absolute h-3.5 w-3.5 text-primary animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-foreground">Drafting High-Impact Outreach</h4>
              <p className="text-[11px] font-mono text-primary animate-pulse">
                Extracting role details & matching your credentials...
              </p>
            </div>
            <div className="w-full max-w-[200px] h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary animate-pulse w-3/4" />
            </div>
          </div>
        ) : outreachDrafts ? (
          <div className="space-y-4">
            {/* Mock Email Composer */}
            <div className="rounded-xl border border-border bg-background/40 overflow-hidden shadow-sm">
              {/* Header Fields */}
              <div className="bg-secondary/20 p-3 border-b border-border space-y-2">
                {/* TO Field */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-12 text-muted-foreground font-semibold text-[10px] uppercase">To:</span>
                  <div className="flex-1 flex gap-2 items-center min-w-0">
                    <span className="text-foreground font-medium bg-background/60 px-2 py-1 rounded border border-border/50 truncate flex-1 select-all text-xs font-mono">
                      {recipientEmail}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleCopyRecipient}
                      className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                      title="Copy email address"
                    >
                      {copiedTo ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                {/* SUBJECT Field */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-12 text-muted-foreground font-semibold text-[10px] uppercase">Subject:</span>
                  <div className="flex-1 flex gap-2 min-w-0">
                    <input
                      value={draftSubject}
                      onChange={(e) => setDraftSubject(e.target.value)}
                      className="flex-1 bg-background text-foreground text-xs h-7 px-2 border border-border/60 rounded focus-visible:ring-1 focus-visible:ring-primary outline-none"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => onCopyToClipboard(draftSubject, "subject")}
                      className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                      title="Copy subject line"
                    >
                      {copiedSubject ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Message Body */}
              <div className="p-3 bg-background/10">
                <div className="flex justify-between items-center mb-1 text-[9px] font-bold text-muted-foreground uppercase">
                  <span>Message Body</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onCopyToClipboard(draftBody, "body")}
                    className="h-5 w-5 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Copy message body"
                  >
                    {copiedBody ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <textarea
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  className="w-full min-h-[180px] max-h-[300px] text-xs bg-transparent text-foreground leading-relaxed outline-none border-0 resize-none font-sans p-1 focus:ring-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                />
              </div>
            </div>

            {/* Before Send Checklist */}
            {outreachDrafts.beforeSendChecklist && outreachDrafts.beforeSendChecklist.length > 0 && (
              <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 space-y-2">
                <h5 className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5" /> Before Sending Checklist
                </h5>
                <div className="space-y-1.5">
                  {outreachDrafts.beforeSendChecklist.map((item: string, idx: number) => (
                    <div key={idx} className="text-[11px] text-foreground/80 leading-relaxed flex items-start gap-2">
                      <span className="text-primary select-none mt-0.5 font-bold">•</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1 border-t border-border/40">
              <Button 
                onClick={onOpenMailClient}
                className="text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer w-full flex items-center justify-center gap-1.5 shadow-md"
              >
                <Send className="h-3.5 w-3.5" /> Send From Native Client
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  onClick={onMarkAppliedManually}
                  className="text-xs h-8 border-border text-foreground hover:bg-secondary cursor-pointer"
                >
                  Mark Applied
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onGenerateOutreach}
                  className="text-xs h-8 border-border text-primary hover:bg-primary/5 cursor-pointer gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> Regenerate
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 space-y-3">
            <p className="text-xs text-muted-foreground leading-normal max-w-[260px] mx-auto">
              Draft personalized emails and cover letters matching your credentials to this job.
            </p>
            <Button 
              size="sm" 
              onClick={onGenerateOutreach} 
              disabled={!analysisExists}
              className="text-xs bg-primary hover:bg-primary/95 text-primary-foreground font-semibold cursor-pointer gap-1.5 shadow-sm"
            >
              <Mail className="h-3.5 w-3.5" /> Draft Outreach Note
            </Button>
            {!analysisExists && (
              <p className="text-[10px] text-muted-foreground/60">Run AI Assessment first to unlock outreach generation.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
