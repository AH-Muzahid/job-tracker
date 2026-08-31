/* eslint-disable @typescript-eslint/no-explicit-any */
import { sendEmail, formatOutreachEmailHtml } from "@/lib/email"

export async function executeSendOutreachEmail(userId: string, input: {
  toEmail: string
  subject: string
  bodyText: string
  candidateName?: string
  companyName?: string
  jobTitle?: string
}) {
  if (!userId) return { success: false, error: "Unauthorized" }
  if (!input.toEmail || !input.subject || !input.bodyText) {
    return { success: false, error: "Recipient email, subject, and body text are required." }
  }

  try {
    const html = formatOutreachEmailHtml({
      candidateName: input.candidateName,
      bodyText: input.bodyText,
      companyName: input.companyName,
      jobTitle: input.jobTitle,
    })

    const result = await sendEmail({
      to: input.toEmail,
      subject: input.subject,
      html,
    })

    if (!result.success) {
      return { success: false, error: result.error || "Failed to dispatch email via Resend" }
    }

    return {
      success: true,
      message: `Outreach email successfully sent to ${input.toEmail}`,
      messageId: result.id,
    }
  } catch (error: any) {
    return { success: false, error: error?.message || "Email dispatch failed" }
  }
}
