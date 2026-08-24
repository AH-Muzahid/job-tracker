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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const memory = await withDbRetry<UserMemoryRecord | null>(() =>
      prisma.userMemory.findUnique({
        where: { id },
      })
    )

    if (!memory || memory.userId !== userId) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 })
    }

    await withDbRetry(() =>
      prisma.userMemory.delete({
        where: { id },
      })
    )

    // Invalidate Redis caches immediately
    await Promise.all([
      invalidateCache(`user:memories:${userId}`),
      invalidateCache(`settings:bundle:${userId}`),
    ])

    return NextResponse.json({ success: true, message: "Memory deleted" })
  } catch (error) {
    console.error("DELETE user memory error:", error)
    return NextResponse.json({ error: "Failed to delete memory" }, { status: 500 })
  }
}
