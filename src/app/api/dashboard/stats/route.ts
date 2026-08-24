import { NextResponse } from "next/server"
import { prisma, withDbRetry } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"
import { getCachedJson, setCachedJson } from "@/lib/redis"

const statuses = ["Saved", "Applied", "Assessment", "Interview", "Rejected", "Offer"] as const

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cacheKey = `user:stats:${userId}`
  const cached = await getCachedJson<Record<string, unknown>>(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Single retry wrapper around Promise.all to prevent 6 parallel retry loops colliding
  const [grouped, groupedSource, recent, total, monthlyTrend, followUpApps] = await withDbRetry(() =>
    Promise.all([
      prisma.application.groupBy({
        by: ["status"],
        where: { userId },
        _count: true,
      }),
      prisma.application.groupBy({
        by: ["source"],
        where: { userId },
        _count: true,
        orderBy: { _count: { source: "desc" } },
      }),
      prisma.application.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.application.count({ where: { userId } }),
      prisma.$queryRaw<{ month: string; count: bigint }[]>`
        SELECT TO_CHAR("createdAt", 'YYYY-MM') as month, COUNT(*)::bigint as count
        FROM "Application"
        WHERE "userId" = ${userId}
        GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
        ORDER BY month ASC
      `,
      prisma.application.findMany({
        where: {
          userId,
          status: { in: ["Applied", "Assessment"] },
          applicationDate: { lte: sevenDaysAgo },
        },
        select: {
          id: true,
          companyName: true,
          jobTitle: true,
          applicationDate: true,
          status: true,
        },
        orderBy: { applicationDate: "asc" },
        take: 3,
      }),
    ])
  )

  const countMap = Object.fromEntries(
    grouped.map((g) => [g.status, g._count])
  )

  const trend = monthlyTrend.map((row) => ({
    month: row.month,
    count: Number(row.count),
  }))

  const bySource = groupedSource.map((g) => ({ source: g.source, count: g._count }))

  const stats = {
    total,
    ...Object.fromEntries(statuses.map((s) => [s.toLowerCase(), countMap[s] ?? 0])),
    recent,
    trend,
    bySource,
    followUpApps,
  }

  void setCachedJson(cacheKey, stats, 60)

  return NextResponse.json(stats)
}
