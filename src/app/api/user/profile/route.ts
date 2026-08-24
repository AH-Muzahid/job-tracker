import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { invalidateCache } from "@/lib/redis"
import { syncUserProfileToMemories } from "@/lib/profile-memory-sync"

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profile = await withDbRetry(() => prisma.userProfile.findUnique({ where: { userId } }))
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

  const profile = await withDbRetry(() =>
    prisma.userProfile.upsert({
      where: { userId },
      create: { userId, ...body },
      update: body,
    })
  )

  // Invalidate Redis profile cache
  void invalidateCache(`user:profile:${userId}`)

  // Auto-sync facts from profile into semantic memories
  void syncUserProfileToMemories(userId).catch((err) =>
    console.warn("[Profile to Memory AutoSync Warning]:", err)
  )

  return NextResponse.json(profile)
}
