import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const allApps = await prisma.application.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })

  const total = allApps.length

  const stats = {
    total,
    saved: allApps.filter((a) => a.status === "Saved").length,
    applied: allApps.filter((a) => a.status === "Applied").length,
    assessment: allApps.filter((a) => a.status === "Assessment").length,
    interview: allApps.filter((a) => a.status === "Interview").length,
    rejected: allApps.filter((a) => a.status === "Rejected").length,
    offer: allApps.filter((a) => a.status === "Offer").length,
    recent: allApps.slice(0, 5),
  }

  return NextResponse.json(stats)
}
