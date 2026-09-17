import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getInternalUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { sanitizeUntrustedContext } from "@/lib/ai/context-builder"

const CreateSessionSchema = z.object({
  targetRole: z.string().min(1).max(200),
  targetCompany: z.string().min(1).max(200),
  interviewType: z.enum(["Technical", "Behavioral", "System Design", "Leadership", "General"]).default("Technical"),
  language: z.enum(["en", "bn", "mixed"]).default("mixed"),
  score: z.number().min(0).max(100).nullable().optional(),
  verdict: z.string().max(500).nullable().optional(),
  dialogue: z.array(z.any()).optional().default([]),
  report: z.any().nullable().optional(),
  applicationId: z.string().cuid().nullable().optional(),
})

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rateCheck = checkRateLimit(`interview-sessions-get:${userId}`, 60, 60 * 1000)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck)

  try {
    const sessions = await prisma.interviewSession.findMany({
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

  const rateCheck = checkRateLimit(`interview-sessions-post:${userId}`, 30, 60 * 1000)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck)

  try {
    const raw = await request.json()
    const parsed = CreateSessionSchema.safeParse(raw)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const {
      targetRole,
      targetCompany,
      interviewType,
      language,
      score,
      verdict,
      dialogue,
      report,
      applicationId,
    } = parsed.data

    // INT-22: Verify applicationId ownership to prevent IDOR
    let verifiedAppId: string | null = null
    if (applicationId) {
      const ownedApp = await prisma.application.findFirst({
        where: { id: applicationId, userId },
      })
      if (!ownedApp) {
        return NextResponse.json(
          { error: "Application not found or access denied" },
          { status: 403 }
        )
      }
      verifiedAppId = ownedApp.id
    }

    const sanitizedRole = sanitizeUntrustedContext(targetRole)
    const sanitizedCompany = sanitizeUntrustedContext(targetCompany)

    const session = await prisma.interviewSession.create({
      data: {
        userId,
        targetRole: sanitizedRole || "Software Engineer",
        targetCompany: sanitizedCompany || "Tech Company",
        interviewType,
        language,
        score: typeof score === "number" ? score : null,
        verdict: verdict || null,
        dialogue: dialogue || [],
        report: report || null,
        applicationId: verifiedAppId,
      },
    })

    // If score/report exists, automatically create a linked PrepNote
    if (score !== undefined || report) {
      try {
        let linkedAppId = verifiedAppId
        if (!linkedAppId && sanitizedCompany) {
          const app = await prisma.application.findFirst({
            where: {
              userId,
              companyName: { contains: sanitizedCompany, mode: "insensitive" },
            },
          })
          if (app) linkedAppId = app.id
        }

        await prisma.prepNote.create({
          data: {
            userId,
            title: `Mock Evaluation: ${sanitizedCompany || "Interview"} (${score || "N/A"}/100)`,
            category: "Mock Evaluation",
            applicationId: linkedAppId || null,
            content: `### Interview Result: ${sanitizedRole} @ ${sanitizedCompany}\n\n**Verdict:** ${verdict || "Completed"}\n**Score:** ${score || "N/A"}/100\n\n${report?.executiveSummary ? `**Executive Summary:**\n${report.executiveSummary}\n\n` : ""}${report?.strengths ? `**Strengths:**\n${report.strengths.map((s: string) => `- ${s}`).join("\n")}\n\n` : ""}${report?.improvementAreas ? `**Areas to Improve:**\n${report.improvementAreas.map((a: string) => `- ${a}`).join("\n")}` : ""}`,
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

  const rateCheck = checkRateLimit(`interview-sessions-del:${userId}`, 30, 60 * 1000)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck)

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Session ID required" }, { status: 400 })

  try {
    await prisma.interviewSession.deleteMany({
      where: { id, userId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Interview Sessions DELETE Error]:", error)
    return NextResponse.json({ error: "Failed to delete interview session" }, { status: 500 })
  }
}
