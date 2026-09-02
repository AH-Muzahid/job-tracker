/* eslint-disable @typescript-eslint/no-explicit-any */
import { sendEmail, formatOutreachEmailHtml } from "@/lib/email"
import { getConnectedGoogleAccount, sendGmailMessage } from "@/lib/gmail"

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

    // 1. Check if user has an active Google Account connected
    const googleAccount = await getConnectedGoogleAccount(userId).catch(() => ({
      connected: false,
      email: undefined,
      provider: undefined,
      expiresAt: undefined,
    }))

    if (googleAccount.connected && googleAccount.email) {
      // Send directly from user's personal Gmail account
      const gmailResult = await sendGmailMessage(userId, {
        to: input.toEmail,
        subject: input.subject,
        html,
      })

      if (gmailResult.success) {
        return {
          success: true,
          message: `Outreach email sent directly from your Gmail (${gmailResult.from}) to ${input.toEmail}`,
          messageId: gmailResult.messageId,
          threadId: gmailResult.threadId,
          senderEmail: gmailResult.from,
          provider: "gmail",
        }
      } else {
        console.warn("[Gmail Dispatch Failed, falling back to Resend]:", gmailResult.error)
      }
    }

    // 2. Fallback to transactional email provider (Resend or local simulation)
    const result = await sendEmail({
      to: input.toEmail,
      subject: input.subject,
      html,
    })

    if (!result.success) {
      return { success: false, error: result.error || "Failed to dispatch email" }
    }

    return {
      success: true,
      message: `Outreach email successfully sent to ${input.toEmail}`,
      messageId: result.id,
      provider: "resend",
    }
  } catch (error: any) {
    return { success: false, error: error?.message || "Email dispatch failed" }
  }
}
