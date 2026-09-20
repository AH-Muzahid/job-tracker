import { prisma, withDbRetry } from "@/lib/prisma"
import { getUserAIConfig } from "@/lib/ai/config"
import { getProvider } from "@/lib/ai/client"
import { generateText } from "ai"
import { executeSendOutreachEmail } from "@/lib/ai/graph/tools/email-tools"
import { invalidateCache } from "@/lib/redis"

import { calculateBusinessDays, isFollowUpDue } from "@/lib/applications/follow-up-utils"
export { calculateBusinessDays, isFollowUpDue }

export interface FollowUpDraft {
  subject: string
  body: string
  checklist: string[]
  generatedAt: string
  daysSinceApplied?: number
}

export interface GenerateFollowUpInput {
  userId: string
  applicationId: string
  companyName: string
  jobTitle: string
  candidateName?: string
  applicationDate?: Date | string
  jdSnippet?: string
  candidateStrengths?: string
}

/**
 * Generates a concise, high-converting follow-up email draft using AI or deterministic fallback.
 */
export async function generateFollowUpDraft(
  input: GenerateFollowUpInput
): Promise<FollowUpDraft> {
  const candidateName = input.candidateName || "Candidate"
  const companyName = input.companyName || "Company"
  const jobTitle = input.jobTitle || "Software Engineer"
  const now = new Date()
  const daysElapsed = input.applicationDate ? calculateBusinessDays(input.applicationDate, now) : 5

  const defaultChecklist = [
    "Addressed hiring team with warm professional greeting",
    `Referenced original application for ${jobTitle}`,
    "Reiterated core value proposition & enthusiasm",
    "Clear, low-friction inquiry on timeline & next steps",
    "Kept under 120 words for high mobile scannability",
  ]

  // Deterministic fallback template
  const fallbackSubject = `Following up: Application for ${jobTitle} at ${companyName} - ${candidateName}`
  const fallbackBody = `Dear ${companyName} Hiring Team,

I hope this message finds you well.

I am writing to follow up on my recent application for the ${jobTitle} position at ${companyName}, submitted ${daysElapsed > 0 ? `${daysElapsed} business days ago` : "recently"}.

I remain very excited about ${companyName}'s mission and the opportunity to contribute with my engineering experience. I would love to confirm that my materials were received and inquire if there are any updates or additional details I can provide to support your review.

Thank you for your time and consideration. I look forward to hearing from you.

Best regards,
${candidateName}`

  try {
    const aiConfig = await getUserAIConfig(input.userId, undefined, { requireUserKey: true }).catch(() => null)
    if (!aiConfig?.apiKey) {
      return {
        subject: fallbackSubject,
        body: fallbackBody,
        checklist: defaultChecklist,
        generatedAt: now.toISOString(),
        daysSinceApplied: daysElapsed,
      }
    }

    const resolvedProvider = getProvider({
      providerType: aiConfig.providerType as "openai" | "anthropic" | "google" | "custom-openai",
      apiKey: aiConfig.apiKey,
      baseUrl: aiConfig.baseUrl,
      model: aiConfig.model,
    })

    const targetModel = resolvedProvider.model(aiConfig.model || resolvedProvider.defaultModel)

    const prompt = `You are a world-class executive recruiter and career strategist.
Generate a concise, courteous, high-converting follow-up email for a candidate following up on a dormant job application.

CONTEXT:
- Candidate Name: ${candidateName}
- Company: ${companyName}
- Role: ${jobTitle}
- Timeline: Submitted approximately ${daysElapsed} business days ago with no updates yet.
${input.candidateStrengths ? `- Key Strengths: ${input.candidateStrengths}` : ""}
${input.jdSnippet ? `- Role Context: ${input.jdSnippet.slice(0, 300)}` : ""}

CRITICAL REQUIREMENTS:
1. LINE 1 MUST BE THE SUBJECT LINE formatted as:
SUBJECT: Following up: Application for ${jobTitle} - ${candidateName}

2. AFTER LINE 1, LEAVE ONE BLANK LINE AND WRITE THE EMAIL BODY ONLY.
3. Maximum 110 words. Concise, respectful of recipient's time.
4. Professional sign-off with ${candidateName}. No placeholders.`

    const result = await generateText({
      model: targetModel,
      prompt,
      maxOutputTokens: 300,
    })

    const rawText = (result.text || "").trim()
    if (!rawText || rawText.length < 30) {
      return {
        subject: fallbackSubject,
        body: fallbackBody,
        checklist: defaultChecklist,
        generatedAt: now.toISOString(),
        daysSinceApplied: daysElapsed,
      }
    }

    let subject = fallbackSubject
    let body = rawText

    if (rawText.toUpperCase().startsWith("SUBJECT:")) {
      const lines = rawText.split("\n")
      subject = lines[0].replace(/^SUBJECT:\s*/i, "").trim()
      body = lines.slice(1).join("\n").trim()
    }

    // Clean any artifacts
    body = body
      .replace(/\[Hiring Manager\]/gi, `Dear ${companyName} Hiring Team,`)
      .replace(/\[Your Name\]/gi, candidateName)
      .replace(/\[Company Name\]/gi, companyName)
      .trim()

    return {
      subject: subject || fallbackSubject,
      body: body || fallbackBody,
      checklist: defaultChecklist,
      generatedAt: now.toISOString(),
      daysSinceApplied: daysElapsed,
    }
  } catch (err) {
    console.warn("[generateFollowUpDraft fallback engaged]:", err)
    return {
      subject: fallbackSubject,
      body: fallbackBody,
      checklist: defaultChecklist,
      generatedAt: now.toISOString(),
      daysSinceApplied: daysElapsed,
    }
  }
}

/**
 * Stages the follow-up draft directly into PostgreSQL ApplicationAnalysis.
 */
export async function stageFollowUpForApplication(
  applicationId: string,
  draft: FollowUpDraft
): Promise<void> {
  if (!prisma?.applicationAnalysis?.upsert) return

  const now = new Date()

  try {
    const existing = prisma?.applicationAnalysis?.findUnique
      ? await withDbRetry(() =>
          prisma.applicationAnalysis.findUnique({
            where: { applicationId },
            select: { applyStrategy: true },
          })
        )
      : null

    const existingStrategy = (existing?.applyStrategy as Record<string, unknown>) || {}
    const updatedStrategy = {
      ...existingStrategy,
      followUpDraft: {
        subject: draft.subject,
        body: draft.body,
        checklist: draft.checklist,
        generatedAt: draft.generatedAt,
        daysSinceApplied: draft.daysSinceApplied,
      },
      followUpStatus: "DRAFTED",
      followUpGeneratedAt: draft.generatedAt,
    }

    if (prisma?.applicationAnalysis?.upsert) {
      await withDbRetry(() =>
        prisma.applicationAnalysis.upsert({
          where: { applicationId },
          create: {
            applicationId,
            outreachSubject: draft.subject,
            outreachBody: draft.body,
            outreachChecklist: draft.checklist,
            outreachGeneratedAt: now,
            applyStrategy: updatedStrategy,
          },
          update: {
            outreachSubject: draft.subject,
            outreachBody: draft.body,
            outreachChecklist: draft.checklist,
            outreachGeneratedAt: now,
            applyStrategy: updatedStrategy,
          },
        })
      )
    }
  } catch (err) {
    console.warn("[stageFollowUpForApplication error]:", err)
  }
}

/**
 * 1-Click Dispatches the follow-up email and logs a StatusChange audit record.
 */
export async function dispatchFollowUpForApplication(
  userId: string,
  applicationId: string,
  options?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app?: any
    toEmail?: string
    customSubject?: string
    customBody?: string
  }
): Promise<{
  success: boolean
  message: string
  dispatchedAt: string
  provider?: string
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let app: any = options?.app
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let user: any = options?.app?.user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let analysis: any = options?.app?.analysis

  if (!app && prisma?.application?.findUnique) {
    app = await withDbRetry(() =>
      prisma.application.findUnique({
        where: { id: applicationId, userId },
        include: { company: true },
      })
    )
  }

  if (!user && prisma?.user?.findUnique) {
    user = await withDbRetry(() =>
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      })
    )
  }

  if (!analysis && prisma?.applicationAnalysis?.findUnique) {
    analysis = await withDbRetry(() =>
      prisma.applicationAnalysis.findUnique({
        where: { applicationId },
      })
    )
  }

  if (!app) {
    throw new Error("Application not found or unauthorized")
  }

  const candidateName = user?.name || "Candidate"
  const companyName = app.company?.name || app.companyName
  const subject = options?.customSubject || analysis?.outreachSubject || `Following up on ${app.jobTitle} application - ${candidateName}`
  const bodyText = options?.customBody || analysis?.outreachBody || `Dear ${companyName} Hiring Team,\n\nI am writing to follow up on my application for the ${app.jobTitle} position at ${companyName}. I remain enthusiastically interested in the role and would appreciate any update on the timeline.\n\nBest regards,\n${candidateName}`

  // Infer recipient email from notes or fall back to standard hiring address
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi
  const inferred = (app.notes || "").match(emailRegex) || []
  const targetEmail = options?.toEmail || inferred[0] || `careers@${companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`

  const dispatchResult = await executeSendOutreachEmail(userId, {
    toEmail: targetEmail,
    subject,
    bodyText,
    candidateName,
    companyName,
    jobTitle: app.jobTitle,
  })

  const now = new Date()
  const dispatchedAt = now.toISOString()

  // Record audit trail via StatusChange if prisma.statusChange is available
  if (prisma?.statusChange?.create) {
    try {
      await withDbRetry(() =>
        prisma.statusChange.create({
          data: {
            applicationId,
            fromStatus: app.status,
            toStatus: app.status,
            metadata: {
              event: "FOLLOW_UP_DISPATCHED",
              toEmail: targetEmail,
              subject,
              dispatchedAt,
              provider: dispatchResult.provider || "simulated",
            },
          },
        })
      )
    } catch (auditErr) {
      console.warn("[FollowUp StatusChange Audit Error]:", auditErr)
    }
  }

  // Update Application updatedAt timestamp to reset dormancy
  if (prisma?.application?.update) {
    try {
      await withDbRetry(() =>
        prisma.application.update({
          where: { id: applicationId },
          data: { updatedAt: now },
        })
      )
    } catch {
      // ignore
    }
  }

  // Update ApplicationAnalysis followUpStatus
  if (prisma?.applicationAnalysis?.update && analysis) {
    try {
      const existingStrategy = (analysis.applyStrategy as Record<string, unknown>) || {}
      await withDbRetry(() =>
        prisma.applicationAnalysis.update({
          where: { applicationId },
          data: {
            applyStrategy: {
              ...existingStrategy,
              followUpStatus: "DISPATCHED",
              lastFollowUpDispatchedAt: dispatchedAt,
            },
          },
        })
      )
    } catch (strategyErr) {
      console.warn("[FollowUp Strategy Update Error]:", strategyErr)
    }
  }

  // Invalidate Redis caches
  void invalidateCache(`applications:${userId}`)
  void invalidateCache(`dashboard:stats:${userId}`)
  void invalidateCache(`user:stats:${userId}`)

  return {
    success: true,
    message: dispatchResult.message || `Follow-up email dispatched to ${targetEmail}`,
    dispatchedAt,
    provider: dispatchResult.provider,
  }
}
