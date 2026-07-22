import { NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { cookies } from "next/headers"
import { getInternalUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getProvider } from "@/lib/ai/client"
import { buildFullContext } from "@/lib/ai/context-builder"
import { getSystemBase } from "@/lib/ai/prompts/system-base"
import { getJdScanPrompt } from "@/lib/ai/prompts/jd-scan"
import { JDAnalysisSchema } from "@/lib/ai/structured-output"
import { decrypt } from "@/lib/encryption"

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

  const context = await buildFullContext(userId, "jd-scan")
  const systemPrompt = `${getSystemBase()}\n\n${getJdScanPrompt()}\n\n## User Context\n${context}`

  const resolvedProvider = getProvider({
    providerType: aiConfig.providerType as "openai" | "anthropic" | "google" | "custom-openai",
    apiKey: aiConfig.apiKey,
    baseUrl: aiConfig.baseUrl,
    model: aiConfig.model,
  })

  const result = await generateObject({
    model: resolvedProvider.model(aiConfig.model || resolvedProvider.defaultModel),
    system: systemPrompt,
    prompt: `Analyze this job description:\n\n${jdText}`,
    schema: JDAnalysisSchema,
  })

  const analysis = result.object

  if (applicationId) {
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
  }

  return NextResponse.json(analysis)
}
