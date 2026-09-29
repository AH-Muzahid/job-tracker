/* eslint-disable @typescript-eslint/no-explicit-any */
import { sendEmail, formatOutreachEmailHtml } from "@/lib/email"
import { getConnectedGoogleAccount, sendGmailMessage } from "@/lib/gmail"
import { prisma, withDbRetry } from "@/lib/prisma"

export async function executeDraftOutreachEmail(
  userId: string,
  input: {
    companyName?: string
    role?: string
    tone?: string
    contextNotes?: string
  }
) {
  if (!userId) return { success: false, error: "Unauthorized" }

  const company = input.companyName?.trim() || "the team"
  let role = input.role?.trim()
  let candidateName = ""
  let candidateSummary = ""

  try {
    const [userRecord, profileRecord] = await withDbRetry(async () => {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      })
      const p = await prisma.userProfile.findUnique({
        where: { userId },
        select: {
          targetRoles: true,
          experienceLevel: true,
          strengths: true,
        },
      })
      return [u, p]
    })

    if (userRecord?.name) {
      candidateName = userRecord.name
    }
    if (profileRecord) {
      if (!role && profileRecord.targetRoles && profileRecord.targetRoles.length > 0) {
        role = profileRecord.targetRoles[0]
      }
      if (profileRecord.strengths) {
        candidateSummary = ` With core strengths in ${profileRecord.strengths},`
      }
    }
  } catch (err) {
    console.warn("[DraftOutreachEmail Context Warning]:", err)
  }

  const finalRole = role || "Software Engineer"
  const signoffName = candidateName || "Candidate"

  const subject = `Application for ${finalRole} — ${company}`
  const body = `Dear Hiring Team,\n\nI am writing to express my strong interest in joining ${company} as a ${finalRole}.${candidateSummary} I have a proven track record of shipping scalable, production-grade applications and collaborating closely with engineering teams to deliver impact.\n\nI have followed ${company}'s work and would welcome the opportunity to discuss how my technical skills and enthusiasm can support your team's upcoming initiatives.\n\nThank you for your time and consideration.\n\nBest regards,\n${signoffName}`

  return {
    success: true,
    subject,
    body,
    companyName: company,
    role: finalRole,
    candidateName: signoffName,
    format: "Outreach Email Draft",
    isEmailDraft: true,
  }
}


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
