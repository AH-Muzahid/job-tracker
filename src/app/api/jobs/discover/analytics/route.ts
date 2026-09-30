export const dynamic = "force-dynamic"

import { NextRequest } from "next/server"
import { z } from "zod"
import { getInternalUserId } from "@/lib/auth"
import { getDiscoveryFunnelMetrics } from "@/lib/discovery/telemetry"
import { ResponseUtil } from "@/lib/api-response"
import { checkDistributedRateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return ResponseUtil.unauthorized()
  }

  // Rate limit analytics queries (20 req / min)
  const rateLimit = await checkDistributedRateLimit(`discovery:analytics:${userId}`, 20, 60)
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit)
  }

  try {
    const { searchParams } = new URL(request.url)
    const daysParsed = z.coerce.number().int().min(1).max(365).default(30).safeParse(searchParams.get("days") || "30")
    const sinceDays = daysParsed.success ? daysParsed.data : 30

    const metrics = await getDiscoveryFunnelMetrics(userId, sinceDays)

    return ResponseUtil.success({
      metrics,
      windowDays: sinceDays,
    })
  } catch (error: unknown) {
    const err = error as Error
    console.error("[DiscoveryAnalytics API] GET Error:", err)
    return ResponseUtil.error(err?.message || "Failed to compute funnel metrics", 500)
  }
}
