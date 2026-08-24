import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { invalidateCache } from "@/lib/redis"
import { syncUserProfileToMemories } from "@/lib/profile-memory-sync"

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()

  const profile = await withDbRetry(() =>
    prisma.userProfile.upsert({
      where: { userId },
      create: { userId, ...body },
      update: body,
    })
  )

  void invalidateCache(`user:profile:${userId}`)

  // Auto-sync onboarding fields to memories
  void syncUserProfileToMemories(userId).catch((err) =>
    console.warn("[Onboard to Memory AutoSync Warning]:", err)
  )

  return NextResponse.json(profile)
}
