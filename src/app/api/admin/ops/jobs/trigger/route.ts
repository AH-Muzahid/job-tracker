import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { assertAdmin } from "@/lib/auth/admin"
import { triggerInngestPipeline } from "@/lib/ops/inngest-catalog"

const TriggerJobSchema = z.object({
  functionId: z.string().min(1, "functionId is required"),
  payload: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const admin = await assertAdmin()

    const rawBody = await req.json().catch(() => ({}))
    const parsed = TriggerJobSchema.safeParse(rawBody)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.format() },
        { status: 400 }
      )
    }

    const { functionId, payload = {} } = parsed.data
    const result = await triggerInngestPipeline(functionId, {
      ...payload,
      triggeredByUserId: admin.userId,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to trigger pipeline" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      eventId: result.eventId,
      functionId,
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Forbidden"
    return NextResponse.json({ error: errorMsg }, { status: 403 })
  }
}
