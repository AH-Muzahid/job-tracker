import { NextRequest, NextResponse } from "next/server"
import { assertAdmin } from "@/lib/auth/admin"
import { getRecentAppLogs, recordAppLogToRing, clearAppLogsRing } from "@/lib/ops/telemetry-ring"

export async function GET(req: NextRequest) {
  try {
    await assertAdmin()
    const { searchParams } = new URL(req.url)
    const limitParam = searchParams.get("limit")
    const levelParam = searchParams.get("level")

    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 100) : 50
    const level = (levelParam === "error" || levelParam === "warn" || levelParam === "info") ? levelParam : undefined

    const logs = await getRecentAppLogs(limit, level)
    return NextResponse.json({ logs })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Forbidden"
    return NextResponse.json({ error: errorMsg }, { status: 403 })
  }
}

export async function POST(req: NextRequest) {
  try {
    // Allows sending probes, test logs, or reporting runtime errors
    const body = await req.json().catch(() => ({}))
    const { level = "info", source = "manual:probe", message, error, metadata, userId } = body

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const item = await recordAppLogToRing({
      level: level === "error" || level === "warn" ? level : "info",
      source,
      message,
      error,
      metadata,
      userId,
    })

    return NextResponse.json({ success: true, item })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    await assertAdmin()
    await clearAppLogsRing()
    return NextResponse.json({ success: true, message: "Application log ring buffer cleared" })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Forbidden"
    return NextResponse.json({ error: errorMsg }, { status: 403 })
  }
}
