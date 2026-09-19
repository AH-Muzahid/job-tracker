import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { checkDistributedRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import {
  isFollowUpDue,
  calculateBusinessDays,
  generateFollowUpDraft,
  stageFollowUpForApplication,
  dispatchFollowUpForApplication,
} from "@/lib/applications/follow-up-engine"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const app = await withDbRetry(() =>
      prisma.application.findUnique({
        where: { id, userId },
        include: {
          company: true,
          analysis: true,
        },
      })
    )

    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    const businessDaysElapsed = calculateBusinessDays(
      app.applicationDate || app.updatedAt || app.createdAt
    )
    const isDue = isFollowUpDue(app)
    const strategy = (app.analysis?.applyStrategy as Record<string, unknown>) || {}
    const stagedDraft = strategy.followUpDraft || (app.analysis?.outreachSubject ? {
      subject: app.analysis.outreachSubject,
      body: app.analysis.outreachBody,
      checklist: app.analysis.outreachChecklist,
      generatedAt: app.analysis.outreachGeneratedAt,
    } : null)

    return NextResponse.json({
      applicationId: app.id,
      companyName: app.company?.name || app.companyName,
      jobTitle: app.jobTitle,
      status: app.status,
      businessDaysElapsed,
      isFollowUpDue: isDue,
      followUpStatus: strategy.followUpStatus || (stagedDraft ? "DRAFTED" : "PENDING"),
      draft: stagedDraft,
    })
  } catch (error: unknown) {
    console.error("[GET /api/applications/[id]/follow-up error]:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateLimitKey = `rate:followup:${userId}`
  const limitCheck = await checkDistributedRateLimit(rateLimitKey, 20, 60)
  if (!limitCheck.success) {
    return rateLimitResponse(limitCheck)
  }

  const { id } = await params
  let body: {
    action?: "generate" | "send"
    toEmail?: string
    customSubject?: string
    customBody?: string
  } = {}

  try {
    body = await request.json()
  } catch {
    body = { action: "generate" }
  }

  const action = body.action || "generate"

  try {
    const app = await withDbRetry(() =>
      prisma.application.findUnique({
        where: { id, userId },
        include: {
          company: true,
          analysis: true,
          user: {
            select: { name: true },
          },
        },
      })
    )

    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    if (action === "generate") {
      const draft = await generateFollowUpDraft({
        userId,
        applicationId: id,
        companyName: app.company?.name || app.companyName,
        jobTitle: app.jobTitle,
        candidateName: app.user?.name || undefined,
        applicationDate: app.applicationDate || app.createdAt,
        jdSnippet: app.analysis?.rawJd || app.notes || undefined,
      })

      await stageFollowUpForApplication(id, draft)

      return NextResponse.json({
        success: true,
        action: "generate",
        draft,
      })
    }

    if (action === "send") {
      const result = await dispatchFollowUpForApplication(userId, id, {
        app,
        toEmail: body.toEmail,
        customSubject: body.customSubject,
        customBody: body.customBody,
      })

      return NextResponse.json({
        success: true,
        action: "send",
        message: result.message,
        dispatchedAt: result.dispatchedAt,
        provider: result.provider,
      })
    }

    return NextResponse.json({ error: "Invalid action. Supported: generate, send" }, { status: 400 })
  } catch (error: unknown) {
    console.error("[POST /api/applications/[id]/follow-up error]:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}
