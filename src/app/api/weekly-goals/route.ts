import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const goals = await withDbRetry(() =>
    prisma.weeklyGoal.findMany({
      where: { userId },
      orderBy: { weekStart: "desc" },
      take: 12,
    })
  )

  return NextResponse.json(goals)
}

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()

  if (!body.goal1 || typeof body.goal1 !== "string" || !body.goal1.trim()) {
    return NextResponse.json({ error: "goal1 is required" }, { status: 400 })
  }

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay() + 1)
  weekStart.setHours(0, 0, 0, 0)

  const goalData = {
    goal1: body.goal1,
    goal1Target: body.goal1Target ?? null,
    goal2: body.goal2 ?? null,
    goal2Target: body.goal2Target ?? null,
    goal3: body.goal3 ?? null,
    goal3Target: body.goal3Target ?? null,
    blockers: body.blockers ?? null,
    notes: body.notes ?? null,
  }

  // Use upsert instead of find + update/create to avoid 2 queries
  const goal = await withDbRetry(() =>
    prisma.weeklyGoal.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      update: goalData,
      create: { userId, weekStart, ...goalData },
    })
  )

  return NextResponse.json(goal)
}
