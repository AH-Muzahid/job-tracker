"use client"

import { useState, useMemo } from "react"
import {
  Mail,
  Copy,
  Check,
  Send,
  RotateCcw,
  CheckSquare,
  Loader2,
  ExternalLink,
  MessageSquare,
  Clock,
  UserCheck,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { OutreachDrafts, OutreachChannel, ScreenerQA } from "./types"
import { extractContactEmail, sanitizeOutreachPlaceholders } from "@/lib/applications/outreach-engine"

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
  onGenerateOutreach: (channel?: OutreachChannel) => void
  onOpenMailClient: (customTo?: string) => void
  onMarkAppliedManually: () => void
  onCopyToClipboard: (text: string, type: "to" | "subject" | "body") => void
  jdNotes?: string
  companyName?: string
  jobTitle?: string
  jobUrl?: string | null
  activeChannel?: OutreachChannel
  onChannelChange?: (channel: OutreachChannel) => void
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
  companyName = "Company",
  jobTitle = "Role",
  jobUrl,
  activeChannel = "email",
  onChannelChange,
}: OutreachAssistantCardProps) {
  const [copiedTo, setCopiedTo] = useState(false)
  const [customRecipient, setCustomRecipient] = useState("")
  const [copiedQAs, setCopiedQAs] = useState<Record<number, boolean>>({})

  // Extract real contact email from notes (ignoring fake dummy emails)
  const detectedEmail = useMemo(() => {
    return outreachDrafts?.detectedEmail || extractContactEmail(jdNotes) || null
  }, [outreachDrafts?.detectedEmail, jdNotes])

  const recipientEmail = customRecipient.trim() || detectedEmail || ""

  const handleCopyRecipient = () => {
    if (!recipientEmail) return
    onCopyToClipboard(recipientEmail, "to")
    setCopiedTo(true)
    setTimeout(() => setCopiedTo(false), 2000)
  }

  const handleCopyQA = (idx: number, answerText: string) => {
    onCopyToClipboard(answerText, "body")
    setCopiedQAs((prev) => ({ ...prev, [idx]: true }))
    setTimeout(() => {
      setCopiedQAs((prev) => ({ ...prev, [idx]: false }))
    }, 2000)
  }

  // Screener questions and answers from strategy
  const screenerAnswers: ScreenerQA[] = useMemo(() => {
    return outreachDrafts?.screenerAnswers || outreachDrafts?.channels?.form_portal?.screenerAnswers || []
  }, [outreachDrafts?.screenerAnswers, outreachDrafts?.channels?.form_portal?.screenerAnswers])

  // Conversion metrics
  const conversionScore = outreachDrafts?.conversionScore ?? outreachDrafts?.conversionJudge?.score ?? null
  const conversionJudge = outreachDrafts?.conversionJudge

  // Active channel details
  const charCount = draftBody.length
  const wordCount = draftBody.trim() ? draftBody.trim().split(/\s+/).length : 0

  // Sanitized view text with zero placeholder guarantee
  const sanitizedDisplayBody = useMemo(() => {
    return sanitizeOutreachPlaceholders(draftBody, {
      companyName,
      jobTitle,
      candidateName: "Candidate",
    })
  }, [draftBody, companyName, jobTitle])

  if (outreachLoading) {
    return (
      <div className="py-12 px-4 space-y-3 flex flex-col items-center justify-center text-center">
        <div className="relative flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-foreground animate-spin" />
          <Mail className="absolute h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-foreground">Drafting Contextual Outreach</h4>
          <p className="text-xs text-muted-foreground font-mono">
            Analyzing {companyName} JD requirements & evaluating conversion readiness...
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
          <h4 className="text-sm font-semibold text-foreground">Contextual Outreach Studio</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Generate 100% placeholder-free outreach materials tailored to {companyName} across Email, LinkedIn InMail, or ATS Screener Q&A.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => onGenerateOutreach()}
          disabled={!analysisExists}
          className="text-xs sm:text-sm h-8 sm:h-9 rounded-[4px] font-medium cursor-pointer gap-2 shadow-none"
        >
          <Mail className="h-3.5 w-3.5" /> Generate Outreach Materials
        </Button>
        {!analysisExists && (
          <p className="text-xs text-muted-foreground/70">Run AI Assessment first to unlock outreach generation.</p>
        )}
      </div>
    )
  }

  const channelTabs: Array<{ id: OutreachChannel; label: string; icon: typeof Mail; badge?: string }> = [
    {
      id: "form_portal",
      label: "ATS Form & Q&A",
      icon: FileText,
      badge: outreachDrafts?.strategy === "form_portal" ? "Recommended" : undefined,
    },
    {
      id: "email",
      label: "Direct Email",
      icon: Mail,
      badge: detectedEmail ? "Email Found" : outreachDrafts?.strategy === "email" ? "Recommended" : undefined,
    },
    {
      id: "linkedin_dm",
      label: "LinkedIn InMail",
      icon: MessageSquare,
      badge: outreachDrafts?.strategy === "linkedin_dm" ? "Recommended" : undefined,
    },
    {
      id: "linkedin_connect",
      label: "Connect Note",
      icon: UserCheck,
      badge: "< 300 char",
    },
    {
      id: "follow_up",
      label: "5-Day Follow-Up",
      icon: Clock,
    },
  ]

  return (
    <div className="space-y-4">
      {/* Strategy Recommendation & Conversion Potential Banner */}
      {outreachDrafts?.strategyReason && (
        <div className="p-3 bg-muted/20 border border-border rounded-[6px] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-start sm:items-center gap-2 min-w-0">
            <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1 sm:mt-0" />
            <div className="text-xs leading-relaxed">
              <span className="font-semibold text-foreground">
                {activeChannel === "form_portal"
                  ? "ATS Application Strategy"
                  : activeChannel === "email"
                  ? "Direct Email Strategy"
                  : activeChannel === "linkedin_dm"
                  ? "LinkedIn Recruiter Strategy"
                  : activeChannel === "linkedin_connect"
                  ? "Connection Note Strategy"
                  : "Follow-Up Strategy"}
                :
              </span>{" "}
              <span className="text-muted-foreground">{outreachDrafts.strategyReason}</span>
            </div>
          </div>
          {conversionScore !== null && (
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
              <div
                className="px-2 py-0.5 rounded-[4px] bg-primary/10 border border-primary/20 text-primary text-[11px] font-mono font-medium flex items-center gap-1"
                title={
                  conversionJudge?.strengths && conversionJudge.strengths.length > 0
                    ? `Conversion drivers: ${conversionJudge.strengths.join("; ")}`
                    : "Evaluated by Virtual Engineering Leader"
                }
              >
                <span className="font-bold">{conversionScore}%</span>
                <span className="text-muted-foreground text-[10px]">Conversion Score</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Multi-Channel Architectural Segmented Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-muted/30 border border-border rounded-[6px] overflow-x-auto max-w-full">
          {channelTabs.map((tab) => {
            const Icon = tab.icon
            const isSelected = activeChannel === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChannelChange?.(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs font-medium rounded-[4px] transition-colors cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? "bg-background text-foreground border border-border shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-[2px] ${
                      tab.badge === "Recommended" || tab.badge === "Email Found"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Ready to Send Indicator */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Zero Placeholders • Ready to Submit</span>
        </div>
      </div>

      {/* Mode-Specific Composers */}
      {activeChannel === "form_portal" ? (
        <div className="space-y-4">
          {/* Section 1: ATS Cover Note / Bio */}
          <div className="rounded-[6px] border border-border bg-background overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <span className="w-20 text-muted-foreground font-medium uppercase text-xs shrink-0">ATS Field:</span>
                <span className="text-foreground font-medium">Cover Letter / Additional Information Note</span>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline-block">
                Optimal: 80–120 words
              </span>
            </div>

            <div className="p-4 space-y-2">
              <div className="flex justify-between items-center text-xs sm:text-sm text-foreground font-medium">
                <div className="flex items-center gap-2.5">
                  <span>Note Content</span>
                  {saveStatus === "saving" && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-mono">
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> Saving...
                    </span>
                  )}
                  {saveStatus === "saved" && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                      <Check className="h-3 w-3" /> Saved to cloud
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline-block">
                    {wordCount} words • {charCount} chars
                  </span>
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
                    onClick={() => onCopyToClipboard(sanitizedDisplayBody, "body")}
                    className="h-7 text-xs gap-1.5 px-2.5 rounded-[4px] text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {copiedBody ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedBody ? "Copied" : "Copy Note"}
                  </Button>
                </div>
              </div>

              <textarea
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                rows={5}
                className="w-full text-xs sm:text-sm bg-muted/15 p-3.5 rounded-[4px] border border-border text-foreground leading-relaxed outline-none resize-none font-sans focus:border-foreground/30"
              />
            </div>
          </div>

          {/* Section 2: Targeted Screener Q&A Answers */}
          {screenerAnswers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h5 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-foreground" /> Targeted Screener Q&A Answers
                  </h5>
                  <p className="text-xs text-muted-foreground">
                    1-click copyable answers tailored to {companyName} screener questions & tech requirements.
                  </p>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-[2px] bg-muted text-muted-foreground">
                  {screenerAnswers.length} Questions
                </span>
              </div>

              <div className="space-y-2.5">
                {screenerAnswers.map((qa, idx) => (
                  <div key={idx} className="rounded-[6px] border border-border bg-background p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] font-mono flex items-center justify-center font-bold shrink-0">
                          Q{idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-foreground leading-snug">{qa.question}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyQA(idx, qa.answer)}
                        className="h-7 text-xs gap-1.5 px-2.5 rounded-[4px] text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                      >
                        {copiedQAs[idx] ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedQAs[idx] ? "Copied" : "Copy Answer"}
                      </Button>
                    </div>
                    <div className="bg-muted/15 p-3 rounded-[4px] border border-border text-xs sm:text-sm text-foreground/90 select-all leading-relaxed font-sans">
                      {qa.answer}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Standard Composer Box for Email, LinkedIn DM, Connect Note, Follow-Up */
        <div className="rounded-[6px] border border-border bg-background overflow-hidden">
          {/* Recipient / Channel Header */}
          {activeChannel === "email" ? (
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border text-sm">
              <span className="w-16 text-muted-foreground font-medium uppercase text-xs shrink-0">To:</span>
              {detectedEmail ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-foreground font-mono text-xs sm:text-sm truncate select-all">{detectedEmail}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                    Verified in JD
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    value={customRecipient}
                    onChange={(e) => setCustomRecipient(e.target.value)}
                    placeholder="No email found in JD. Enter recruiter email or switch to LinkedIn tab"
                    className="bg-transparent text-foreground text-xs sm:text-sm h-8 outline-none font-medium placeholder:text-muted-foreground/60 w-full"
                  />
                </div>
              )}
              {recipientEmail && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyRecipient}
                  className="h-8 w-8 rounded-[4px] text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                  title="Copy email address"
                >
                  {copiedTo ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              )}
            </div>
          ) : activeChannel === "linkedin_dm" ? (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <span className="w-16 text-muted-foreground font-medium uppercase text-xs shrink-0">Channel:</span>
                <span className="text-foreground font-medium">LinkedIn InMail / Recruiter Direct Message</span>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">Optimal: Under 100 words</span>
            </div>
          ) : activeChannel === "linkedin_connect" ? (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <span className="w-16 text-muted-foreground font-medium uppercase text-xs shrink-0">Channel:</span>
                <span className="text-foreground font-medium">LinkedIn Connection Invitation Note</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-[4px] ${
                    charCount <= 280
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : charCount <= 300
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-rose-500/10 text-rose-500"
                  }`}
                >
                  {charCount} / 300 chars
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <span className="w-16 text-muted-foreground font-medium uppercase text-xs shrink-0">Timing:</span>
                <span className="text-foreground font-medium">Send 5–7 business days after applying</span>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">Polite Follow-up</span>
            </div>
          )}

          {/* Subject Row (hidden on connect note as LinkedIn notes don't have subjects) */}
          {activeChannel !== "linkedin_connect" && (
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
          )}

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
                    <Check className="h-3 w-3" /> Saved to cloud
                  </span>
                )}
                {saveStatus === "error" && (
                  <span className="inline-flex items-center gap-1 text-xs text-rose-500 font-mono">
                    Cloud save failed
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline-block">
                  {wordCount} words • {charCount} chars
                </span>
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
                  onClick={() => onCopyToClipboard(sanitizedDisplayBody, "body")}
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
              rows={activeChannel === "linkedin_connect" ? 4 : 8}
              className="w-full text-xs sm:text-sm bg-muted/15 p-3.5 rounded-[4px] border border-border text-foreground leading-relaxed outline-none resize-none font-sans focus:border-foreground/30"
            />
          </div>
        </div>
      )}

      {/* Before Sending Checklist */}
      <div className="rounded-[6px] bg-muted/20 border border-border p-4 space-y-2.5">
        <h5 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-foreground" /> Outreach Checklist
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(outreachDrafts.beforeSendChecklist || [
            "Verified GitHub/LinkedIn/portfolio links included",
            "Mentioned core technical strengths from JD",
            "Highlighted top demonstrated projects",
            "Zero placeholders: 100% ready to submit",
          ]).map((item: string, idx: number) => (
            <div key={idx} className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
              <span className="text-emerald-500 select-none font-bold mt-0.5">✓</span>
              <span className="text-foreground/90">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          {activeChannel === "email" ? (
            <Button
              onClick={() => onOpenMailClient(recipientEmail)}
              className="text-xs sm:text-sm h-8 sm:h-9 px-3.5 sm:px-4 rounded-[4px] font-medium cursor-pointer gap-2 shadow-none"
            >
              <Send className="h-3.5 w-3.5" />
              {recipientEmail ? "Send In Email Client" : "Open In Email Client"}
            </Button>
          ) : activeChannel === "form_portal" ? (
            <Button
              onClick={() => onCopyToClipboard(sanitizedDisplayBody, "body")}
              className="text-xs sm:text-sm h-8 sm:h-9 px-3.5 sm:px-4 rounded-[4px] font-medium cursor-pointer gap-2 shadow-none"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Cover Note
            </Button>
          ) : (
            <Button
              onClick={() => onCopyToClipboard(sanitizedDisplayBody, "body")}
              className="text-xs sm:text-sm h-8 sm:h-9 px-3.5 sm:px-4 rounded-[4px] font-medium cursor-pointer gap-2 shadow-none"
            >
              <Copy className="h-3.5 w-3.5" />
              {activeChannel === "linkedin_connect" ? "Copy Connect Note" : "Copy LinkedIn DM"}
            </Button>
          )}

          {jobUrl && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm h-8 sm:h-9 px-3 rounded-[4px] border-border text-foreground hover:bg-muted/40 cursor-pointer font-medium gap-1.5"
              asChild
            >
              <a href={jobUrl.startsWith("http") ? jobUrl : `https://${jobUrl}`} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> {activeChannel === "form_portal" ? "Open Application Form" : "Open Job Post"}
              </a>
            </Button>
          )}

          <Button
            variant="outline"
            onClick={onMarkAppliedManually}
            className="text-xs sm:text-sm h-8 sm:h-9 px-3.5 sm:px-4 rounded-[4px] border-border text-foreground hover:bg-muted/40 cursor-pointer font-medium"
          >
            Mark Applied
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onGenerateOutreach(activeChannel)}
          className="text-xs sm:text-sm h-8 sm:h-9 px-3 rounded-[4px] border-border text-foreground hover:bg-muted/40 cursor-pointer gap-1.5 font-medium"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Generate with AI</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-muted text-muted-foreground ml-0.5">
            {activeChannel === "form_portal"
              ? "Form & Q&A"
              : activeChannel === "linkedin_connect"
              ? "Connect"
              : activeChannel === "linkedin_dm"
              ? "InMail"
              : activeChannel === "follow_up"
              ? "Follow-Up"
              : "Email"}
          </span>
        </Button>
      </div>
    </div>
  )
}
