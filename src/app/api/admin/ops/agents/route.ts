import { NextResponse } from "next/server"
import { assertAdmin } from "@/lib/auth/admin"
import { getRecentAgentSteps, recordAgentStepToRing } from "@/lib/ops/telemetry-ring"

export async function GET() {
  try {
    await assertAdmin()
    const steps = await getRecentAgentSteps(50)
    return NextResponse.json({ steps })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Forbidden"
    return NextResponse.json({ error: errorMsg }, { status: 403 })
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await assertAdmin()
    const body = await req.json().catch(() => ({}))
    const nodeName = body.nodeName || "planner"

    await recordAgentStepToRing({
      nodeName,
      sessionId: `probe-${Date.now()}`,
      userId,
      tokens: body.tokens || 210,
      durationMs: body.durationMs || 340,
      status: "success",
    })

    const steps = await getRecentAgentSteps(50)
    return NextResponse.json({ success: true, steps })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Forbidden"
    return NextResponse.json({ error: errorMsg }, { status: 403 })
  }
}
