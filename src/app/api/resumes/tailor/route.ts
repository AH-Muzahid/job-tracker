import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { checkDistributedRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { buildVerifiedResume, ResumeRequestSchema } from "@/lib/ai/verified-resume"
import { AIAccessError } from "@/lib/ai/ownership"

export const dynamic = "force-dynamic"
export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const limit = await checkDistributedRateLimit(`resume-tailor:${userId}`, 10, 60)
  if (!limit.success) return rateLimitResponse(limit)
  const parsed = ResumeRequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Provide a valid job description" }, { status: 400 })
  try { return NextResponse.json({ success: true, ...await buildVerifiedResume(userId, parsed.data) }) }
  catch (error) {
    const access = error instanceof AIAccessError
    const missing = error instanceof Error && error.message.startsWith("Add your resume")
    return NextResponse.json({ error: access ? "Application not found" : missing ? error.message : "Unable to prepare resume. Please retry." }, { status: access ? 404 : missing ? 422 : 503 })
  }
}
