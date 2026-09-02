import { NextRequest, NextResponse } from "next/server"
import { exchangeGoogleAuthCode } from "@/lib/gmail"
import { getCachedJson, invalidateCache } from "@/lib/redis"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const baseUrl = appUrl.replace(/\/$/, "")

  if (error || !code || !state) {
    console.error("[Google OAuth Callback Error]:", error || "Missing code or state")
    return NextResponse.redirect(`${baseUrl}/settings?error=oauth_failed`)
  }

  // Validate CSRF state nonce from Redis
  const stateData = await getCachedJson<{ userId: string }>(`oauth:state:${state}`)
  if (!stateData || !stateData.userId) {
    console.error("[Google OAuth Invalid State]:", state)
    return NextResponse.redirect(`${baseUrl}/settings?error=invalid_state`)
  }

  try {
    await exchangeGoogleAuthCode(code, stateData.userId)
    await invalidateCache(`oauth:state:${state}`)
    return NextResponse.redirect(`${baseUrl}/settings?connected=google`)
  } catch (exchangeErr: unknown) {
    const errorMsg = exchangeErr instanceof Error ? exchangeErr.message : "exchange_failed"
    console.error("[Google OAuth Exchange Failed]:", exchangeErr)
    return NextResponse.redirect(`${baseUrl}/settings?error=${encodeURIComponent(errorMsg)}`)
  }
}
