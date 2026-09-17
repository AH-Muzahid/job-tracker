import { NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { computeLongitudinalMasteryAnalytics } from "@/lib/interview/company-benchmarks"

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateCheck = checkRateLimit(`interview-analytics:${userId}`, 60, 60 * 1000)
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck)
  }

  try {
    const sessions = await prisma.interviewSession.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        targetRole: true,
        targetCompany: true,
        interviewType: true,
        language: true,
        score: true,
        verdict: true,
        dialogue: true,
        report: true,
        createdAt: true,
      },
    })

    const analytics = computeLongitudinalMasteryAnalytics(sessions)

    return NextResponse.json(analytics)
  } catch (error) {
    console.error("[Interview Analytics GET Error]:", error)
    return NextResponse.json(
      { error: "Failed to compute interview mastery analytics" },
      { status: 500 }
    )
  }
}
