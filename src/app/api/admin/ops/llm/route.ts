import { NextResponse } from "next/server"
import { assertAdmin } from "@/lib/auth/admin"
import { getRecentLLMCalls, recordLLMCallToRing } from "@/lib/ops/telemetry-ring"

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

export async function POST(req: Request) {
  try {
    const { userId } = await assertAdmin()
    const body = await req.json().catch(() => ({}))
    const probeName = body.name || "admin-telemetry-probe"
    const model = body.model || "gpt-4o-mini"
    const provider = body.provider || "openai"

    await recordLLMCallToRing({
      name: probeName,
      model,
      provider,
      promptTokens: body.promptTokens || 142,
      completionTokens: body.completionTokens || 88,
      latencyMs: body.latencyMs || 230,
      status: "success",
      userId,
      sessionId: `probe-${Date.now()}`,
    })

    const calls = await getRecentLLMCalls(50)
    return NextResponse.json({ success: true, calls })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Forbidden"
    return NextResponse.json({ error: errorMsg }, { status: 403 })
  }
}
