import { NextRequest, NextResponse } from "next/server"
import { exchangeGoogleAuthCode } from "@/lib/gmail"
import { getCachedJson, invalidateCache } from "@/lib/redis"
import { decryptToken } from "@/lib/crypto"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  // Determine fallback origin from request headers
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
  const proto = request.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https")
  const defaultOrigin = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")

  let targetOrigin: string = defaultOrigin

  if (error || !code || !state) {
    console.error("[Google OAuth Callback Error]:", error || "Missing code or state")
    return NextResponse.redirect(`${defaultOrigin}/settings?error=oauth_failed`)
  }

  let resolvedUserId: string | null = null

  // 1. Resolve via Self-Contained Encrypted State (resilient across serverless cold-starts & Redis unavailability)
  try {
    const decrypted = decryptToken(state)
    if (decrypted && decrypted.startsWith("{")) {
      const parsed = JSON.parse(decrypted)
      // Check timestamp validity (within 15 minutes)
      if (parsed.userId && (!parsed.ts || Date.now() - parsed.ts < 15 * 60 * 1000)) {
        resolvedUserId = parsed.userId
        if (parsed.origin) {
          targetOrigin = parsed.origin.replace(/\/$/, "")
        }
      }
    }
  } catch (decryptErr) {
    console.warn("[Google OAuth] Could not parse state token as encrypted payload, falling back to Redis:", decryptErr)
  }

  // 2. Fallback to Redis state cache
  if (!resolvedUserId) {
    const stateData = await getCachedJson<{ userId: string; origin?: string }>(`oauth:state:${state}`)
    if (stateData?.userId) {
      resolvedUserId = stateData.userId
      if (stateData.origin) {
        targetOrigin = stateData.origin.replace(/\/$/, "")
      }
    }
  }

  // 3. Fallback to HTTP-only cookie if state matches
  if (!resolvedUserId) {
    const cookieState = request.cookies.get("ct_oauth_state")?.value
    if (cookieState && cookieState === state) {
      try {
        const decryptedCookie = decryptToken(cookieState)
        if (decryptedCookie && decryptedCookie.startsWith("{")) {
          const parsed = JSON.parse(decryptedCookie)
          if (parsed.userId) {
            resolvedUserId = parsed.userId
            if (parsed.origin) targetOrigin = parsed.origin.replace(/\/$/, "")
          }
        }
      } catch {
        // ignore cookie decryption error
      }
    }
  }

  if (!resolvedUserId) {
    console.error("[Google OAuth Invalid State]: State could not be validated via Encrypted Token, Redis, or Cookie. State length:", state.length)
    return NextResponse.redirect(`${targetOrigin}/settings?error=invalid_state`)
  }

  try {
    await exchangeGoogleAuthCode(code, resolvedUserId)
    await invalidateCache(`oauth:state:${state}`)
    
    const response = NextResponse.redirect(`${targetOrigin}/settings?connected=google`)
    response.cookies.delete("ct_oauth_state")
    return response
  } catch (exchangeErr: unknown) {
    const errorMsg = exchangeErr instanceof Error ? exchangeErr.message : "exchange_failed"
    console.error("[Google OAuth Exchange Failed]:", exchangeErr)
    return NextResponse.redirect(`${targetOrigin}/settings?error=${encodeURIComponent(errorMsg)}`)
  }
}
