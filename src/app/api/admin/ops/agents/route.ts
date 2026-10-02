import { NextResponse } from "next/server"
import { assertAdmin } from "@/lib/auth/admin"
import { getRecentAgentSteps } from "@/lib/ops/telemetry-ring"

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
