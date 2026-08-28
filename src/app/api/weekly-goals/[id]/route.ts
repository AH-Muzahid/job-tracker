import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateGoalSchema = z.object({
  goal1: z.string().max(500).optional(),
  goal2: z.string().max(500).nullable().optional(),
  goal3: z.string().max(500).nullable().optional(),
  completed1: z.boolean().optional(),
  completed2: z.boolean().optional(),
  completed3: z.boolean().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = updateGoalSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid fields", details: parsed.error.flatten() }, { status: 400 })
  }

  const updated = await prisma.weeklyGoal.updateMany({
    where: { id, userId },
    data: parsed.data,
  })

  if (updated.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const deleted = await prisma.weeklyGoal.deleteMany({ where: { id, userId } })

  if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true })
}
