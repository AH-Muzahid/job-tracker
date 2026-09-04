import { NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { getConnectedGoogleAccount } from "@/lib/gmail-status"

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const accountInfo = await getConnectedGoogleAccount(userId)
  return NextResponse.json(accountInfo)
}
