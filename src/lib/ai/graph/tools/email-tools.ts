/* eslint-disable @typescript-eslint/no-explicit-any */
import { sendEmail, formatOutreachEmailHtml } from "@/lib/email"
import { getConnectedGoogleAccount, sendGmailMessage } from "@/lib/gmail"
import { prisma, withDbRetry } from "@/lib/prisma"
import { pruneRelevantStack } from "@/lib/applications/outreach-engine"

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

  type ProfileSelectResult = {
    targetRoles: string[]
    experienceLevel: string | null
    strengths: string | null
    bestProjects: unknown
    githubUrl: string | null
    linkedInUrl: string | null
    portfolioUrl: string | null
  } | null

  let profileRecord: ProfileSelectResult = null

  try {
    const [userRecord, p] = await withDbRetry(async () => {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      })
      const prof = await prisma.userProfile.findUnique({
        where: { userId },
        select: {
          targetRoles: true,
          experienceLevel: true,
          strengths: true,
          bestProjects: true,
          githubUrl: true,
          linkedInUrl: true,
          portfolioUrl: true,
        },
      })
      return [u, prof]
    })

    if (userRecord?.name) {
      candidateName = userRecord.name
    }
    profileRecord = p

    if (profileRecord) {
      if (!role && profileRecord.targetRoles && profileRecord.targetRoles.length > 0) {
        role = profileRecord.targetRoles[0]
      }
    }
  } catch (err) {
    console.warn("[DraftOutreachEmail Context Warning]:", err)
  }

  const finalRole = role || "Software Engineer"
  const signoffName = candidateName || "Candidate"

  // Extract hero project or fallback to high-value project
  type ProjectItem = { name?: string; stack?: string }
  const rawProjects = Array.isArray(profileRecord?.bestProjects) ? (profileRecord.bestProjects as unknown[]) : []
  const topProj = (rawProjects[0] && typeof rawProjects[0] === "object" ? (rawProjects[0] as ProjectItem) : null) || {
    name: "Full-Stack Web Architecture",
    stack: profileRecord?.strengths || "TypeScript, Next.js, Node.js",
  }

  const prunedSkills = pruneRelevantStack(
    profileRecord?.strengths || "TypeScript, React, Next.js, Node.js",
    finalRole,
    3
  )
  const prunedProjStack = pruneRelevantStack(topProj.stack || prunedSkills, finalRole, 3)

  const linksList: string[] = []
  if (profileRecord?.portfolioUrl) linksList.push(`Portfolio: ${profileRecord.portfolioUrl}`)
  if (profileRecord?.githubUrl) linksList.push(`GitHub: ${profileRecord.githubUrl}`)
  if (profileRecord?.linkedInUrl) linksList.push(`LinkedIn: ${profileRecord.linkedInUrl}`)
  const linksLine = linksList.length > 0 ? `\n${linksList.join(" | ")}` : ""

  // High-conversion Linear/Stripe builder standard (under 110 words, 10-minute intro chat CTA)
  const subject = `Application for ${finalRole} at ${company} — ${signoffName}`
  const body = `Dear ${company} Hiring Team,

I noticed ${company} is looking for a ${finalRole}. Given my background engineering scalable, production web applications with ${prunedSkills}, I wanted to reach out directly.

Recently, I engineered ${topProj.name} using ${prunedProjStack}. I focused on solving core architectural challenges around performance and clean modular component design, keeping latency low and system reliability high.

Given ${company}'s focus on high-velocity execution, I can make an immediate contribution to your upcoming product milestones. Would you be open to a brief 10-minute intro chat this week?

Best regards,
${signoffName}${linksLine}`

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
