import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { getCachedJson, setCachedJson, invalidateCache } from "@/lib/redis"

interface UserMemoryRecord {
  id: string
  userId: string
  category: string
  content: string
  source?: string | null
  createdAt: Date
  updatedAt: Date
}

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const cacheKey = `user:memories:${userId}`
  const cached = await getCachedJson<UserMemoryRecord[]>(cacheKey)
  if (cached) return NextResponse.json(cached)

  try {
    const memories = await withDbRetry<UserMemoryRecord[]>(() =>
      prisma.userMemory.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      })
    )

    void setCachedJson(cacheKey, memories, 3600)
    return NextResponse.json(memories)
  } catch (error) {
    console.error("GET user memories error:", error)
    return NextResponse.json({ error: "Failed to fetch memories" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { category, content } = body

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Memory content is required" }, { status: 400 })
    }

    const memory = await withDbRetry<UserMemoryRecord>(() =>
      prisma.userMemory.create({
        data: {
          userId,
          category: category || "general",
          content: content.trim(),
          source: "manual",
        },
      })
    )

    // Invalidate Redis caches immediately
    await Promise.all([
      invalidateCache(`user:memories:${userId}`),
      invalidateCache(`settings:bundle:${userId}`),
    ])

    return NextResponse.json(memory, { status: 201 })
  } catch (error) {
    console.error("POST user memory error:", error)
    return NextResponse.json({ error: "Failed to create memory" }, { status: 500 })
  }
}
