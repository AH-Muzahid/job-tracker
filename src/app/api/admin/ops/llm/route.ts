import { NextResponse } from "next/server"
import { assertAdmin } from "@/lib/auth/admin"
import { getRecentLLMCalls } from "@/lib/ops/telemetry-ring"

export async function GET() {
  try {
    await assertAdmin()
    const calls = await getRecentLLMCalls(50)
    return NextResponse.json({ calls })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Forbidden"
    return NextResponse.json({ error: errorMsg }, { status: 403 })
  }
}
