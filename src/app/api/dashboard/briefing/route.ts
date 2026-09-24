import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { checkDistributedRateLimit } from "@/lib/rate-limit"
import { generateExecutiveBriefing } from "@/lib/dashboard/briefing-engine"
import { getCachedJson, setCachedJson } from "@/lib/redis"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const userId = await getInternalUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request ? new URL(request.url).searchParams : new URL("http://localhost").searchParams
    const isForceRefresh = searchParams.get("refresh") === "true"

    const cacheKey = `user:briefing:v1:${userId}`
    if (!isForceRefresh) {
      const cached = await getCachedJson<Record<string, unknown>>(cacheKey)
      if (cached) {
        return NextResponse.json(cached, {
          status: 200,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        })
      }
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
    void setCachedJson(cacheKey, briefing, 3600) // 1 hour server cache

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
