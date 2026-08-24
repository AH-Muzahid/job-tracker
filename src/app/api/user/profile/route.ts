import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { invalidateCache } from "@/lib/redis"

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profile = await prisma.userProfile.findUnique({ where: { userId } })
  return NextResponse.json(profile || {})
}

export async function PUT(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const profile = await prisma.userProfile.upsert({
    where: { userId },
    create: { userId, ...body },
    update: body,
  })

  // Invalidate Redis profile cache
  void invalidateCache(`user:profile:${userId}`)

  return NextResponse.json(profile)
}
