import { NextResponse } from "next/server"
import { assertAdmin } from "@/lib/auth/admin"
import { getOpsMetricsSummary } from "@/lib/ops/telemetry-ring"

export async function GET() {
  try {
    await assertAdmin()
    const metrics = await getOpsMetricsSummary()
    return NextResponse.json({ metrics })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Forbidden"
    return NextResponse.json({ error: errorMsg }, { status: 403 })
  }
}
