import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { generateGoogleAuthUrl, disconnectGoogleAccount } from "@/lib/gmail"
import { setCachedJson } from "@/lib/redis"
import { encryptToken } from "@/lib/crypto"
import crypto from "crypto"

export async function GET(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Derive request origin so callback can return to the exact same origin (localhost vs production)
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
  const proto = request.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https")
  const origin = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")

  // Create encrypted self-contained CSRF state payload (tamper-proof via AES-256-GCM)
  const statePayload = JSON.stringify({
    userId,
    origin,
    nonce: crypto.randomBytes(16).toString("hex"),
    ts: Date.now(),
  })
  const stateNonce = encryptToken(statePayload)

  // Also cache in Redis with 15 min TTL as dual storage
  await setCachedJson(`oauth:state:${stateNonce}`, { userId, origin }, 900)

  const authUrl = generateGoogleAuthUrl(stateNonce)
  const response = NextResponse.redirect(authUrl)

  // Set HTTP-only cookie as backup CSRF protection
  response.cookies.set("ct_oauth_state", stateNonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 900,
    path: "/",
  })

  return response
}

export async function DELETE() {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await disconnectGoogleAccount(userId)
  return NextResponse.json(result)
}
