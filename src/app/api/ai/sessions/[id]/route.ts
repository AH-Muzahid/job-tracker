import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { getCachedJson, setCachedJson, invalidateCache } from "@/lib/redis"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const cacheKey = `session:data:${id}`

  // 1. Check Redis cache first (sub-15ms)
  const cached = await getCachedJson<Record<string, unknown>>(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  // 2. Fetch from Database
  const session = await withDbRetry(() =>
    prisma.chatSession.findFirst({
      where: { id, userId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    })
  )

  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // 3. Cache for 1 hour
  void setCachedJson(cacheKey, session, 3600)

  return NextResponse.json(session)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  let body: { title?: string; mode?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const updateData: { title?: string; mode?: string } = {}
  if (typeof body.title === "string") updateData.title = body.title
  if (typeof body.mode === "string") updateData.mode = body.mode

  const session = await withDbRetry(() =>
    prisma.chatSession.updateMany({
      where: { id, userId },
      data: updateData,
    })
  )

  if (session.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Invalidate Redis caches
  void invalidateCache(`session:data:${id}`)
  void invalidateCache(`user:sessions:${userId}`)

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const deleted = await withDbRetry(() =>
    prisma.chatSession.deleteMany({
      where: { id, userId },
    })
  )

  if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Invalidate Redis caches
  void invalidateCache(`session:data:${id}`)
  void invalidateCache(`user:sessions:${userId}`)

  return NextResponse.json({ success: true })
}
