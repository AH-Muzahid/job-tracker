/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { getProvider } from "@/lib/ai/client"
import { getUserAIConfig } from "@/lib/ai/config"
import { traceAIGeneration } from "@/lib/ai/telemetry"
import { extractJsonObject } from "@/lib/ai/json-extractor"
import { runEvaluatorOptimizer } from "@/lib/ai/evaluator-optimizer"
import {
  extractContactEmail,
  sanitizeOutreachPlaceholders,
  generateDeterministicOutreachBundle,
  OutreachChannel,
  OutreachChannelBundle,
  OutreachContext,
} from "@/lib/applications/outreach-engine"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Read optional channel parameter from body
  let requestedChannel: OutreachChannel | undefined = undefined
  try {
    const body = await request.json().catch(() => ({}))
    if (body.channel && ["email", "linkedin_dm", "linkedin_connect", "follow_up"].includes(body.channel)) {
      requestedChannel = body.channel as OutreachChannel
    }
  } catch {
    // Body is optional
  }

  // Fast targeted DB queries for application, user identity, profile, and default resume
  const [app, user, profile, defaultResume] = await Promise.all([
    withDbRetry(() =>
      prisma.application.findUnique({
        where: { id, userId },
        include: { analysis: true },
      })
    ),
    withDbRetry(() =>
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      })
    ),
    withDbRetry(() =>
      prisma.userProfile.findUnique({
        where: { userId },
        select: {
          linkedInUrl: true,
          githubUrl: true,
          portfolioUrl: true,
          bestProjects: true,
          strengths: true,
          experienceLevel: true,
        },
      })
    ),
    withDbRetry(() =>
      prisma.resume.findFirst({
        where: { userId, isDefault: true },
        select: { textContent: true },
      })
    ),
  ])

  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 })

  const candidateName = user?.name || "Candidate"
  const candidateEmail = user?.email || undefined

  // Extract contact email from notes or raw JD
  const rawJd = app.analysis?.rawJd || app.notes || ""
  const detectedEmail = extractContactEmail(rawJd)

  // Determine recommended outreach channel
  const recommendedChannel: OutreachChannel = detectedEmail
    ? "email"
    : app.source?.toLowerCase().includes("linkedin")
    ? "linkedin_dm"
    : "linkedin_connect"

  const activeChannel: OutreachChannel = requestedChannel || recommendedChannel

  const candidateSkills = profile?.strengths
    ? profile.strengths.split(/[,/|\n]+/).map((s) => s.trim()).filter((s) => s.length > 1)
    : ["React", "TypeScript", "Next.js", "Node.js"]

  const outreachCtx: OutreachContext = {
    companyName: app.companyName,
    jobTitle: app.jobTitle,
    candidateName,
    candidateEmail,
    githubUrl: profile?.githubUrl || undefined,
    linkedinUrl: profile?.linkedInUrl || undefined,
    portfolioUrl: profile?.portfolioUrl || undefined,
    skills: candidateSkills,
    topProjects: (profile?.bestProjects as any) || [],
    location: app.notes || undefined,
    notes: rawJd,
  }

  // Base deterministic fallback bundle
  const deterministicBundle = generateDeterministicOutreachBundle(outreachCtx)
  let finalBundle: OutreachChannelBundle = deterministicBundle

  const aiConfig = await getUserAIConfig(userId, undefined, { requireUserKey: true })

  if (aiConfig?.apiKey) {
    const resolvedProvider = getProvider({
      providerType: aiConfig.providerType as "openai" | "anthropic" | "google" | "custom-openai",
      apiKey: aiConfig.apiKey,
      baseUrl: aiConfig.baseUrl,
      model: aiConfig.model,
    })

    const targetModel = resolvedProvider.model(aiConfig.model || resolvedProvider.defaultModel)
    const truncatedJd = rawJd.length > 800 ? rawJd.slice(0, 800) + "..." : rawJd

    const bestProjectList = Array.isArray(profile?.bestProjects)
      ? (profile.bestProjects as any[]).map((p) => `${p.name} (${p.stack || ""}): ${p.description || ""}`).join("; ")
      : "Full-Stack Web Architecture"

    let channelInstruction = ""
    let jsonSchema = ""

    if (activeChannel === "linkedin_connect") {
      channelInstruction = `Focus EXCLUSIVELY on drafting a high-converting LinkedIn Connection Request note strictly under 280 characters for ${app.companyName}.`
      jsonSchema = `{
  "linkedin_connect": {
    "body": "Connection request note strictly under 280 characters"
  }
}`
    } else if (activeChannel === "linkedin_dm") {
      channelInstruction = `Focus EXCLUSIVELY on drafting a conversational LinkedIn InMail / Recruiter Direct Message under 90 words with a soft CTA.`
      jsonSchema = `{
  "linkedin_dm": {
    "subject": "${app.jobTitle} inquiry - ${candidateName}",
    "body": "Conversational DM message under 90 words"
  }
}`
    } else if (activeChannel === "follow_up") {
      channelInstruction = `Focus EXCLUSIVELY on drafting a courteous 5-7 business day follow-up email.`
      jsonSchema = `{
  "follow_up": {
    "subject": "Following up on ${app.jobTitle} application - ${candidateName}",
    "body": "Polite follow-up email after applying"
  }
}`
    } else {
      channelInstruction = `Focus EXCLUSIVELY on drafting a high-converting 3-paragraph direct application email (Max 120 words).`
      jsonSchema = `{
  "email": {
    "subject": "Application for ${app.jobTitle} - ${candidateName}",
    "body": "Full 3-paragraph email body with hook, technical project proof, and CTA"
  }
}`
    }

    const systemPrompt = `You are an elite executive outreach copywriter for top software engineers.
Your goal is to generate a tailored, high-converting outreach message for this job application.
${channelInstruction}

CRITICAL QUALITY & ZERO-PLACEHOLDER MANDATES:
1. NEVER output bracketed placeholders like "[Hiring Manager/Recruiter]", "[Your Name]", "[Company Name]", or "[Link]".
2. In email greetings, always use "Dear ${app.companyName} Hiring Team," or "Hi ${app.companyName} Team,".
3. In sign-offs, always use the candidate's verified name: "${candidateName}".
4. In linkedin_connect, STRICTLY KEEP THE LENGTH UNDER 280 CHARACTERS so it fits LinkedIn's free invitation character limit.
5. In linkedin_dm, write a conversational, high-impact message under 90 words with a direct soft CTA.
7. In follow_up, write a courteous 5-7 business day check-in.

CANDIDATE CONTEXT:
- Name: ${candidateName}
- Target Role: ${app.jobTitle}
- Target Company: ${app.companyName}
- Verified Skills: ${candidateSkills.join(", ")}
- Best Demonstrated Projects: ${bestProjectList}
- GitHub: ${profile?.githubUrl || "Available on request"}
- LinkedIn: ${profile?.linkedInUrl || "Available on request"}
${defaultResume?.textContent ? `- Resume Proof: ${defaultResume.textContent.slice(0, 300)}` : ""}

JOB DESCRIPTION EXCERPT:
${truncatedJd}

Respond ONLY in valid JSON format matching this schema:
${jsonSchema}`

    const startTime = Date.now()
    try {
      const evalResult = await runEvaluatorOptimizer<any>({
        maxIterations: 2,
        generator: async ({ critiqueFeedback }) => {
          const critiqueNote =
            critiqueFeedback && critiqueFeedback.length > 0
              ? `\nCRITICAL FIXES REQUIRED FROM PREVIOUS DRAFT EVALUATION:\n${critiqueFeedback.map((f) => `- ${f}`).join("\n")}\nPlease rewrite fixing these exact violations.`
              : ""

          const textResult = await generateText({
            model: targetModel,
            prompt: `Generate tailored ${activeChannel} outreach for ${app.jobTitle} at ${app.companyName}.${critiqueNote}\nOutput JSON only.`,
            system: systemPrompt,
          })

          const parsed = extractJsonObject<any>(textResult.text || "")
          if (!parsed) throw new Error("Invalid outreach JSON returned by model")
          return parsed
        },
        rubric: {
          disallowPlaceholders: true,
          maxCharacters: activeChannel === "linkedin_connect" ? 280 : 3000,
        },
        textExtractor: (parsed) => {
          if (parsed.email?.body) return parsed.email.body
          if (parsed.linkedin_connect?.body) return parsed.linkedin_connect.body
          if (parsed.linkedin_dm?.body) return parsed.linkedin_dm.body
          if (parsed.follow_up?.body) return parsed.follow_up.body
          return JSON.stringify(parsed)
        },
        fallbackSanitizer: (content) => sanitizeOutreachPlaceholders(content, outreachCtx),
      })

      const parsed = evalResult.content
      if (parsed) {
        if (parsed.email?.body) {
          finalBundle.email = {
            subject: sanitizeOutreachPlaceholders(parsed.email.subject || deterministicBundle.email.subject, outreachCtx),
            body: sanitizeOutreachPlaceholders(parsed.email.body, outreachCtx),
          }
        }
        if (parsed.linkedin_dm?.body) {
          finalBundle.linkedin_dm = {
            subject: sanitizeOutreachPlaceholders(parsed.linkedin_dm.subject || deterministicBundle.linkedin_dm.subject, outreachCtx),
            body: sanitizeOutreachPlaceholders(parsed.linkedin_dm.body, outreachCtx),
          }
        }
        if (parsed.linkedin_connect?.body) {
          const sanitizedConnect = sanitizeOutreachPlaceholders(parsed.linkedin_connect.body, outreachCtx).slice(0, 300)
          finalBundle.linkedin_connect = {
            body: sanitizedConnect,
            charCount: sanitizedConnect.length,
          }
        }
        if (parsed.follow_up?.body) {
          finalBundle.follow_up = {
            subject: sanitizeOutreachPlaceholders(parsed.follow_up.subject || deterministicBundle.follow_up.subject, outreachCtx),
            body: sanitizeOutreachPlaceholders(parsed.follow_up.body, outreachCtx),
          }
        }
      }

      void traceAIGeneration({
        name: "outreach-email-generator",
        userId,
        model: aiConfig.model || resolvedProvider.defaultModel,
        provider: aiConfig.providerType,
        input: { companyName: app.companyName, jobTitle: app.jobTitle, channel: activeChannel },
        output: { channel: activeChannel, subject: finalBundle[activeChannel === "linkedin_connect" ? "linkedin_dm" : activeChannel]?.subject },
        promptTokens: (textResult as any).usage?.promptTokens,
        completionTokens: (textResult as any).usage?.completionTokens,
        latencyMs: Date.now() - startTime,
        status: "success",
        tags: ["outreach", "multi-channel", activeChannel],
        flush: true,
      })
    } catch (error) {
      console.warn("[OutreachAPI] AI generation failed, using deterministic materials:", error)
      void traceAIGeneration({
        name: "outreach-email-generator",
        userId,
        model: aiConfig.model || resolvedProvider.defaultModel,
        provider: aiConfig.providerType,
        input: { companyName: app.companyName, jobTitle: app.jobTitle },
        latencyMs: Date.now() - startTime,
        status: "error",
        error,
        tags: ["outreach", "error", "fallback-to-deterministic"],
        flush: true,
      })
    }
  }

  // Active channel payload
  let activeSubject = finalBundle.email.subject
  let activeBody = finalBundle.email.body

  if (activeChannel === "linkedin_dm") {
    activeSubject = finalBundle.linkedin_dm.subject
    activeBody = finalBundle.linkedin_dm.body
  } else if (activeChannel === "linkedin_connect") {
    activeSubject = `${app.jobTitle} - LinkedIn Invitation`
    activeBody = finalBundle.linkedin_connect.body
  } else if (activeChannel === "follow_up") {
    activeSubject = finalBundle.follow_up.subject
    activeBody = finalBundle.follow_up.body
  }

  const defaultChecklist = [
    "Verified GitHub/LinkedIn/portfolio links included",
    `Mentioned core technical strengths: ${candidateSkills.slice(0, 3).join(", ")}`,
    "Highlighted top demonstrated projects",
    "Zero placeholders: 100% ready to submit",
  ]

  const now = new Date()

  // Persist generated outreach materials directly to PostgreSQL ApplicationAnalysis
  try {
    const existingTailored = (app.analysis?.tailoredResumeJson as any) || {}
    const updatedTailored = {
      ...existingTailored,
      outreachChannels: finalBundle,
      detectedEmail,
      recommendedChannel,
    }

    await withDbRetry(() =>
      prisma.applicationAnalysis.upsert({
        where: { applicationId: id },
        create: {
          applicationId: id,
          outreachSubject: activeSubject,
          outreachBody: activeBody,
          outreachChecklist: defaultChecklist,
          outreachGeneratedAt: now,
          tailoredResumeJson: updatedTailored,
        },
        update: {
          outreachSubject: activeSubject,
          outreachBody: activeBody,
          outreachChecklist: defaultChecklist,
          outreachGeneratedAt: now,
          tailoredResumeJson: updatedTailored,
        },
      })
    )
  } catch (persistErr) {
    console.warn("[OutreachAPI] Failed to persist analysis to DB:", persistErr)
  }

  return NextResponse.json({
    channel: activeChannel,
    subject: activeSubject,
    email: activeBody,
    channels: finalBundle,
    detectedEmail,
    recommendedChannel,
    beforeSendChecklist: defaultChecklist,
    outreachGeneratedAt: now.toISOString(),
  })
}
