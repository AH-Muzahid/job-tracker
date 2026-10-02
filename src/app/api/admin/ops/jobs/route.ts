import { NextResponse } from "next/server"
import { assertAdmin } from "@/lib/auth/admin"
import { INNGEST_PIPELINE_CATALOG } from "@/lib/ops/inngest-catalog"
import { getRecentJobRuns } from "@/lib/ops/telemetry-ring"

export async function GET() {
  try {
    await assertAdmin()
    const recentRuns = await getRecentJobRuns(50)
    return NextResponse.json({
      catalog: INNGEST_PIPELINE_CATALOG,
      recentRuns,
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Forbidden"
    return NextResponse.json({ error: errorMsg }, { status: 403 })
  }
}
