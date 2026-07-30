import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getInternalUserId } from "@/lib/auth"
import { encrypt, decrypt } from "@/lib/encryption"

const COOKIE_NAME = "ai_config"

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const cookieStore = await cookies()
  const encrypted = cookieStore.get(COOKIE_NAME)?.value

  if (!encrypted) {
    return NextResponse.json({ hasKey: false })
  }

  try {
    const decrypted = decrypt(encrypted)
    const config = JSON.parse(decrypted)
    
    // Per-user cookie isolation check
    if (config.userId && config.userId !== userId) {
      return NextResponse.json({ hasKey: false })
    }

    return NextResponse.json({
      hasKey: true,
      providerType: config.providerType,
      baseUrl: config.baseUrl || undefined,
      model: config.model || undefined,
    })
  } catch {
    return NextResponse.json({ hasKey: false })
  }
}

export async function PUT(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { providerType, apiKey, baseUrl, model } = body

  if (!providerType) {
    return NextResponse.json({ error: "providerType is required" }, { status: 400 })
  }

  const validTypes = ["openai", "anthropic", "google", "custom-openai"]
  if (!validTypes.includes(providerType)) {
    return NextResponse.json({ error: "Invalid provider type" }, { status: 400 })
  }

  const cookieStore = await cookies()
  const existingEncrypted = cookieStore.get(COOKIE_NAME)?.value
  let finalApiKey = apiKey

  if (!finalApiKey && existingEncrypted) {
    try {
      const decrypted = decrypt(existingEncrypted)
      const parsed = JSON.parse(decrypted)
      if (!parsed.userId || parsed.userId === userId) {
        finalApiKey = parsed.apiKey
      }
    } catch {}
  }

  if (!finalApiKey) {
    return NextResponse.json({ error: "apiKey is required" }, { status: 400 })
  }

  // Bind configuration to the specific user ID for multi-tenant isolation
  const config = { userId, providerType, apiKey: finalApiKey, baseUrl, model }
  const encrypted = encrypt(JSON.stringify(config))

  cookieStore.set(COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days maximum
  })

  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)

  return NextResponse.json({ success: true })
}
