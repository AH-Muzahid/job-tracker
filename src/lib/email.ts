import { Resend } from "resend"

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
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
}: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const senderEmail = from || process.env.EMAIL_FROM || "CareerTrack Assistant <onboarding@resend.dev>"

  // If no API key is provided, log in dev mode and return simulated success
  if (!apiKey) {
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
      text: text || html.replace(/<[^>]*>?/gm, ""),
      replyTo,
    })

    if (error) {
      console.error("[Email Dispatch Error]", error)
      return { success: false, error: error.message }
    }

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
  const formattedParagraphs = bodyText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((p) => `<p style="margin: 0 0 14px 0; font-size: 15px; line-height: 1.6; color: #1e293b;">${p}</p>`)
    .join("")

  return `
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
`
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
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://careertrack.ai",
}: {
  candidateName?: string
  briefingText: string
  opportunities?: DailyDigestJobItem[]
  staleApplicationsCount?: number
  activeApplicationsCount?: number
  appUrl?: string
}): string {
  const formattedParagraphs = briefingText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((p) => `<p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #1e293b;">${p}</p>`)
    .join("")

  const opportunitiesHtml =
    opportunities.length > 0
      ? opportunities
          .map((job) => {
            const applyUrl = job.url || `${appUrl}/discovery`
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
                    <span style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">${job.company}</span>
                    <h4 style="margin: 4px 0; font-size: 16px; font-weight: 700; color: #0f172a;">${job.title}</h4>
                  </td>
                  <td align="right" style="vertical-align: top; width: 100px;">
                    <span style="background: ${scoreColor}; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 8px; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block;">
                      ${job.matchScore}% MATCH
                    </span>
                  </td>
                </tr>
              </table>
              <div style="font-size: 12px; color: #64748b; margin-bottom: 12px; line-height: 1.5;">
                ${job.location ? `<span style="margin-right: 12px;">📍 ${job.location}</span>` : ""}
                ${job.employmentType ? `<span style="margin-right: 12px;">💼 ${job.employmentType}</span>` : ""}
                ${job.salary ? `<span>💰 ${job.salary}</span>` : ""}
              </div>
              <div style="text-align: right;">
                <a href="${applyUrl}" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 700; padding: 8px 16px; text-transform: uppercase; letter-spacing: 0.05em;">
                  View & Apply &rarr;
                </a>
              </div>
            </div>`
          })
          .join("")
      : `<p style="font-size: 13px; color: #64748b; font-style: italic;">No new high-fit opportunities found in this cycle.</p>`

  return `
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
        Agent Recommendations
      </div>
      <div style="background: #fafafa; border: 1px solid #e2e8f0; padding: 16px;">
        ${formattedParagraphs}
      </div>
    </div>

    <!-- Top Discovered Opportunities Section -->
    <div style="margin-bottom: 28px;">
      <div style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; border-left: 3px solid #059669; padding-left: 8px; margin-bottom: 12px;">
        Top Discovered Opportunities (&ge;75% Fit)
      </div>
      ${opportunitiesHtml}
    </div>

    <!-- CTA to Discovery Dashboard -->
    <div style="text-align: center; margin: 32px 0 20px 0;">
      <a href="${appUrl}/discovery" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 28px; text-transform: uppercase; letter-spacing: 0.05em;">
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
`
}

