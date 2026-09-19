import { NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { checkDistributedRateLimit } from "@/lib/rate-limit"
import { generateExecutiveBriefing } from "@/lib/dashboard/briefing-engine"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const userId = await getInternalUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limit: 30 requests per 60 seconds per user
    const rateLimit = await checkDistributedRateLimit(`dashboard-briefing:${userId}`, 30, 60)
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": `${rateLimit.resetInSeconds}` } }
      )
    }

    const briefing = await generateExecutiveBriefing(userId)

    return NextResponse.json(briefing, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    })
  } catch (error) {
    console.error("[GET /api/dashboard/briefing Error]:", error)
    return NextResponse.json(
      { error: "Failed to generate executive briefing" },
      { status: 500 }
    )
  }
}
