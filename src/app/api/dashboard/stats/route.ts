import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"

const statuses = ["Saved", "Applied", "Assessment", "Interview", "Rejected", "Offer"] as const

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [grouped, groupedSource, recent, total, allByDate] = await Promise.all([
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
    prisma.application.findMany({
      where: { userId },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ])

  const countMap = Object.fromEntries(
    grouped.map((g) => [g.status, g._count])
  )

  const monthlyMap: Record<string, number> = {}
  for (const app of allByDate) {
    const key = app.createdAt.toISOString().slice(0, 7)
    monthlyMap[key] = (monthlyMap[key] || 0) + 1
  }
  const trend = Object.entries(monthlyMap).map(([month, count]) => ({ month, count }))

  const bySource = groupedSource.map((g) => ({ source: g.source, count: g._count }))

  const stats = {
    total,
    ...Object.fromEntries(statuses.map((s) => [s.toLowerCase(), countMap[s] ?? 0])),
    recent,
    trend,
    bySource,
  }

  return NextResponse.json(stats)
}
