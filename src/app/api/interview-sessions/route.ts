/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const sessions = await (prisma as any).interviewSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error("[Interview Sessions GET Error]:", error)
    return NextResponse.json({ error: "Failed to fetch interview sessions" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { targetRole, targetCompany, interviewType, language = "mixed", score, verdict, dialogue, report } = body

    const session = await (prisma as any).interviewSession.create({
      data: {
        userId,
        targetRole: targetRole || "Software Engineer",
        targetCompany: targetCompany || "Tech Company",
        interviewType: interviewType || "Technical",
        language,
        score: typeof score === "number" ? score : null,
        verdict: verdict || null,
        dialogue: dialogue || [],
        report: report || null,
      },
    })

    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    console.error("[Interview Sessions POST Error]:", error)
    return NextResponse.json({ error: "Failed to create interview session" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Session ID required" }, { status: 400 })

  try {
    await (prisma as any).interviewSession.deleteMany({
      where: { id, userId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Interview Sessions DELETE Error]:", error)
    return NextResponse.json({ error: "Failed to delete interview session" }, { status: 500 })
  }
}
