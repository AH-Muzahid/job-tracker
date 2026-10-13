import { Resend } from "resend"
import { z } from "zod"
import { PLANNING_ERROR_FALLBACK } from "@/lib/ai/graph/constants"

export const emailPayloadSchema = z.object({
  to: z.string().email().max(254),
  subject: z.string().trim().min(1).max(998).refine((value) => !/[\r\n]/.test(value)),
  html: z.string().min(1).max(200_000),
  text: z.string().max(200_000).optional(),
  from: z.string().max(320).refine((value) => !/[\r\n]/.test(value)).optional(),
  replyTo: z.string().email().optional(),
  idempotencyKey: z.string().min(1).max(256).optional(),
})

/** Never publish agent diagnostics as candidate recommendations. */
export function resolveBriefingContent(
  evaluation: { success: boolean; content: string },
  fallback: string,
): string {
  const content = evaluation.content?.trim()
  return evaluation.success && content && content !== PLANNING_ERROR_FALLBACK &&
    !/^(AI provider not configured|Headless evaluation encountered an error|Evaluation completed successfully\.)/i.test(content)
    ? content : fallback
}

export function safeEmailUrl(value?: string | null): string | undefined {
  if (!value || !/^https?:\/\//i.test(value) || /[\s<>"'\\]/.test(value)) return undefined
  try {
    const url = new URL(value)
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password
      ? value : undefined
  } catch { return undefined }
}

export function emailHtmlToText(html: string): string {
  return html.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<\/(p|div|h[1-6]|li|tr)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<")
    .replace(/&gt;|&rarr;/g, ">").replace(/&ge;/g, ">=").replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/\n\s*\n/g, "\n\n").trim()
}

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
  idempotencyKey?: string
}

// Inline fallbacks work in older clients; these shared classes support newer clients.
function emailDocument(html: string): string {
  const styles = `<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<style>
  :root { color-scheme: light dark; }
  body { overflow-wrap: anywhere; }
  .email-container { box-sizing: border-box; width: 100%; }
  td { font-variant-numeric: tabular-nums; }
  @media (max-width: 480px) {
    body { padding: 8px !important; }
    .email-container { padding: 16px !important; }
    td { padding-left: 8px !important; padding-right: 8px !important; }
  }
  @media (prefers-color-scheme: dark) {
    body, .email-muted { background-color: #111827 !important; }
    .email-card { background-color: #1f2937 !important; }
    .email-ink { color: #f9fafb !important; }
    .email-copy { color: #cbd5e1 !important; }
    .email-border { border-color: #475569 !important; }
    .email-link { color: #a5b4fc !important; }
  }
</style>`
  return html.replace("</head>", `${styles}</head>`)
    .replace(/<(div|td|span|p|h[1-6]|table|strong|code|a|ul|ol)([^>]*?)style="([^"]*)"/g,
      (_match, tag: string, attrs: string, style: string) => {
        const classes = [
          /max-width: 600px/.test(style) ? "email-container" : "",
          /background(?:-color)?: #ffffff/.test(style) ? "email-card" : "",
          /background(?:-color)?: #(f1f5f9|f8fafc|fafafa)/.test(style) ? "email-muted" : "",
          /(?:^|;)\s*color: #(0f172a|1e293b)/.test(style) ? "email-ink" : "",
          /(?:^|;)\s*color: #(334155|475569|64748b|94a3b8)/.test(style) ? "email-copy" : "",
          /border/.test(style) ? "email-border" : "",
          /(?:^|;)\s*color: #533AFD/.test(style) ? "email-link" : "",
        ].filter(Boolean).join(" ")
        return `<${tag}${attrs} class="${classes}" style="${style.replace(/border-radius: 8px/g, "border-radius: 6px")}"`
      })
}

export interface SendEmailResult {
  success: boolean
  id?: string
  simulated?: boolean
  error?: string
}

/**
 * Universal email sender supporting Resend with safe fallback simulation when unconfigured.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
  replyTo,
  idempotencyKey,
}: SendEmailOptions): Promise<SendEmailResult> {
  if (!emailPayloadSchema.safeParse({ to, subject, html, text, from, replyTo, idempotencyKey }).success) {
    return { success: false, error: "Invalid email payload" }
  }
  const apiKey = process.env.RESEND_API_KEY
  const senderEmail = from || process.env.EMAIL_FROM || "CareerTrack Assistant <onboarding@resend.dev>"

  // If no API key is provided, log in dev mode and return simulated success
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      return { success: false, error: "Email delivery is not configured" }
    }
    console.info(`[Email Simulation] To: ${to} | Subject: ${subject}`)
    return {
      success: true,
      simulated: true,
      id: `sim_${Date.now()}`,
    }
  }

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: senderEmail,
      to: [to],
      subject,
      html,
      text: text || emailHtmlToText(html),
      replyTo,
    }, idempotencyKey ? { idempotencyKey } : undefined)

    if (error) {
      console.error("[Email Dispatch Error]", error)
      return { success: false, error: error.message }
    }

    if (!data?.id) return { success: false, error: "Email provider returned no message ID" }
    return {
      success: true,
      id: data?.id,
      simulated: false,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to send email"
    console.error("[Email Exception]", err)
    return { success: false, error: errorMsg }
  }
}

/**
 * Safely encodes HTML entities while leaving existing entity references intact.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&(?!(?:[a-zA-Z0-9]+|#\d+|#x[a-fA-F0-9]+);)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * Formats inline markdown syntax into inline CSS styled HTML for email clients.
 */
function formatInlineMarkdown(text: string): string {
  const links: string[] = []
  const protectedText = text.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_match, label: string, url: string) => {
    const safeUrl = safeEmailUrl(url)
    if (!safeUrl) return label
    links.push(`<a href="${escapeHtml(safeUrl)}" style="color: #533AFD; font-weight: 600; text-decoration: underline;">${escapeHtml(label)}</a>`)
    return `\u0000${links.length - 1}\u0000`
  })
  let formatted = escapeHtml(protectedText)

  // Bold: **text** or __text__
  formatted = formatted.replace(
    /\*\*(.+?)\*\*/g,
    '<strong style="font-weight: 700; color: #0f172a;">$1</strong>'
  )
  formatted = formatted.replace(
    /__([^_]+)__/g,
    '<strong style="font-weight: 700; color: #0f172a;">$1</strong>'
  )

  // Italic: *text* or _text_
  formatted = formatted.replace(
    /(^|[^*])\*([^*]+)\*([^*]|$)/g,
    '$1<em style="font-style: italic;">$2</em>$3'
  )
  formatted = formatted.replace(
    /(^|[^_])_([^_]+)_([^_]|$)/g,
    '$1<em style="font-style: italic;">$2</em>$3'
  )

  // Inline code: `code`
  formatted = formatted.replace(
    /`([^`]+)`/g,
    '<code style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; background: #f1f5f9; padding: 2px 5px; border-radius: 3px; color: #0f172a;">$1</code>'
  )

  return formatted.replace(/\u0000(\d+)\u0000/g, (_match, index: string) => links[Number(index)] || "")
}

/**
 * Parses markdown text (headers, bold headings, ordered and unordered lists, nested bullets)
 * into email-client compatible inline-styled HTML.
 */
export function renderMarkdownToEmailHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) {
    return ""
  }

  const lines = markdown.split(/\r?\n/)
  const result: string[] = []

  let listType: "ol" | "ul" | null = null
  let openLi = false
  let inNestedUl = false

  const closeNestedList = () => {
    if (inNestedUl) {
      result.push("</ul>")
      inNestedUl = false
    }
  }

  const closeCurrentLi = () => {
    closeNestedList()
    if (openLi) {
      result.push("</li>")
      openLi = false
    }
  }

  const closeList = () => {
    closeCurrentLi()
    if (listType === "ol") {
      result.push("</ol>")
      listType = null
    } else if (listType === "ul") {
      result.push("</ul>")
      listType = null
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const trimmed = rawLine.trim()

    if (!trimmed) {
      closeList()
      continue
    }

    // Horizontal Rule: --- or ***
    if (/^[-*_]{3,}$/.test(trimmed)) {
      closeList()
      result.push(
        '<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 18px 0;" />'
      )
      continue
    }

    // Markdown Headers: #, ##, ###, ####
    const headerMatch = trimmed.match(/^(#{1,4})\s+(.*)$/)
    if (headerMatch) {
      closeList()
      const level = headerMatch[1].length
      const text = formatInlineMarkdown(headerMatch[2])
      if (level === 1) {
        result.push(
          `<h3 style="margin: 18px 0 8px 0; font-size: 16px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: -0.01em;">${text}</h3>`
        )
      } else {
        result.push(
          `<h4 style="margin: 14px 0 6px 0; font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.04em;">${text}</h4>`
        )
      }
      continue
    }

    // Standalone Bold Line Acting as Title / Section Subheader
    // Matches e.g. **Daily Career Briefing – AH Muzahid** or **Pipeline:**
    const standaloneBoldMatch = trimmed.match(/^\*\*([^*]+)\*\*[:]?$/)
    if (standaloneBoldMatch) {
      closeList()
      const isColonEnding = trimmed.endsWith(":")
      const text = escapeHtml(standaloneBoldMatch[1]) + (isColonEnding ? ":" : "")
      const isPrimaryTitle = i === 0 || trimmed.toLowerCase().includes("briefing")
      if (isPrimaryTitle) {
        result.push(
          `<div style="margin: 0 0 12px 0; font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">${text}</div>`
        )
      } else {
        result.push(
          `<div style="margin: 16px 0 6px 0; font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">${text}</div>`
        )
      }
      continue
    }

    // Check for Indented Nested Bullet Item (e.g. "   - Item" or "   • Item")
    const isIndented = /^\s{2,}|\t/.test(rawLine)
    const nestedBulletMatch = isIndented && trimmed.match(/^[-*•\u2022]\s+(.*)$/)
    if (nestedBulletMatch && listType !== null) {
      if (!inNestedUl) {
        result.push(
          '<ul style="margin: 6px 0 6px 18px; padding-left: 0; list-style-type: disc; color: #475569;">'
        )
        inNestedUl = true
      }
      const itemContent = formatInlineMarkdown(nestedBulletMatch[1])
      result.push(
        `<li style="margin-bottom: 4px; font-size: 13px; line-height: 1.5;">${itemContent}</li>`
      )
      continue
    }

    // Ordered List Item (e.g. "1. Item")
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/)
    if (olMatch) {
      if (listType !== "ol") {
        closeList()
        result.push(
          '<ol style="margin: 8px 0 14px 0; padding-left: 20px; color: #334155;">'
        )
        listType = "ol"
      } else {
        closeCurrentLi()
      }
      const itemContent = formatInlineMarkdown(olMatch[2])
      result.push(
        `<li style="margin-bottom: 8px; font-size: 14px; line-height: 1.6;">${itemContent}`
      )
      openLi = true
      continue
    }

    // Unordered List Item (e.g. "- Item", "* Item", "• Item")
    const ulMatch = trimmed.match(/^[-*•\u2022]\s+(.*)$/)
    if (ulMatch) {
      if (listType !== "ul") {
        closeList()
        result.push(
          '<ul style="margin: 8px 0 14px 0; padding-left: 20px; list-style-type: disc; color: #334155;">'
        )
        listType = "ul"
      } else {
        closeCurrentLi()
      }
      const itemContent = formatInlineMarkdown(ulMatch[1])
      result.push(
        `<li style="margin-bottom: 6px; font-size: 14px; line-height: 1.6;">${itemContent}`
      )
      openLi = true
      continue
    }

    // Regular Paragraph
    closeList()
    const pContent = formatInlineMarkdown(trimmed)
    result.push(
      `<p style="margin: 0 0 10px 0; font-size: 14px; line-height: 1.6; color: #334155;">${pContent}</p>`
    )
  }

  closeList()
  return result.join("\n")
}

/**
 * Formats a clean HTML wrapper for job applications, cold outreach, and follow-ups.
 */
export function formatOutreachEmailHtml({
  candidateName,
  bodyText,
  companyName,
  jobTitle,
}: {
  candidateName?: string
  bodyText: string
  companyName?: string
  jobTitle?: string
}): string {
  const formattedParagraphs = renderMarkdownToEmailHtml(bodyText)
  candidateName = candidateName ? escapeHtml(candidateName) : undefined
  companyName = companyName ? escapeHtml(companyName) : undefined
  jobTitle = jobTitle ? escapeHtml(jobTitle) : undefined

  return emailDocument(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${jobTitle ? `${jobTitle} Application` : "Job Application"}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    ${
      companyName
        ? `<div style="margin-bottom: 20px; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Application for ${companyName}</div>`
        : ""
    }
    <div style="font-size: 15px; color: #1e293b;">
      ${formattedParagraphs}
    </div>
    ${
      candidateName
        ? `<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 14px; color: #64748b;">
            Sent by <strong>${candidateName}</strong> via CareerTrack
           </div>`
        : ""
    }
  </div>
</body>
</html>
`)
}

export interface DailyDigestJobItem {
  id: string
  title: string
  company: string
  location?: string
  salary?: string
  matchScore: number
  url?: string
  employmentType?: string
}

/**
 * Formats an architectural linear blueprint HTML email for the 9 AM Daily Job Hunt briefing,
 * including both active/stale pipeline follow-ups and top freshly discovered matches (REC-11).
 */
export function formatDailyOpportunityDigestHtml({
  candidateName,
  briefingText,
  opportunities = [],
  staleApplicationsCount = 0,
  activeApplicationsCount = 0,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://career-track-nine.vercel.app",
}: {
  candidateName?: string
  briefingText: string
  opportunities?: DailyDigestJobItem[]
  staleApplicationsCount?: number
  activeApplicationsCount?: number
  appUrl?: string
}): string {
  appUrl = (safeEmailUrl(appUrl) || "https://career-track-nine.vercel.app").replace(/\/$/, "")
  candidateName = candidateName ? escapeHtml(candidateName) : undefined
  const formattedParagraphs = renderMarkdownToEmailHtml(resolveBriefingContent(
    { success: true, content: briefingText },
    `${staleApplicationsCount > 0 ? `- Review ${staleApplicationsCount} applications needing follow-up.\n` : ""}${opportunities.length > 0 ? `- Review ${opportunities.length} high-fit opportunities in Discovery.` : "- Review your applications and update your job preferences in Discovery."}`,
  ))

  const opportunitiesHtml =
    opportunities.length > 0
      ? opportunities
          .map((job) => {
            const applyUrl = escapeHtml(safeEmailUrl(job.url) || `${appUrl}/discovery`)
            const scoreColor =
              job.matchScore >= 90
                ? "#059669"
                : job.matchScore >= 75
                ? "#0284c7"
                : "#d97706"

            return `
            <div style="border: 1px solid #e2e8f0; background: #ffffff; padding: 16px; margin-bottom: 12px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 8px;">
                <tr>
                  <td align="left" style="vertical-align: top;">
                    <span style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">${escapeHtml(job.company)}</span>
                    <h4 style="margin: 4px 0; font-size: 16px; font-weight: 700; color: #0f172a; overflow-wrap: anywhere;">${escapeHtml(job.title)}</h4>
                  </td>
                  <td align="right" style="vertical-align: top; width: 100px;">
                    <span style="background: ${scoreColor}; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 8px; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block;">
                      ${Number.isFinite(job.matchScore) ? Math.max(0, Math.min(100, Math.round(job.matchScore))) : 0}% MATCH
                    </span>
                  </td>
                </tr>
              </table>
              <div style="font-size: 12px; color: #64748b; margin-bottom: 12px; line-height: 1.5;">
                ${job.location ? `<span style="margin-right: 12px;">${escapeHtml(job.location)}</span>` : ""}
                ${job.employmentType ? `<span style="margin-right: 12px;">${escapeHtml(job.employmentType)}</span>` : ""}
                ${job.salary && !/^(range|n\/?a|negotiable|null|undefined)$/i.test(job.salary.trim()) ? `<span>${escapeHtml(job.salary)}</span>` : ""}
              </div>
              <div style="text-align: right;">
                <a href="${applyUrl}" style="display: inline-block; color: #533AFD; text-decoration: underline; font-size: 12px; font-weight: 700; padding: 12px 0;">
                  Review Opportunity &rarr;
                </a>
              </div>
            </div>`
          })
          .join("")
      : `<p style="font-size: 13px; color: #64748b; font-style: italic;">No new high-fit opportunities found in this cycle.</p>`

  return emailDocument(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CareerTrack Daily Briefing</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; padding: 32px;">
    <!-- Blueprint Header -->
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px;">
      <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">CareerTrack Autonomous Agent</div>
      <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: -0.02em;">Daily Career Briefing & Opportunity Digest</h2>
    </div>

    <!-- Candidate Greeting & Meta -->
    <div style="margin-bottom: 20px; font-size: 14px; color: #475569;">
      Hello <strong>${candidateName || "Candidate"}</strong>, here is your autonomous morning briefing and personalized high-fit opportunities.
    </div>

    <!-- Pipeline Stats Bar -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f1f5f9; border: 1px solid #e2e8f0; margin-bottom: 24px;">
      <tr>
        <td style="padding: 12px 16px; border-right: 1px solid #e2e8f0;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Active Apps</div>
          <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${activeApplicationsCount}</div>
        </td>
        <td style="padding: 12px 16px; border-right: 1px solid #e2e8f0;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Follow-ups</div>
          <div style="font-size: 18px; font-weight: 800; color: ${staleApplicationsCount > 0 ? "#dc2626" : "#0f172a"};">${staleApplicationsCount}</div>
        </td>
        <td style="padding: 12px 16px;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Top Matches</div>
          <div style="font-size: 18px; font-weight: 800; color: #059669;">${opportunities.length}</div>
        </td>
      </tr>
    </table>

    <!-- AI Briefing Section -->
    <div style="margin-bottom: 28px;">
      <div style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; border-left: 3px solid #0f172a; padding-left: 8px; margin-bottom: 12px;">
        Today's Priorities
      </div>
      <div style="background: #fafafa; border: 1px solid #e2e8f0; padding: 16px;">
        ${formattedParagraphs}
      </div>
    </div>

    <!-- Top Discovered Opportunities Section -->
    <div style="margin-bottom: 28px;">
      <div style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; border-left: 3px solid #059669; padding-left: 8px; margin-bottom: 12px;">
        Top Discovered Opportunities
      </div>
      ${opportunitiesHtml}
    </div>

    <!-- CTA to Discovery Dashboard -->
    <div style="text-align: center; margin: 32px 0 20px 0;">
      <a href="${appUrl}/discovery" style="display: inline-block; background: #533AFD; border-radius: 4px; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 16px 24px;">
        Open Discovery Dashboard &rarr;
      </a>
    </div>

    <!-- Footer -->
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
      Generated automatically by CareerTrack Autonomous Career Agent • <a href="${appUrl}/settings" style="color: #64748b; text-decoration: underline;">Notification Preferences</a>
    </div>
  </div>
</body>
</html>
`)
}

export interface InterviewReminderEmailOptions {
  candidateName?: string
  companyName: string
  jobTitle: string
  interviewRound?: string | null
  interviewDate: Date | string
  interviewMeetingUrl?: string | null
  interviewNotes?: string | null
  reminderType: "24h" | "2h"
  appUrl?: string
  applicationId: string
  timeZone?: string
}

/**
 * Formats a clean architectural blueprint HTML email for 24-hour and 2-hour pre-interview briefings.
 */
export function formatInterviewReminderHtml({
  candidateName,
  companyName,
  jobTitle,
  interviewRound,
  interviewDate,
  interviewMeetingUrl,
  interviewNotes,
  reminderType,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://career-track-nine.vercel.app",
  applicationId,
  timeZone = "Asia/Dhaka",
}: InterviewReminderEmailOptions): string {
  const rawCompanyName = companyName
  const rawJobTitle = jobTitle
  companyName = escapeHtml(companyName)
  jobTitle = escapeHtml(jobTitle)
  candidateName = candidateName ? escapeHtml(candidateName) : undefined
  interviewRound = interviewRound ? escapeHtml(interviewRound) : undefined
  interviewNotes = interviewNotes ? escapeHtml(interviewNotes) : undefined
  interviewMeetingUrl = safeEmailUrl(interviewMeetingUrl)
  if (interviewMeetingUrl) interviewMeetingUrl = escapeHtml(interviewMeetingUrl)
  appUrl = (safeEmailUrl(appUrl) || "https://career-track-nine.vercel.app").replace(/\/$/, "")
  applicationId = encodeURIComponent(applicationId)
  const roundTitle = interviewRound || "Interview Round"
  const dateObj = new Date(interviewDate)
  if (Number.isNaN(dateObj.getTime())) throw new Error("Invalid interview date")
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone,
  })
  const formattedTime = dateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  })
  const prepRoomUrl = `${appUrl}/interview-prep?appId=${applicationId}&company=${encodeURIComponent(
    rawCompanyName
  )}&role=${encodeURIComponent(rawJobTitle)}`
  const appDetailUrl = `${appUrl}/applications/${applicationId}`

  const isUrgent = reminderType === "2h"
  const badgeText = isUrgent ? "CRITICAL: 2 HOURS REMAINING" : "PREPARATION BRIEFING: 24 HOURS OUT"
  const badgeBg = isUrgent ? "#dc2626" : "#0284c7"

  return emailDocument(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${reminderType === "2h" ? "2-Hour Alert" : "24-Hour Briefing"}: ${roundTitle} with ${companyName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; padding: 32px;">
    <!-- Header -->
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px;">
      <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">CareerTrack Interview Intelligence</div>
      <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: -0.02em;">${roundTitle} Briefing</h2>
    </div>

    <!-- Alert Tag -->
    <div style="margin-bottom: 20px;">
      <span style="background: ${badgeBg}; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 10px; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block;">
        ${badgeText}
      </span>
    </div>

    <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
      Hello <strong>${candidateName || "Candidate"}</strong>, you have an upcoming interview scheduled for <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.
    </p>

    <!-- Schedule Card -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 18px; margin-bottom: 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600; width: 120px;">COMPANY:</td>
          <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 700;">${companyName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">ROUND:</td>
          <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 700;">${roundTitle}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">DATE & TIME:</td>
          <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 700;">${formattedDate} at ${formattedTime}</td>
        </tr>
        ${
          interviewMeetingUrl
            ? `<tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">VIDEO LINK:</td>
          <td style="padding: 6px 0; font-size: 14px; color: #0284c7; font-weight: 700;"><a href="${interviewMeetingUrl}" style="color: #0284c7; text-decoration: underline;">Open Meeting Call &rarr;</a></td>
        </tr>`
            : ""
        }
      </table>
    </div>

    ${
      interviewNotes
        ? `<!-- Cheatsheet Notes -->
    <div style="margin-bottom: 24px; border: 1px dashed #cbd5e1; background: #ffffff; padding: 16px;">
      <div style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 8px;">
        Candidate Cheatsheet / Notes:
      </div>
      <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6; white-space: pre-line;">${interviewNotes}</p>
    </div>`
        : ""
    }

    <!-- Call to Action Buttons -->
    <div style="text-align: center; margin: 28px 0 16px 0;">
      <a href="${prepRoomUrl}" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 24px; text-transform: uppercase; letter-spacing: 0.05em; margin-right: 8px; margin-bottom: 8px;">
        Launch AI Mock Prep Room &rarr;
      </a>
      <a href="${appDetailUrl}" style="display: inline-block; background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 20px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
        View Application Cheatsheet
      </a>
    </div>

    <!-- Footer -->
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
      CareerTrack Automated Interview Reminders • Powered by CareerTrack Autonomous Agent
    </div>
  </div>
</body>
</html>
`)
}


