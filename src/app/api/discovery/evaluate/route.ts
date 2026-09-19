import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { z } from "zod"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { getProvider } from "@/lib/ai/client"
import { getUserAIConfig } from "@/lib/ai/config"
import { getSystemBase } from "@/lib/ai/prompts/system-base"
import { getJdScanPrompt } from "@/lib/ai/prompts/jd-scan"
import { JDAnalysisSchema } from "@/lib/ai/structured-output"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { extractTechTagsFromText } from "@/lib/discovery/scrapers"
import { evaluateJobScamRisk } from "@/lib/discovery/matching"
import { getCompanyEnrichment } from "@/lib/discovery/company-enrichment"
import {
  buildCareerGraphFromText,
  traverseGraphForJD,
  getCachedKnowledgeGraph,
  saveKnowledgeGraph,
} from "@/lib/ai/knowledge-graph"

export const runtime = "nodejs"
export const maxDuration = 30

const EvaluateInputSchema = z.object({
  url: z.string().optional().or(z.literal("")),
  rawText: z.string().optional().or(z.literal("")),
  companyName: z.string().optional(),
  jobTitle: z.string().optional(),
  source: z.string().optional(),
  applicationId: z.string().optional(),
  generatePackage: z.boolean().optional().default(false),
}).refine(
  (data) => (data.url && data.url.trim().length > 0) || (data.rawText && data.rawText.trim().length > 0),
  { message: "Either job URL or job description text is required" }
)

export async function POST(request: NextRequest) {
  try {
    const userId = await getInternalUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateCheck = checkRateLimit(`discovery-evaluate:${userId}`, 15, 60 * 1000)
    if (!rateCheck.success) {
      return rateLimitResponse(rateCheck)
    }

    const body = await request.json()
    const validation = EvaluateInputSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid request payload" },
        { status: 400 }
      )
    }

    const {
      url: inputUrl,
      rawText: inputRawText,
      companyName: overrideCompany,
      jobTitle: overrideTitle,
      source: _source = "Direct",
      applicationId,
    } = validation.data

    let finalJdText = (inputRawText || "").trim()
    let targetUrl = (inputUrl || "").trim()
    let scrapedTitle = ""

    // Auto-detect if rawText itself is a URL
    if (!targetUrl && /^https?:\/\/[^\s]+$/i.test(finalJdText)) {
      targetUrl = finalJdText
      finalJdText = ""
    }

    // Scrape URL if provided and raw text is insufficient (< 50 chars)
    if (targetUrl && (!finalJdText || finalJdText.length < 50)) {
      try {
        const parsedUrl = new URL(targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`)
        const hostname = parsedUrl.hostname.toLowerCase()

        // SSRF protection: reject localhost, loopback, private ranges, local names
        if (
          hostname === "localhost" ||
          hostname === "127.0.0.1" ||
          hostname === "0.0.0.0" ||
          hostname.startsWith("192.168.") ||
          hostname.startsWith("10.") ||
          hostname.startsWith("172.") ||
          hostname.endsWith(".local") ||
          hostname.endsWith(".internal")
        ) {
          return NextResponse.json(
            { error: "Access to private or local network URLs is prohibited (SSRF Protection)" },
            { status: 400 }
          )
        }

        const res = await fetch(parsedUrl.toString(), {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          signal: AbortSignal.timeout(10_000),
        })

        if (!res.ok) {
          return NextResponse.json(
            { error: `Failed to fetch job post from URL (HTTP ${res.status})` },
            { status: 502 }
          )
        }

        const contentLength = res.headers.get("content-length")
        if (contentLength && parseInt(contentLength, 10) > 2 * 1024 * 1024) {
          return NextResponse.json({ error: "Job post page exceeds 2MB limit" }, { status: 400 })
        }

        const html = await res.text()
        const truncatedHtml = html.length > 2 * 1024 * 1024 ? html.slice(0, 2 * 1024 * 1024) : html

        const titleMatch = truncatedHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
        scrapedTitle = titleMatch ? titleMatch[1].trim() : ""

        const extractedText = truncatedHtml
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
          .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, " ")
          .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, " ")
          .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()

        if (extractedText.length >= 50) {
          finalJdText = extractedText
        } else {
          return NextResponse.json(
            { error: "Could not extract sufficient text from URL. Please paste the job description text manually." },
            { status: 422 }
          )
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error scraping URL"
        return NextResponse.json({ error: `URL Scraping failed: ${msg}` }, { status: 502 })
      }
    }

    if (!finalJdText || finalJdText.length < 30) {
      return NextResponse.json(
        { error: "Job description text is too short or could not be extracted (minimum 30 characters required)" },
        { status: 400 }
      )
    }

    // 1. Extract Tech Stack from text
    const extractedTechTags = extractTechTagsFromText(finalJdText)

    // 2. Evaluate Scam Risk
    const detectedCompanyHint =
      overrideCompany ||
      scrapedTitle.split(/[-|–]/)[1]?.trim() ||
      finalJdText.match(/(?:at|company:?)\s+([A-Z][A-Za-z0-9\s&]{2,25})/i)?.[1]?.trim() ||
      ""

    const detectedTitleHint =
      overrideTitle ||
      scrapedTitle.split(/[-|–]/)[0]?.trim() ||
      finalJdText.match(/(?:role:?|title:?|hiring a:?)\s+([A-Z][A-Za-z0-9\s-]{3,30})/i)?.[1]?.trim() ||
      ""

    const scamEval = evaluateJobScamRisk({
      title: detectedTitleHint,
      company: detectedCompanyHint,
      description: finalJdText,
      url: targetUrl || undefined,
    })

    // 3. Fetch candidate profile and Career Knowledge Graph
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

    interface ProjectDetail {
      name: string
      stack?: string
      description?: string
    }

    let userContext = `Candidate: ${user?.name || "Candidate"}`
    if (profile) {
      userContext += `\nLevel: ${profile.experienceLevel || "Not specified"}`
      userContext += `\nSkills: ${profile.strengths || "Not specified"}`
      if (profile.bestProjects) {
        const projects = profile.bestProjects as unknown as ProjectDetail[]
        if (Array.isArray(projects) && projects.length > 0) {
          userContext +=
            "\nProjects: " +
            projects.map((p) => `${p.name} (${p.stack || ""}): ${p.description || ""}`).join("; ")
        }
      }
    }
    if (defaultResume?.textContent) {
      userContext += `\nResume Excerpt: ${defaultResume.textContent.slice(0, 4000)}`
    }

    // Traverse knowledge graph
    let graph = await getCachedKnowledgeGraph(userId)
    if (!graph) {
      const rawText = (defaultResume?.textContent || "") + "\n" + (profile?.strengths || "")
      graph = buildCareerGraphFromText(rawText, profile)
      void saveKnowledgeGraph(userId, graph)
    }

    const graphMatch = traverseGraphForJD(graph, finalJdText)
    if (graphMatch.evidencePaths.length > 0) {
      userContext += "\n\nVerified Knowledge Graph Proofs:\n" + graphMatch.evidencePaths.join("\n")
    }

    // 4. Company Intel Enrichment
    let companyIntel = null
    const companyToLookup = overrideCompany || detectedCompanyHint
    if (companyToLookup && companyToLookup.length >= 2) {
      try {
        companyIntel = getCompanyEnrichment(companyToLookup)
      } catch {
        companyIntel = null
      }
    }

    // 5. LLM Fit Evaluation (with intelligent heuristic fallback)
    const aiConfig = await getUserAIConfig(userId)
    let analysisResult: z.infer<typeof JDAnalysisSchema>

    if (aiConfig) {
      try {
        const resolvedProvider = getProvider({
          providerType: aiConfig.providerType as "openai" | "anthropic" | "google" | "custom-openai",
          apiKey: aiConfig.apiKey,
          baseUrl: aiConfig.baseUrl,
          model: aiConfig.model,
        })

        const targetModel = resolvedProvider.model(aiConfig.model || resolvedProvider.defaultModel)
        const systemPrompt = `${getSystemBase()}\n\n${getJdScanPrompt()}\n\n## Candidate Context\n${userContext}\n\nCRITICAL OUTPUT RULE: Respond ONLY with a single raw JSON object matching the schema. Do not write markdown backticks or text outside JSON.`
        const truncatedJd = finalJdText.length > 8000 ? finalJdText.slice(0, 8000) + "..." : finalJdText

        const textResult = await generateText({
          model: targetModel,
          system: systemPrompt,
          prompt: `Analyze this job description:\n\n${truncatedJd}`,
        })

        analysisResult = parseAndNormalizeAnalysis(textResult.text || "")
      } catch (aiErr) {
        console.warn("AI generation failed or timed out, falling back to deterministic analysis:", aiErr)
        analysisResult = generateDeterministicAnalysis({
          finalJdText,
          overrideCompany,
          overrideTitle,
          detectedCompanyHint,
          detectedTitleHint,
          extractedTechTags,
          profile,
          scamEval,
        })
      }
    } else {
      // Deterministic evaluation when AI is not configured
      analysisResult = generateDeterministicAnalysis({
        finalJdText,
        overrideCompany,
        overrideTitle,
        detectedCompanyHint,
        detectedTitleHint,
        extractedTechTags,
        profile,
        scamEval,
      })
    }

    // 6. Integrate Scam Risk into Verdict & Score
    const scamRiskScore = Math.round(scamEval.scamScore * 100)
    const isScamFlagged = scamEval.isSuspicious || scamRiskScore >= 50
    if (isScamFlagged) {
      analysisResult.matchScore = Math.min(analysisResult.matchScore, 25)
      analysisResult.verdict = "Likely Scam / Avoid"
      const scamWarning = `Scam heuristic risk score: ${scamRiskScore}/100. Flags: ${scamEval.flags.join(", ")}`
      analysisResult.redFlags = analysisResult.redFlags
        ? `${scamWarning}; ${analysisResult.redFlags}`
        : scamWarning
    }

    // 7. Save to PostgreSQL if an existing Application was targeted
    if (applicationId) {
      await withDbRetry(async () => {
        const app = await prisma.application.findFirst({
          where: { id: applicationId, userId },
        })

        if (app) {
          await prisma.applicationAnalysis.upsert({
            where: { applicationId },
            create: {
              applicationId,
              matchScore: analysisResult.matchScore,
              confidence: analysisResult.confidence || "Medium",
              verdict: analysisResult.verdict,
              jdKeywords: analysisResult.missingGaps.missingKeywords,
              gapAnalysis: analysisResult.missingGaps,
              resumeAdvice: analysisResult.resumeAdvice,
              applyStrategy: analysisResult.applyStrategy,
              redFlags: analysisResult.redFlags,
              finalRecommendation: analysisResult.finalRecommendation,
              rawJd: finalJdText,
              rawAnalysis: JSON.stringify(analysisResult),
            },
            update: {
              matchScore: analysisResult.matchScore,
              confidence: analysisResult.confidence || "Medium",
              verdict: analysisResult.verdict,
              jdKeywords: analysisResult.missingGaps.missingKeywords,
              gapAnalysis: analysisResult.missingGaps,
              resumeAdvice: analysisResult.resumeAdvice,
              applyStrategy: analysisResult.applyStrategy,
              redFlags: analysisResult.redFlags,
              finalRecommendation: analysisResult.finalRecommendation,
              rawJd: finalJdText,
              rawAnalysis: JSON.stringify(analysisResult),
            },
          })

          // Enrich application details if they were placeholders
          const updates: { companyName?: string; jobTitle?: string; jobUrl?: string } = {}
          if ((app.companyName === "Analyzing..." || !app.companyName) && analysisResult.roleSnapshot.company) {
            updates.companyName = analysisResult.roleSnapshot.company
          }
          if ((app.jobTitle === "Analyzing..." || !app.jobTitle) && analysisResult.roleSnapshot.role) {
            updates.jobTitle = analysisResult.roleSnapshot.role
          }
          if (!app.jobUrl && targetUrl) {
            updates.jobUrl = targetUrl
          }
          if (Object.keys(updates).length > 0) {
            await prisma.application.update({
              where: { id: applicationId },
              data: updates,
            })
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      sourceUrl: targetUrl || null,
      scrapedTitle: scrapedTitle || null,
      roleSnapshot: {
        company: overrideCompany || analysisResult.roleSnapshot.company || detectedCompanyHint || "Target Company",
        role: overrideTitle || analysisResult.roleSnapshot.role || detectedTitleHint || "Target Role",
        experienceAsked: analysisResult.roleSnapshot.experienceAsked || "Relevant Experience",
        keyStack: Array.from(new Set([...(analysisResult.roleSnapshot.keyStack || []), ...extractedTechTags])),
        workSetup: analysisResult.roleSnapshot.workSetup || null,
      },
      matchScore: analysisResult.matchScore,
      confidence: analysisResult.confidence || "High",
      verdict: analysisResult.verdict,
      whyThisScore: analysisResult.whyThisScore || [],
      missingGaps: analysisResult.missingGaps,
      extractedSkills: extractedTechTags,
      redFlags: analysisResult.redFlags,
      scamEvaluation: {
        riskScore: scamRiskScore,
        level: scamRiskScore >= 60 ? "flagged" : scamRiskScore >= 30 ? "suspicious" : "clean",
        reasons: scamEval.flags,
        isFlagged: isScamFlagged,
      },
      companyIntel: companyIntel
        ? {
            stage: companyIntel.stage,
            headcount: companyIntel.headcount,
            industry: companyIntel.industry,
            verified: companyIntel.verified,
            isRemoteFirst: companyIntel.isRemoteFirst,
            cultureHighlights: companyIntel.cultureHighlights,
          }
        : null,
      finalRecommendation: analysisResult.finalRecommendation || "Review match details and stage application",
      resumeAdvice: analysisResult.resumeAdvice || {},
      applyStrategy: analysisResult.applyStrategy || {},
      applicationId: applicationId || null,
    })
  } catch (error: unknown) {
    console.error("Discovery Evaluate API error:", error)
    const errMsg = error instanceof Error ? error.message : "Failed to evaluate job description"
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

/**
 * Deterministic fallback analysis engine
 */
function generateDeterministicAnalysis({
  finalJdText,
  overrideCompany,
  overrideTitle,
  detectedCompanyHint,
  detectedTitleHint,
  extractedTechTags,
  profile,
  scamEval,
}: {
  finalJdText: string
  overrideCompany?: string
  overrideTitle?: string
  detectedCompanyHint: string
  detectedTitleHint: string
  extractedTechTags: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any
  scamEval: { scamScore: number; flags: string[]; isSuspicious: boolean }
}): z.infer<typeof JDAnalysisSchema> {
  const isFlagged = scamEval.isSuspicious || scamEval.scamScore >= 0.5
  const candidateSkills = (profile?.strengths || "")
    .toLowerCase()
    .split(/[,;|\n]/)
    .map((s: string) => s.trim())
    .filter(Boolean)

  const matchedSkills: string[] = []
  const missingSkills: string[] = []

  for (const tag of extractedTechTags) {
    const isMatched = candidateSkills.some(
      (cs: string) => cs.includes(tag.toLowerCase()) || tag.toLowerCase().includes(cs)
    )
    if (isMatched) {
      matchedSkills.push(tag)
    } else {
      missingSkills.push(tag)
    }
  }

  let calculatedScore = 70
  if (extractedTechTags.length > 0) {
    const ratio = matchedSkills.length / extractedTechTags.length
    calculatedScore = Math.round(50 + ratio * 45)
  }

  if (isFlagged) {
    calculatedScore = 20
  }

  const verdict: "Strong Apply" | "Apply After Minor Tweaks" | "Stretch Apply" | "Low ROI / Skip" | "Likely Scam / Avoid" =
    isFlagged
      ? "Likely Scam / Avoid"
      : calculatedScore >= 80
      ? "Strong Apply"
      : calculatedScore >= 60
      ? "Apply After Minor Tweaks"
      : "Stretch Apply"

  return {
    roleSnapshot: {
      company: overrideCompany || detectedCompanyHint || "Target Company",
      role: overrideTitle || detectedTitleHint || "Software Engineer",
      experienceAsked: "2+ years relevant experience",
      keyStack: extractedTechTags,
      workSetup: /remote/i.test(finalJdText) ? "Remote" : /hybrid/i.test(finalJdText) ? "Hybrid" : "On-site",
    },
    matchScore: calculatedScore,
    confidence: "Medium",
    verdict,
    whyThisScore: [
      matchedSkills.length > 0
        ? `Direct alignment on core stack: ${matchedSkills.slice(0, 4).join(", ")}`
        : "Foundational software engineering alignment",
      `Detected ${extractedTechTags.length} target technical requirements from job posting`,
    ],
    missingGaps: {
      missingKeywords: missingSkills.slice(0, 6),
      missingProof: missingSkills.slice(0, 3),
      missingTools: missingSkills.slice(0, 3),
      stretchAreas: [],
      fixableGaps: missingSkills.slice(0, 3).map((s) => `Highlight transferable projects using ${s}`),
    },
    resumeAdvice: {
      emphasize: matchedSkills.slice(0, 5),
      addIfTruthful: missingSkills.slice(0, 3),
      foregroundProjects: [],
      needsCustomVersion: missingSkills.length > 2,
      linkedInTweak: false,
    },
    applyStrategy: {
      bestPath: "Direct Application & Targeted Outreach",
      outreachNeeded: true,
      contactTarget: "Hiring Manager or Technical Recruiter",
      timing: "Within 48 hours",
      angle: "Highlight proven delivery with core stack technologies",
    },
    redFlags: scamEval.flags.length > 0 ? scamEval.flags.join("; ") : null,
    finalRecommendation:
      isFlagged
        ? "Do not apply. Potential fraudulent posting detected."
        : calculatedScore >= 80
        ? "Priority opportunity. Tailor your resume bullets and package application."
        : "Solid opportunity. Address key skill gaps in cover letter before submitting.",
  }
}

/**
 * Parses and normalizes raw LLM output into structured schema
 */
function parseAndNormalizeAnalysis(rawText: string): z.infer<typeof JDAnalysisSchema> {
  const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim()
  const jsonStart = cleaned.indexOf("{")
  const jsonEnd = cleaned.lastIndexOf("}")

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("Could not find JSON object bounds in AI response")
  }

  const jsonStr = cleaned.substring(jsonStart, jsonEnd + 1).replace(/[^\x00-\x7F]+/g, " ")
  const parsed = JSON.parse(jsonStr)

  const matchScore =
    typeof parsed.matchScore === "number"
      ? parsed.matchScore
      : typeof parsed.estimatedMatchScore?.score === "number"
      ? parsed.estimatedMatchScore.score
      : typeof parsed.score === "number"
      ? parsed.score
      : 75

  const confidence = parsed.confidence || parsed.estimatedMatchScore?.confidence || "Medium"
  const verdict = parsed.verdict || "Apply After Minor Tweaks"
  const whyThisScore = Array.isArray(parsed.whyThisScore) ? parsed.whyThisScore : ["Strong technical alignment"]

  const missingGapsRaw = parsed.missingGaps || parsed.missingGapAnalysis || {}
  const missingGaps = {
    missingKeywords: Array.isArray(missingGapsRaw.missingKeywords) ? missingGapsRaw.missingKeywords : [],
    missingProof: Array.isArray(missingGapsRaw.missingProof) ? missingGapsRaw.missingProof : [],
    missingTools: Array.isArray(missingGapsRaw.missingTools) ? missingGapsRaw.missingTools : [],
    stretchAreas: Array.isArray(missingGapsRaw.stretchAreas) ? missingGapsRaw.stretchAreas : [],
    fixableGaps: Array.isArray(missingGapsRaw.fixableGaps) ? missingGapsRaw.fixableGaps : [],
  }

  const resumeAdviceRaw = parsed.resumeAdvice || parsed.resumeTargetingAdvice || {}
  const resumeAdvice = {
    emphasize: Array.isArray(resumeAdviceRaw.emphasize) ? resumeAdviceRaw.emphasize : [],
    addIfTruthful: Array.isArray(resumeAdviceRaw.addIfTruthful) ? resumeAdviceRaw.addIfTruthful : [],
    foregroundProjects: Array.isArray(resumeAdviceRaw.foregroundProjects) ? resumeAdviceRaw.foregroundProjects : [],
    needsCustomVersion: Boolean(resumeAdviceRaw.needsCustomVersion),
    linkedInTweak: Boolean(resumeAdviceRaw.linkedInTweak),
  }

  const applyStrategyRaw = parsed.applyStrategy || {}
  const applyStrategy = {
    bestPath: applyStrategyRaw.bestPath || "Direct Email / Application",
    outreachNeeded: Boolean(applyStrategyRaw.outreachNeeded),
    contactTarget: applyStrategyRaw.contactTarget || null,
    timing: applyStrategyRaw.timing || null,
    angle: applyStrategyRaw.angle || null,
  }

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
    redFlags: typeof parsed.redFlags === "string" ? parsed.redFlags : null,
    finalRecommendation: parsed.finalRecommendation || "Apply with targeted resume bullets",
  }
}
