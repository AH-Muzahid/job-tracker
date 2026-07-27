import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const app = await prisma.application.findFirst({ where: { id, userId } })
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const analysis = await prisma.applicationAnalysis.findUnique({
    where: { applicationId: id },
  })

  return NextResponse.json(analysis || {})
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const app = await prisma.application.findFirst({ where: { id, userId } })
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 })

  try {
    const body = await request.json()
    const { analysis, rawJd } = body

    if (!analysis) {
      return NextResponse.json({ error: "Analysis data is required" }, { status: 400 })
    }

    const updatedAnalysis = await prisma.applicationAnalysis.upsert({
      where: { applicationId: id },
      create: {
        applicationId: id,
        matchScore: analysis.matchScore,
        confidence: analysis.confidence,
        verdict: analysis.verdict,
        jdKeywords: analysis.missingGaps?.missingKeywords || [],
        gapAnalysis: analysis.missingGaps || {},
        resumeAdvice: analysis.resumeAdvice || {},
        applyStrategy: analysis.applyStrategy || {},
        redFlags: analysis.redFlags || null,
        finalRecommendation: analysis.finalRecommendation || "",
        rawJd: rawJd || "",
        rawAnalysis: JSON.stringify(analysis),
      },
      update: {
        matchScore: analysis.matchScore,
        confidence: analysis.confidence,
        verdict: analysis.verdict,
        jdKeywords: analysis.missingGaps?.missingKeywords || [],
        gapAnalysis: analysis.missingGaps || {},
        resumeAdvice: analysis.resumeAdvice || {},
        applyStrategy: analysis.applyStrategy || {},
        redFlags: analysis.redFlags || null,
        finalRecommendation: analysis.finalRecommendation || "",
        rawJd: rawJd || "",
        rawAnalysis: JSON.stringify(analysis),
      },
    })

    return NextResponse.json(updatedAnalysis)
  } catch (err) {
    console.error("Save analysis error:", err)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
