import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { checkDistributedRateLimit } from "@/lib/rate-limit"
import { compileApplicationPackage } from "@/lib/applications/package-engine"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getInternalUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid application ID" }, { status: 400 })
    }

    // Rate limit: 60 requests per 60 seconds per user
    const rateLimit = await checkDistributedRateLimit(`application-package:${userId}`, 60, 60)
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": `${rateLimit.resetInSeconds}` } }
      )
    }

    const applicationPackage = await compileApplicationPackage(userId, id)
    if (!applicationPackage) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    return NextResponse.json(applicationPackage, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    })
  } catch (error) {
    console.error("[GET /api/applications/[id]/package Error]:", error)
    return NextResponse.json(
      { error: "Failed to compile application package" },
      { status: 500 }
    )
  }
}
