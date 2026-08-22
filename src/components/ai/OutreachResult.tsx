"use client"
import React, { useState } from "react"
import { Check, Copy, Send, Mail, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface OutreachData {
  format?: string
  subject?: string
  body?: string
  checklist?: string[]
  recipientEmail?: string
  applicationId?: string
  companyName?: string
  isEmailDraft?: boolean
}

export default function OutreachResult({ data }: { data: Record<string, unknown> }) {
  const outreach = data as unknown as OutreachData
  const [copied, setCopied] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [recipient, setRecipient] = useState(outreach.recipientEmail || "")
  const [subject, setSubject] = useState(outreach.subject || "")
  const [bodyText, setBodyText] = useState(outreach.body || "")

  const handleCopy = () => {
    if (!bodyText) return
    navigator.clipboard.writeText(bodyText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendEmail = async () => {
    if (!recipient) {
      toast.error("Please enter a recipient email address")
      return
    }
    if (!subject || !bodyText) {
      toast.error("Subject and body cannot be empty")
      return
    }

    setIsSending(true)
    const toastId = toast.loading(`Dispatching email to ${recipient}...`)

    try {
      const res = await fetch("/api/ai/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipient,
          subject,
          body: bodyText,
          applicationId: outreach.applicationId,
          candidateName: "Candidate",
        }),
      })

      const resData = await res.json()
      if (!res.ok) {
        throw new Error(resData.error || "Failed to send email")
      }

      setIsSent(true)
      toast.success(resData.message || `Email dispatched to ${recipient}!`, { id: toastId })
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to send email"
      toast.error(errorMsg, { id: toastId })
    } finally {
      setIsSending(false)
    }
  }

  if (!outreach.body && !outreach.subject) return null

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all">
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Mail className="h-4 w-4 text-indigo-500" />
          <span>{outreach.format || (outreach.isEmailDraft ? "AI Email Outreach Draft" : "Outreach Template")}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors cursor-pointer"
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
      </div>
      
      <div className="p-4 space-y-4">
        {/* Recipient Field */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Recipient Email (To)
          </label>
          <input
            type="email"
            placeholder="e.g. recruiter@company.com"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            disabled={isSent || isSending}
            className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60"
          />
        </div>

        {/* Subject Field */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={isSent || isSending}
            className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60"
          />
        </div>
        
        {/* Body Field */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Message Body
          </label>
          <textarea
            rows={6}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            disabled={isSent || isSending}
            className="w-full rounded-lg border bg-background p-3 text-sm text-foreground/90 leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60 resize-y"
          />
        </div>

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-between">
          {outreach.companyName && (
            <span className="text-xs text-muted-foreground">
              Linked to: <strong>{outreach.companyName}</strong>
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleSendEmail}
              disabled={isSending || isSent}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-xs shadow-sm transition-all active:scale-95 cursor-pointer ${
                isSent
                  ? "bg-green-600 text-white cursor-default"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
              } disabled:opacity-60`}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : isSent ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Dispatched</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Approve & Send Email</span>
                </>
              )}
            </button>
          </div>
        </div>

        {outreach.checklist && outreach.checklist.length > 0 && (
          <div className="pt-3 border-t">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Outreach Checklist</span>
            <ul className="space-y-1">
              {outreach.checklist.map((item, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500/60" />
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
