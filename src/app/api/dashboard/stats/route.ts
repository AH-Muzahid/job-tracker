import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"

const statuses = ["Saved", "Applied", "Assessment", "Interview", "Rejected", "Offer"] as const

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [grouped, recent, total] = await Promise.all([
    prisma.application.groupBy({
      by: ["status"],
      where: { userId },
      _count: true,
    }),
    prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.application.count({ where: { userId } }),
  ])

  const countMap = Object.fromEntries(
    grouped.map((g) => [g.status, g._count])
  )

  const stats = {
    total,
    ...Object.fromEntries(statuses.map((s) => [s.toLowerCase(), countMap[s] ?? 0])),
    recent,
  }

  return NextResponse.json(stats)
}
