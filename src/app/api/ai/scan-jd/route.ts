import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { cookies } from "next/headers"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { getProvider } from "@/lib/ai/client"
import { getSystemBase } from "@/lib/ai/prompts/system-base"
import { getJdScanPrompt } from "@/lib/ai/prompts/jd-scan"
import { JDAnalysisSchema } from "@/lib/ai/structured-output"
import { decrypt } from "@/lib/encryption"
import { z } from "zod"

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const cookieStore = await cookies()
  const encrypted = cookieStore.get("ai_config")?.value
  if (!encrypted) {
    return NextResponse.json({ error: "AI provider not configured" }, { status: 400 })
  }

  let aiConfig: { providerType: string; apiKey: string; baseUrl?: string; model?: string }
  try {
    const decrypted = decrypt(encrypted)
    aiConfig = JSON.parse(decrypted)
  } catch {
    return NextResponse.json({ error: "Invalid AI configuration" }, { status: 400 })
  }

  const { jdText, applicationId } = await request.json()
  if (!jdText) return NextResponse.json({ error: "jdText is required" }, { status: 400 })

  // Fast targeted user profile context
  const [user, profile, defaultResume] = await Promise.all([
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

  let userContext = `Candidate: ${user?.name || "Candidate"}`
  if (profile) {
    userContext += `\nLevel: ${profile.experienceLevel || "Not specified"}`
    userContext += `\nSkills: ${profile.strengths || "Not specified"}`
    if (profile.bestProjects) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const projects = profile.bestProjects as Array<any>
      if (Array.isArray(projects) && projects.length > 0) {
        userContext += "\nProjects: " + projects.map((p) => `${p.name} (${p.stack || ""}): ${p.description || ""}`).join("; ")
      }
    }
  }
  if (defaultResume?.textContent) {
    userContext += `\nResume Excerpt: ${defaultResume.textContent.slice(0, 600)}`
  }

  const systemPrompt = `${getSystemBase()}\n\n${getJdScanPrompt()}\n\n## Candidate Context\n${userContext}\n\nCRITICAL OUTPUT RULE: Respond ONLY with a single raw JSON object matching the schema. Keep text fields concise (1 short sentence max per reason/recommendation). Do not write markdown backticks or text outside JSON.`

  const resolvedProvider = getProvider({
    providerType: aiConfig.providerType as "openai" | "anthropic" | "google" | "custom-openai",
    apiKey: aiConfig.apiKey,
    baseUrl: aiConfig.baseUrl,
    model: aiConfig.model,
  })

  const targetModel = resolvedProvider.model(aiConfig.model || resolvedProvider.defaultModel)
  const truncatedJd = jdText.length > 1800 ? jdText.slice(0, 1800) + "..." : jdText

  let analysis: z.infer<typeof JDAnalysisSchema>

  try {
    const textResult = await generateText({
      model: targetModel,
      system: systemPrompt,
      prompt: `Analyze this job description:\n\n${truncatedJd}`,
    })

    const rawText = textResult.text || ""
    analysis = parseAndNormalizeJdAnalysis(rawText)
  } catch (err: unknown) {
    console.error("scan-jd AI execution error:", err)
    const errMsg = err instanceof Error ? err.message : "AI scan failed"
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }

  if (applicationId) {
    await withDbRetry(async () => {
      const exists = await prisma.applicationAnalysis.findUnique({
        where: { applicationId },
      })

      if (exists) {
        await prisma.applicationAnalysis.update({
          where: { applicationId },
          data: {
            matchScore: analysis.matchScore,
            confidence: analysis.confidence,
            verdict: analysis.verdict,
            jdKeywords: analysis.missingGaps.missingKeywords,
            gapAnalysis: analysis.missingGaps,
            resumeAdvice: analysis.resumeAdvice,
            applyStrategy: analysis.applyStrategy,
            redFlags: analysis.redFlags,
            finalRecommendation: analysis.finalRecommendation,
            rawJd: jdText,
            rawAnalysis: JSON.stringify(analysis),
          },
        })
      } else {
        await prisma.applicationAnalysis.create({
          data: {
            applicationId,
            matchScore: analysis.matchScore,
            confidence: analysis.confidence,
            verdict: analysis.verdict,
            jdKeywords: analysis.missingGaps.missingKeywords,
            gapAnalysis: analysis.missingGaps,
            resumeAdvice: analysis.resumeAdvice,
            applyStrategy: analysis.applyStrategy,
            redFlags: analysis.redFlags,
            finalRecommendation: analysis.finalRecommendation,
            rawJd: jdText,
            rawAnalysis: JSON.stringify(analysis),
          },
        })
      }

      // Auto-enrich placeholder details on parent Application
      const app = await prisma.application.findUnique({
        where: { id: applicationId },
      })
      if (app) {
        const updateData: { companyName?: string; jobTitle?: string } = {}
        if (app.companyName === "Analyzing..." && analysis.roleSnapshot.company) {
          const cleanCompany = analysis.roleSnapshot.company.replace(/\s*\(.*?\)\s*/g, " ").trim()
          updateData.companyName = cleanCompany || analysis.roleSnapshot.company
        }
        if (app.jobTitle === "Analyzing..." && analysis.roleSnapshot.role) {
          updateData.jobTitle = analysis.roleSnapshot.role
        }
        if (Object.keys(updateData).length > 0) {
          await prisma.application.update({
            where: { id: applicationId },
            data: updateData,
          })
        }
      }
    })
  }

  return NextResponse.json(analysis)
}

/**
 * Extracts, cleans, and normalizes JD Analysis JSON from raw model text output
 */
function parseAndNormalizeJdAnalysis(rawText: string): z.infer<typeof JDAnalysisSchema> {
  // Strip markdown codeblocks
  const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim()
  
  const jsonStart = cleaned.indexOf("{")
  const jsonEnd = cleaned.lastIndexOf("}")

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("Could not find JSON object bounds in raw response")
  }

  let jsonStr = cleaned.substring(jsonStart, jsonEnd + 1)

  // Remove stray non-ASCII or illegal characters before key names (e.g. Korean '만들기')
  jsonStr = jsonStr.replace(/[^\x00-\x7F]+/g, " ")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: any
  try {
    parsed = JSON.parse(jsonStr)
  } catch (parseError) {
    console.error("JSON parse failed on string:", jsonStr)
    throw parseError
  }

  return normalizeJdAnalysis(parsed)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeJdAnalysis(parsed: any): z.infer<typeof JDAnalysisSchema> {
  const matchScore =
    typeof parsed.matchScore === "number"
      ? parsed.matchScore
      : typeof parsed.estimatedMatchScore?.score === "number"
      ? parsed.estimatedMatchScore.score
      : typeof parsed.score === "number"
      ? parsed.score
      : 75

  const confidence =
    parsed.confidence || parsed.estimatedMatchScore?.confidence || "Medium"

  const verdict =
    parsed.verdict || "Apply After Minor Tweaks"

  const whyThisScore =
    Array.isArray(parsed.whyThisScore) ? parsed.whyThisScore : ["Good stack alignment"]

  const missingGapsRaw = parsed.missingGaps || parsed.missingGapAnalysis || {}
  const missingGaps = {
    missingKeywords: Array.isArray(missingGapsRaw.missingKeywords) ? missingGapsRaw.missingKeywords : [],
    missingProof: Array.isArray(missingGapsRaw.missingProof) ? missingGapsRaw.missingProof : [],
    missingTools: Array.isArray(missingGapsRaw.missingTools) ? missingGapsRaw.missingTools : [],
    stretchAreas: Array.isArray(missingGapsRaw.stretchAreas) ? missingGapsRaw.stretchAreas : [],
    fixableGaps: Array.isArray(missingGapsRaw.fixableGaps)
      ? missingGapsRaw.fixableGaps
      : Array.isArray(missingGapsRaw.fixableWordingGaps)
      ? missingGapsRaw.fixableWordingGaps
      : [],
  }

  const resumeAdviceRaw = parsed.resumeAdvice || parsed.resumeTargetingAdvice || {}
  const resumeAdvice = {
    emphasize: Array.isArray(resumeAdviceRaw.emphasize)
      ? resumeAdviceRaw.emphasize
      : Array.isArray(resumeAdviceRaw.keywordsToEmphasize)
      ? resumeAdviceRaw.keywordsToEmphasize
      : [],
    addIfTruthful: Array.isArray(resumeAdviceRaw.addIfTruthful)
      ? resumeAdviceRaw.addIfTruthful
      : Array.isArray(resumeAdviceRaw.addOrRewrite)
      ? resumeAdviceRaw.addOrRewrite
      : [],
    foregroundProjects: Array.isArray(resumeAdviceRaw.foregroundProjects)
      ? resumeAdviceRaw.foregroundProjects
      : Array.isArray(resumeAdviceRaw.bestProjectsToForeground)
      ? resumeAdviceRaw.bestProjectsToForeground
      : [],
    needsCustomVersion: Boolean(resumeAdviceRaw.needsCustomVersion || resumeAdviceRaw.customVersionRequired),
    linkedInTweak: Boolean(resumeAdviceRaw.linkedInTweak || resumeAdviceRaw.linkedinTweakNeeded),
  }

  const applyStrategyRaw = parsed.applyStrategy || {}
  const applyStrategy = {
    bestPath: applyStrategyRaw.bestPath || "Direct Email / Application",
    outreachNeeded: Boolean(applyStrategyRaw.outreachNeeded),
    contactTarget: applyStrategyRaw.contactTarget || null,
    timing: applyStrategyRaw.timing || null,
    angle: applyStrategyRaw.angle || null,
  }

  const redFlags =
    typeof parsed.redFlags === "string"
      ? parsed.redFlags
      : Array.isArray(parsed.redFlagsOrCautions)
      ? parsed.redFlagsOrCautions.join("; ")
      : null

  const finalRecommendation =
    parsed.finalRecommendation || parsed.finalActionRecommendation || "Apply with tailored resume"

  const roleSnapshotRaw = parsed.roleSnapshot || {}
  const roleSnapshot = {
    company: roleSnapshotRaw.company || null,
    role: roleSnapshotRaw.role || "Target Role",
    experienceAsked: roleSnapshotRaw.experienceAsked || "Relevant Experience",
    keyStack: Array.isArray(roleSnapshotRaw.keyStack)
      ? roleSnapshotRaw.keyStack
      : Array.isArray(roleSnapshotRaw.keyStackTools)
      ? roleSnapshotRaw.keyStackTools
      : [],
    workSetup: roleSnapshotRaw.workSetup || null,
  }

  return {
    roleSnapshot,
    matchScore: Math.min(100, Math.max(0, matchScore)),
    confidence: ["High", "Medium", "Low"].includes(confidence) ? confidence : "Medium",
    verdict: [
      "Strong Apply",
      "Apply After Minor Tweaks",
      "Stretch Apply",
      "Low ROI / Skip",
      "Likely Scam / Avoid",
    ].includes(verdict)
      ? verdict
      : "Apply After Minor Tweaks",
    whyThisScore,
    missingGaps,
    resumeAdvice,
    applyStrategy,
    redFlags,
    finalRecommendation,
  }
}
