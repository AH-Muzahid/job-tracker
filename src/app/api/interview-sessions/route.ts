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
    const {
      targetRole,
      targetCompany,
      interviewType,
      language = "mixed",
      score,
      verdict,
      dialogue,
      report,
      applicationId,
    } = body

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

    // If score/report exists, automatically create a linked PrepNote
    if (score !== undefined || report) {
      try {
        let linkedAppId = applicationId
        if (!linkedAppId && targetCompany) {
          const app = await prisma.application.findFirst({
            where: {
              userId,
              companyName: { contains: targetCompany, mode: "insensitive" },
            },
          })
          if (app) linkedAppId = app.id
        }

        await prisma.prepNote.create({
          data: {
            userId,
            title: `Mock Evaluation: ${targetCompany || "Interview"} (${score || "N/A"}/10)`,
            category: "Mock Evaluation",
            applicationId: linkedAppId || null,
            content: `### Interview Result: ${targetRole} @ ${targetCompany}\n\n**Verdict:** ${verdict || "Completed"}\n**Score:** ${score || "N/A"}/10\n\n${report?.executiveSummary ? `**Executive Summary:**\n${report.executiveSummary}\n\n` : ""}${report?.strengths ? `**Strengths:**\n${report.strengths.map((s: string) => `- ${s}`).join("\n")}\n\n` : ""}${report?.improvementAreas ? `**Areas to Improve:**\n${report.improvementAreas.map((a: string) => `- ${a}`).join("\n")}` : ""}`,
          },
        })
      } catch (err) {
        console.error("Failed to auto-create linked prep note from mock session:", err)
      }
    }

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
