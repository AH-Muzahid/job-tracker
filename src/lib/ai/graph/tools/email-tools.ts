import { deduplicateDelivery, sideEffectKey } from "@/lib/ai/side-effect-dedup"
import { sendEmail, formatOutreachEmailHtml, emailPayloadSchema } from "@/lib/email"
import { getConnectedGoogleAccount, sendGmailMessage } from "@/lib/gmail"
import { prisma, withDbRetry } from "@/lib/prisma"
import { pruneRelevantStack } from "@/lib/applications/outreach-engine"

export async function executeDraftOutreachEmail(
  userId: string,
  input: {
    companyName?: string
    role?: string
    recipientEmail?: string
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

  type ProjectItem = { name?: string; stack?: string; description?: string }
  const rawProjects = Array.isArray(profileRecord?.bestProjects) ? profileRecord.bestProjects as ProjectItem[] : []
  const topProj = rawProjects.find((p) => p && typeof p.name === "string" && p.name.trim())
  const strengths = profileRecord?.strengths?.trim() || ""
  if (!topProj && !strengths) return { success: false, error: "Add verified skills or a project to your profile before drafting outreach.", retryable: false }
  const prunedSkills = pruneRelevantStack(strengths, finalRole, 3)
  const projectProof = topProj ? `My project: ${topProj.name}${topProj.description ? `. ${topProj.description}` : "."}` : `My skills: ${prunedSkills || strengths}.`

  const linksList: string[] = []
  if (profileRecord?.portfolioUrl) linksList.push(`Portfolio: ${profileRecord.portfolioUrl}`)
  if (profileRecord?.githubUrl) linksList.push(`GitHub: ${profileRecord.githubUrl}`)
  if (profileRecord?.linkedInUrl) linksList.push(`LinkedIn: ${profileRecord.linkedInUrl}`)
  const linksLine = linksList.length > 0 ? `\n${linksList.join(" | ")}` : ""

  // High-conversion Linear/Stripe builder standard (under 110 words, 10-minute intro chat CTA)
  const subject = `Application for ${finalRole} at ${company} — ${signoffName}`
  const body = `Dear ${company} Hiring Team,

I am interested in the ${finalRole} position at ${company}.

${projectProof}

Would you be open to a brief conversation about the role?

Best regards,
${signoffName}${linksLine}`

  // Detect recipient email from input or context notes
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  let detectedEmail = input.recipientEmail?.trim()
  if (!detectedEmail && input.contextNotes) {
    const match = input.contextNotes.match(emailRegex)
    if (match) detectedEmail = match[0]
  }

  return {
    success: true,
    subject,
    body,
    companyName: company,
    role: finalRole,
    candidateName: signoffName,
    recipientEmail: detectedEmail || undefined,
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
}): Promise<{ success: boolean; error?: string; message?: string; messageId?: string; threadId?: string; senderEmail?: string; provider?: string; simulated?: boolean }> {
  if (!userId) return { success: false, error: "Unauthorized" }
  if (!input.toEmail || !input.subject || !input.bodyText) {
    return { success: false, error: "Recipient email, subject, and body text are required." }
  }

  try {
    return await deduplicateDelivery(sideEffectKey(userId, [input.toEmail.toLowerCase(), input.subject, input.bodyText]), async () => {
    const html = formatOutreachEmailHtml({
      candidateName: input.candidateName,
      bodyText: input.bodyText,
      companyName: input.companyName,
      jobTitle: input.jobTitle,
    })
    if (!emailPayloadSchema.safeParse({ to: input.toEmail, subject: input.subject, html }).success) {
      return { success: false, error: "Invalid email payload" }
    }

    // 1. Check if user has an active Google Account connected
    const googleAccount = await getConnectedGoogleAccount(userId)

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
        return { success: false, error: "Unable to send outreach from your connected Gmail account. Please check the connection and retry." }
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
      message: result.simulated ? `Email delivery to ${input.toEmail} was simulated; no email was sent.` : `Outreach email successfully sent to ${input.toEmail}`,
      messageId: result.id,
      simulated: result.simulated ?? false,
      provider: "resend",
    }    })

  } catch {
    return { success: false, error: "Email dispatch failed. Please check your email connection and retry." }
  }
}
