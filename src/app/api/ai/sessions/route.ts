import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { getCachedJson, setCachedJson, invalidateCache } from "@/lib/redis"
import { generateHeuristicTitle } from "@/lib/ai/title-generator"

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const cacheKey = `user:sessions:${userId}`

  // 1. Check Redis cache first (sub-15ms)
  const cached = await getCachedJson<Record<string, unknown>[]>(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  const sessions = await withDbRetry(() =>
    prisma.chatSession.findMany({
      where: {
        userId,
        NOT: { title: { startsWith: "Say 'connected'" } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        _count: { select: { messages: true } },
      },
    })
  )

  const formattedSessions = sessions.map((s) => {
    let cleanTitle = s.title || "New Chat"
    // If title has raw boilerplate prefixes or is casual greeting, format it nicely
    if (
      cleanTitle.startsWith("Analyze this") ||
      cleanTitle.startsWith("Provide a concise") ||
      cleanTitle.startsWith("Generate 5") ||
      cleanTitle.startsWith("Draft a professional") ||
      cleanTitle.startsWith("We socket") ||
      cleanTitle.toLowerCase() === "hi" ||
      cleanTitle.toLowerCase() === "hi bro" ||
      cleanTitle.length > 30
    ) {
      cleanTitle = generateHeuristicTitle(cleanTitle)
    }
    return {
      ...s,
      title: cleanTitle,
    }
  })

  // Cache formatted sessions for 1 hour
  void setCachedJson(cacheKey, formattedSessions, 3600)

  return NextResponse.json(formattedSessions)
}

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { mode?: string; title?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const session = await withDbRetry(() =>
    prisma.chatSession.create({
      data: {
        userId,
        mode: typeof body.mode === "string" ? body.mode : "general",
        title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : "New Chat",
      },
      include: {
        _count: { select: { messages: true } },
      },
    })
  )

  // Invalidate user sessions cache
  void invalidateCache(`user:sessions:${userId}`)

  return NextResponse.json(session)
}
