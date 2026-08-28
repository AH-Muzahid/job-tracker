import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { invalidateCache } from "@/lib/redis"
import { syncUserProfileToMemories } from "@/lib/profile-memory-sync"
import { z } from "zod"

const profileSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  headline: z.string().max(200).optional(),
  strengths: z.string().max(5000).optional(),
  weaknesses: z.string().max(5000).optional(),
  targetRoles: z.array(z.string()).optional(),
  preferredLocations: z.array(z.string()).optional(),
  salaryExpectation: z.string().max(100).optional(),
  noticePeriod: z.string().max(50).optional(),
  linkedinUrl: z.string().url().max(500).optional().nullable(),
  portfolioUrl: z.string().url().max(500).optional().nullable(),
}).passthrough()

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profile = await withDbRetry(() => prisma.userProfile.findUnique({ where: { userId } }))
  return NextResponse.json(profile || {})
}

export async function PUT(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = profileSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid fields", details: parsed.error.flatten() }, { status: 400 })
  }

  const profile = await withDbRetry(() =>
    prisma.userProfile.upsert({
      where: { userId },
      create: { userId, ...parsed.data },
      update: parsed.data,
    })
  )

  void invalidateCache(`user:profile:${userId}`)
  void syncUserProfileToMemories(userId).catch(() => {})

  return NextResponse.json(profile)
}
