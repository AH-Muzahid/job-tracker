/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { generateText } from "ai"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { getProvider } from "@/lib/ai/client"
import { getUserAIConfig } from "@/lib/ai/config"
import { traceAIGeneration } from "@/lib/ai/telemetry"
import { extractJsonObject } from "@/lib/ai/json-extractor"
import {
  cleanJobTitle,
  sanitizeOutreachPlaceholders,
  generateDeterministicScreenerAnswers,
  pruneRelevantStack,
  OutreachContext,
  ScreenerQA,
} from "@/lib/applications/outreach-engine"

const FormQuestionsInputSchema = z.object({
  questions: z.array(z.string().trim().min(3)).max(15).optional(),
  rawText: z.string().trim().optional(),
  suggestDefaults: z.boolean().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: z.infer<typeof FormQuestionsInputSchema> = {}
  try {
    const raw = await request.json().catch(() => ({}))
    const parsed = FormQuestionsInputSchema.safeParse(raw)
    if (parsed.success) {
      body = parsed.data
    }
  } catch {
    // Body is optional
  }

  // Load application, user profile, and resume in parallel
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
  const cleanRole = cleanJobTitle(app.jobTitle) || "Software Engineer"

  const candidateSkills = profile?.strengths
    ? profile.strengths.split(/[,/|\n]+/).map((s) => s.trim()).filter((s) => s.length > 1)
    : ["React", "TypeScript", "Next.js", "Node.js"]

  const prunedCandidateSkills = pruneRelevantStack(candidateSkills, cleanRole, 4)

  const outreachCtx: OutreachContext = {
    companyName: app.companyName,
    jobTitle: cleanRole,
    candidateName,
    candidateEmail,
    githubUrl: profile?.githubUrl || undefined,
    linkedinUrl: profile?.linkedInUrl || undefined,
    portfolioUrl: profile?.portfolioUrl || undefined,
    skills: candidateSkills,
    topProjects: (profile?.bestProjects as any) || [],
    location: app.notes || undefined,
    notes: app.analysis?.rawJd || app.notes || "",
  }

  // Parse questions from array, raw text, or default suggestions
  let extractedQuestions: string[] = []

  if (body.questions && Array.isArray(body.questions) && body.questions.length > 0) {
    extractedQuestions = body.questions
  } else if (body.rawText) {
    // Split by line or bullet points
    extractedQuestions = body.rawText
      .split(/\r?\n+/)
      .map((line) => line.replace(/^[\d+.)\-*\s]+/, "").trim())
      .filter((q) => q.length >= 8 && (q.endsWith("?") || q.length > 15))
  }

  if (extractedQuestions.length === 0 || body.suggestDefaults) {
    extractedQuestions = [
      `Why are you interested in joining ${app.companyName} as a ${cleanRole}?`,
      `Describe a recent project where you engineered with ${prunedCandidateSkills} and solved a difficult challenge.`,
      `What is your current availability, work authorization, or preferred work arrangement?`,
    ]
  }

  // Deduplicate and slice to max 10 questions to prevent token blowup
  extractedQuestions = Array.from(new Set(extractedQuestions)).slice(0, 10)

  // Determine domain focus
  const jobTitleLower = cleanRole.toLowerCase()
  let targetRoleDomain: "frontend" | "backend" | "fullstack" | "mobile" | "devops" = "fullstack"
  if (/front-?end|ui|ux|react|vue|angular|web design|client/i.test(jobTitleLower) && !/full-?stack/i.test(jobTitleLower)) {
    targetRoleDomain = "frontend"
  } else if (/back-?end|api|distributed|infra|database|microservice|golang|java|python/i.test(jobTitleLower) && !/full-?stack/i.test(jobTitleLower)) {
    targetRoleDomain = "backend"
  } else if (/devops|sre|platform|infrastructure|cloud|kubernetes/i.test(jobTitleLower)) {
    targetRoleDomain = "devops"
  } else if (/mobile|ios|android|react native|flutter/i.test(jobTitleLower)) {
    targetRoleDomain = "mobile"
  }

  let finalScreenerAnswers: ScreenerQA[] = generateDeterministicScreenerAnswers(
    outreachCtx,
    extractedQuestions,
    targetRoleDomain
  )

  const aiConfig = await getUserAIConfig(userId, undefined, { requireUserKey: true })

  if (aiConfig?.apiKey) {
    const resolvedProvider = getProvider({
      providerType: aiConfig.providerType as "openai" | "anthropic" | "google" | "custom-openai",
      apiKey: aiConfig.apiKey,
      baseUrl: aiConfig.baseUrl,
      model: aiConfig.model,
    })

    const targetModel = resolvedProvider.model(aiConfig.model || resolvedProvider.defaultModel)
    const bestProjectList = Array.isArray(profile?.bestProjects)
      ? (profile.bestProjects as any[])
          .map((p) => `${p.name} (${pruneRelevantStack(p.stack || "", cleanRole, 3)}): ${p.description || "Production system"}`)
          .join("; ")
      : "Full-Stack Web Architecture (Stack: TypeScript, Next.js, Node.js)"

    const systemPrompt = `You are an elite principal engineer and interview copywriter for top software engineers.
Your goal is to generate tailored, high-converting answers for specific screening questions on an ATS job application form.

TARGET ROLE: ${cleanRole} at ${app.companyName}
TARGET DOMAIN: ${targetRoleDomain.toUpperCase()}
CANDIDATE: ${candidateName}
SKILLS: ${prunedCandidateSkills}
BEST DEMONSTRATED PROJECTS: ${bestProjectList}
${defaultResume?.textContent ? `RESUME EXCERPT: ${defaultResume.textContent.slice(0, 300)}` : ""}

CRITICAL HIGH-CONVERSION & ANTI-ROBOTIC RULES:
1. WORD LIMIT: Each answer must be strictly 40–80 words (concise, high-impact).
2. NO ROBOTIC FORMULAS: Never start with "As a [role]...", "I am writing to...", or "proving I can...".
3. GROUNDED IN TRUTH: Reference candidate's verified projects and metrics without hallucination.
4. DOMAIN RELEVANCE: Keep answers focused on ${targetRoleDomain.toUpperCase()} challenges.
5. ZERO PLACEHOLDERS: Never output bracketed text like [Company] or [Your Name]. Always address ${app.companyName} and ${candidateName} naturally.
6. ZERO HASHTAGS: Never include social media hashtags anywhere.

Respond ONLY with valid JSON matching this schema:
{
  "screenerAnswers": [
    {
      "question": "Exact question text",
      "answer": "High-converting, concise 40-80 word answer"
    }
  ]
}`

    const startTime = Date.now()
    try {
      const textResult = await generateText({
        model: targetModel,
        system: systemPrompt,
        prompt: `Please answer the following application form screening questions for ${app.companyName}:\n${extractedQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}\n\nOutput JSON only.`,
      })

      const parsed = extractJsonObject<{ screenerAnswers: ScreenerQA[] }>(textResult.text || "")
      if (parsed?.screenerAnswers && Array.isArray(parsed.screenerAnswers) && parsed.screenerAnswers.length > 0) {
        finalScreenerAnswers = parsed.screenerAnswers.map((qa) => ({
          question: sanitizeOutreachPlaceholders(qa.question, outreachCtx),
          answer: sanitizeOutreachPlaceholders(qa.answer, outreachCtx),
        }))
      }

      void traceAIGeneration({
        name: "form-questions-answerer",
        userId,
        model: aiConfig.model || resolvedProvider.defaultModel,
        provider: aiConfig.providerType,
        input: { companyName: app.companyName, jobTitle: app.jobTitle, questionCount: extractedQuestions.length },
        output: { answerCount: finalScreenerAnswers.length },
        latencyMs: Date.now() - startTime,
        status: "success",
        tags: ["form_questions", "on_demand", "ats_answers"],
        flush: true,
      })
    } catch (err) {
      console.warn("[FormQuestionsAPI] AI generation failed, using deterministic answers:", err)
    }
  }

  // Persist the answered questions to applicationAnalysis
  try {
    const existingTailored = (app.analysis?.tailoredResumeJson as any) || {}
    const existingChannels = existingTailored.outreachChannels || {}
    const existingPortal = existingChannels.form_portal || { portalNote: app.analysis?.outreachBody || "" }

    const updatedChannels = {
      ...existingChannels,
      form_portal: {
        ...existingPortal,
        screenerAnswers: finalScreenerAnswers,
      },
    }

    const updatedTailored = {
      ...existingTailored,
      outreachChannels: updatedChannels,
    }

    await withDbRetry(() =>
      prisma.applicationAnalysis.upsert({
        where: { applicationId: id },
        create: {
          applicationId: id,
          outreachSubject: `${cleanRole} - Application Cover Note & Screener Q&A`,
          outreachBody: existingPortal.portalNote || `I am excited to apply for ${cleanRole} at ${app.companyName}.`,
          tailoredResumeJson: updatedTailored,
        },
        update: {
          tailoredResumeJson: updatedTailored,
        },
      })
    )
  } catch (persistErr) {
    console.warn("[FormQuestionsAPI] Failed to persist screener answers to DB:", persistErr)
  }

  return NextResponse.json({
    success: true,
    screenerAnswers: finalScreenerAnswers,
  })
}
