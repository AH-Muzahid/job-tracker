import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

import { generateHeuristicTitle } from "@/lib/ai/title-generator"

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessions = await prisma.chatSession.findMany({
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

  const session = await prisma.chatSession.create({
    data: {
      userId,
      mode: typeof body.mode === "string" ? body.mode : "general",
      title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : "New Chat",
    },
    include: {
      _count: { select: { messages: true } },
    },
  })

  return NextResponse.json(session)
}
