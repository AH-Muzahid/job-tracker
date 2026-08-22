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
