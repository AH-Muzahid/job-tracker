import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { invalidateCache } from "@/lib/redis"

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

  try {
    const memories = await withDbRetry<UserMemoryRecord[]>(() =>
      prisma.userMemory.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      })
    )
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

    // Invalidate Redis cache
    void invalidateCache(`user:memories:${userId}`)

    return NextResponse.json(memory, { status: 201 })
  } catch (error) {
    console.error("POST user memory error:", error)
    return NextResponse.json({ error: "Failed to create memory" }, { status: 500 })
  }
}
