"use client"
import React, { useState, useEffect, useRef } from "react"
import { Check, Copy, Send, Mail, Loader2 } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  const userHasEditedRef = useRef(false)

  // Sync props progressively during streaming if user hasn't typed manually
  useEffect(() => {
    if (!userHasEditedRef.current) {
      if (outreach.recipientEmail) setRecipient(outreach.recipientEmail)
      if (outreach.subject) setSubject(outreach.subject)
      if (outreach.body) setBodyText(outreach.body)
    }
  }, [outreach.recipientEmail, outreach.subject, outreach.body])

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
        }),
      })

      let resData: { error?: string; message?: string } = {}
      try {
        resData = await res.json()
      } catch {
        throw new Error(`Server returned error (${res.status})`)
      }

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
    <Card className="rounded-[6px] border border-border bg-card shadow-none overflow-hidden my-3">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/30 px-3.5 py-2.5 space-y-0">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <Mail className="h-4 w-4 text-primary" />
          <CardTitle className="text-xs font-semibold">
            {outreach.format || (outreach.isEmailDraft ? "AI Email Outreach Draft" : "Outreach Template")}
          </CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 text-xs rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label="Copy draft"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500 mr-1" />
              <span className="text-emerald-500">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 mr-1" />
              <span>Copy</span>
            </>
          )}
        </Button>
      </CardHeader>
      
      <CardContent className="p-4 space-y-3.5">
        {/* Recipient Field */}
        <div className="space-y-1">
          <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
            Recipient Email (To)
          </label>
          <input
            type="email"
            placeholder="e.g. recruiter@company.com"
            value={recipient}
            onChange={(e) => {
              userHasEditedRef.current = true
              setRecipient(e.target.value)
            }}
            disabled={isSent || isSending}
            aria-label="Recipient Email"
            className="w-full rounded-sm border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 disabled:opacity-60 transition-colors"
          />
        </div>

        {/* Subject Field */}
        <div className="space-y-1">
          <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => {
              userHasEditedRef.current = true
              setSubject(e.target.value)
            }}
            disabled={isSent || isSending}
            aria-label="Email Subject"
            className="w-full rounded-sm border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:border-foreground/40 disabled:opacity-60 transition-colors"
          />
        </div>
        
        {/* Body Field */}
        <div className="space-y-1">
          <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
            Message Body
          </label>
          <textarea
            rows={6}
            value={bodyText}
            onChange={(e) => {
              userHasEditedRef.current = true
              setBodyText(e.target.value)
            }}
            disabled={isSent || isSending}
            aria-label="Email Body"
            className="w-full rounded-sm border border-border bg-background p-3 text-xs text-foreground leading-relaxed focus:outline-none focus:border-foreground/40 disabled:opacity-60 resize-y transition-colors font-mono"
          />
        </div>

        {/* Action Button */}
        <div className="pt-1 flex items-center justify-between gap-2">
          {outreach.companyName && (
            <Badge variant="outline" className="text-[10px] font-mono border-border rounded-xs">
              Linked to: {outreach.companyName}
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button
              onClick={handleSendEmail}
              disabled={isSending || isSent}
              size="sm"
              className={`h-8 rounded-sm text-xs font-medium shadow-none transition-all cursor-pointer ${
                isSent
                  ? "bg-emerald-600 hover:bg-emerald-600 text-white cursor-default"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }`}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : isSent ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  <span>Dispatched</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  <span>Approve & Send Email</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {outreach.checklist && outreach.checklist.length > 0 && (
          <div className="pt-2.5 border-t border-border/50">
            <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Outreach Checklist
            </span>
            <ul className="space-y-1">
              {outreach.checklist.map((item, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <div className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
