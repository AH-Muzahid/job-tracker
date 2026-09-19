import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"

const UpdateAnalysisSchema = z.object({
  outreachSubject: z.string().max(300).optional().nullable(),
  outreachBody: z.string().max(25000).optional().nullable(),
  outreachChecklist: z.array(z.string()).optional().nullable(),
  outreachGeneratedAt: z.string().datetime().optional().nullable(),
  tailoredResumeJson: z.any().optional().nullable(),
  matchScore: z.number().int().min(0).max(100).optional().nullable(),
  verdict: z.string().optional().nullable(),
  confidence: z.string().optional().nullable(),
  rawJd: z.string().optional().nullable(),
})

const PostAnalysisSchema = z.object({
  analysis: z.object({
    matchScore: z.number().optional().nullable(),
    confidence: z.string().optional().nullable(),
    verdict: z.string().optional().nullable(),
    missingGaps: z.any().optional().nullable(),
    resumeAdvice: z.any().optional().nullable(),
    applyStrategy: z.any().optional().nullable(),
    redFlags: z.any().optional().nullable(),
    finalRecommendation: z.string().optional().nullable(),
  }),
  rawJd: z.string().optional().nullable(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const app = await withDbRetry(() => prisma.application.findFirst({ where: { id, userId } }))
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const analysis = await withDbRetry(() =>
    prisma.applicationAnalysis.findUnique({
      where: { applicationId: id },
    })
  )

  return NextResponse.json(analysis || {})
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const app = await withDbRetry(() => prisma.application.findFirst({ where: { id, userId } }))
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 })

  try {
    const json = await request.json()
    const parsed = UpdateAnalysisSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.format() },
        { status: 400 }
      )
    }

    const data = parsed.data

    const updatedAnalysis = await withDbRetry(() =>
      prisma.applicationAnalysis.upsert({
        where: { applicationId: id },
        create: {
          applicationId: id,
          outreachSubject: data.outreachSubject ?? null,
          outreachBody: data.outreachBody ?? null,
          outreachChecklist: data.outreachChecklist === null ? Prisma.JsonNull : (data.outreachChecklist ?? undefined),
          outreachGeneratedAt: data.outreachGeneratedAt ? new Date(data.outreachGeneratedAt) : undefined,
          tailoredResumeJson: data.tailoredResumeJson === null ? Prisma.JsonNull : (data.tailoredResumeJson ?? undefined),
          rawJd: data.rawJd ?? undefined,
          matchScore: data.matchScore ?? undefined,
          verdict: data.verdict ?? undefined,
          confidence: data.confidence ?? undefined,
        },
        update: {
          ...(data.outreachSubject !== undefined && { outreachSubject: data.outreachSubject }),
          ...(data.outreachBody !== undefined && { outreachBody: data.outreachBody }),
          ...(data.outreachChecklist !== undefined && {
            outreachChecklist: data.outreachChecklist === null ? Prisma.JsonNull : data.outreachChecklist,
          }),
          ...(data.outreachGeneratedAt !== undefined && {
            outreachGeneratedAt: data.outreachGeneratedAt ? new Date(data.outreachGeneratedAt) : null,
          }),
          ...(data.tailoredResumeJson !== undefined && {
            tailoredResumeJson: data.tailoredResumeJson === null ? Prisma.JsonNull : (data.tailoredResumeJson as Prisma.InputJsonValue),
          }),
          ...(data.rawJd !== undefined && { rawJd: data.rawJd }),
          ...(data.matchScore !== undefined && { matchScore: data.matchScore }),
          ...(data.verdict !== undefined && { verdict: data.verdict }),
          ...(data.confidence !== undefined && { confidence: data.confidence }),
        },
      })
    )

    return NextResponse.json(updatedAnalysis)
  } catch (err) {
    console.error("PATCH analysis error:", err)
    return NextResponse.json({ error: "Failed to update analysis" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const app = await withDbRetry(() => prisma.application.findFirst({ where: { id, userId } }))
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 })

  try {
    const body = await request.json()
    const parsed = PostAnalysisSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid analysis payload", details: parsed.error.format() },
        { status: 400 }
      )
    }

    const { analysis, rawJd } = parsed.data

    const updatedAnalysis = await withDbRetry(() =>
      prisma.applicationAnalysis.upsert({
        where: { applicationId: id },
        create: {
          applicationId: id,
          matchScore: analysis.matchScore ?? null,
          confidence: analysis.confidence ?? null,
          verdict: analysis.verdict ?? null,
          jdKeywords: analysis.missingGaps?.missingKeywords || [],
          gapAnalysis: analysis.missingGaps || {},
          resumeAdvice: analysis.resumeAdvice || {},
          applyStrategy: analysis.applyStrategy || {},
          redFlags: typeof analysis.redFlags === "string" ? analysis.redFlags : null,
          finalRecommendation: analysis.finalRecommendation || "",
          rawJd: rawJd || "",
          rawAnalysis: JSON.stringify(analysis),
        },
        update: {
          matchScore: analysis.matchScore ?? null,
          confidence: analysis.confidence ?? null,
          verdict: analysis.verdict ?? null,
          jdKeywords: analysis.missingGaps?.missingKeywords || [],
          gapAnalysis: analysis.missingGaps || {},
          resumeAdvice: analysis.resumeAdvice || {},
          applyStrategy: analysis.applyStrategy || {},
          redFlags: typeof analysis.redFlags === "string" ? analysis.redFlags : null,
          finalRecommendation: analysis.finalRecommendation || "",
          rawJd: rawJd || "",
          rawAnalysis: JSON.stringify(analysis),
        },
      })
    )

    return NextResponse.json(updatedAnalysis)
  } catch (err) {
    console.error("Save analysis error:", err)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
