import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { checkDistributedRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import {
  benchmarkOfferCompensation,
  calculatePipelineLeverage,
  generateNegotiationStrategies,
  saveOfferNegotiationStrategy,
  OfferDetailsData,
} from "@/lib/applications/negotiate-engine"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const app = await withDbRetry(() =>
      prisma.application.findUnique({
        where: { id, userId },
        include: { company: true },
      })
    )

    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    const offerDetails = (app.offerDetails as unknown as OfferDetailsData) || null
    const leverage = await calculatePipelineLeverage(userId, id)

    let benchmark = null
    if (offerDetails?.baseSalary) {
      benchmark = benchmarkOfferCompensation({
        jobTitle: app.jobTitle,
        baseSalary: offerDetails.baseSalary,
        currency: offerDetails.currency || "USD",
      })
    }

    return NextResponse.json({
      applicationId: app.id,
      companyName: app.company?.name || app.companyName,
      jobTitle: app.jobTitle,
      status: app.status,
      offerDetails,
      benchmark,
      leverage,
    })
  } catch (error: unknown) {
    console.error("[GET /api/applications/[id]/negotiate error]:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateLimitKey = `rate:negotiate:${userId}`
  const limitCheck = await checkDistributedRateLimit(rateLimitKey, 15, 60)
  if (!limitCheck.success) {
    return rateLimitResponse(limitCheck)
  }

  const { id } = await params

  let body: {
    baseSalary: number
    currency?: string
    bonus?: number
    equity?: string | number
    signingBonus?: number
    deadline?: string
    benefitsNotes?: string
    rawOfferText?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.baseSalary || typeof body.baseSalary !== "number" || body.baseSalary <= 0) {
    return NextResponse.json(
      { error: "Valid baseSalary is required (positive number)" },
      { status: 400 }
    )
  }

  try {
    const [app, user, profile] = await Promise.all([
      withDbRetry(() =>
        prisma.application.findUnique({
          where: { id, userId },
          include: { company: true },
        })
      ),
      withDbRetry(() =>
        prisma.user.findUnique({
          where: { id: userId },
          select: { name: true },
        })
      ),
      (async () => {
        try {
          if (!prisma?.userProfile?.findUnique) return null
          return await withDbRetry(() =>
            prisma.userProfile.findUnique({
              where: { userId },
              select: { experienceLevel: true },
            })
          )
        } catch {
          return null
        }
      })(),
    ])

    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    const companyName = app.company?.name || app.companyName
    const jobTitle = app.jobTitle
    const candidateName = user?.name || "Candidate"
    const currency = (body.currency || "USD").toUpperCase()

    // 1. Calculate Market Benchmark
    const { marketBand, percentileRank, statusDescription } = benchmarkOfferCompensation({
      jobTitle,
      seniority: profile?.experienceLevel || undefined,
      currency,
      baseSalary: body.baseSalary,
    })

    // 2. Calculate Pipeline Leverage
    const leverage = await calculatePipelineLeverage(userId, id)

    // 3. Generate 3 Tiered Strategies
    const strategies = await generateNegotiationStrategies({
      userId,
      companyName,
      jobTitle,
      candidateName,
      baseSalary: body.baseSalary,
      currency,
      bonus: body.bonus,
      equity: body.equity,
      marketBand,
      leverage,
    })

    const offerData: OfferDetailsData = {
      baseSalary: body.baseSalary,
      currency,
      bonus: body.bonus,
      equity: body.equity,
      signingBonus: body.signingBonus,
      deadline: body.deadline,
      benefitsNotes: body.benefitsNotes,
      rawOfferText: body.rawOfferText,
      marketPercentileRank: percentileRank,
      marketBand,
      leverage,
      strategies,
      savedAt: new Date().toISOString(),
    }

    // 4. Persist to PostgreSQL
    await saveOfferNegotiationStrategy(id, userId, offerData)

    return NextResponse.json({
      success: true,
      applicationId: id,
      companyName,
      jobTitle,
      marketBand,
      percentileRank,
      statusDescription,
      leverage,
      strategies,
      savedAt: offerData.savedAt,
    })
  } catch (error: unknown) {
    console.error("[POST /api/applications/[id]/negotiate error]:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}
