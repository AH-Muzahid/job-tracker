import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const goals = await prisma.weeklyGoal.findMany({
    where: { userId },
    orderBy: { weekStart: "desc" },
    take: 12,
  })

  return NextResponse.json(goals)
}

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay() + 1)
  weekStart.setHours(0, 0, 0, 0)

  const existing = await prisma.weeklyGoal.findFirst({
    where: { userId, weekStart },
  })

  if (existing) {
    const goal = await prisma.weeklyGoal.update({
      where: { id: existing.id },
      data: {
        goal1: body.goal1, goal1Target: body.goal1Target,
        goal2: body.goal2, goal2Target: body.goal2Target,
        goal3: body.goal3, goal3Target: body.goal3Target,
        blockers: body.blockers, notes: body.notes,
      },
    })
    return NextResponse.json(goal)
  }

  const goal = await prisma.weeklyGoal.create({
    data: {
      userId,
      weekStart,
      goal1: body.goal1, goal1Target: body.goal1Target,
      goal2: body.goal2, goal2Target: body.goal2Target,
      goal3: body.goal3, goal3Target: body.goal3Target,
      blockers: body.blockers, notes: body.notes,
    },
  })

  return NextResponse.json(goal)
}
