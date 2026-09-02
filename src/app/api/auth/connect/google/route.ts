import { NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { generateGoogleAuthUrl, disconnectGoogleAccount } from "@/lib/gmail"
import { setCachedJson } from "@/lib/redis"
import crypto from "crypto"

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Create CSRF state nonce and bind to user
  const stateNonce = crypto.randomBytes(24).toString("hex")
  await setCachedJson(`oauth:state:${stateNonce}`, { userId }, 600) // 10 min TTL

  const authUrl = generateGoogleAuthUrl(stateNonce)
  return NextResponse.redirect(authUrl)
}

export async function DELETE() {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await disconnectGoogleAccount(userId)
  return NextResponse.json(result)
}
