import { NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { syncUserInbox } from "@/lib/gmail-sync"

export async function POST() {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const syncResult = await syncUserInbox(userId)
  return NextResponse.json({
    success: syncResult.errors.length === 0,
    ...syncResult,
  })
}
