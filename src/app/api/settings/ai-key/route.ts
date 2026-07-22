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

  if (!providerType || !apiKey) {
    return NextResponse.json({ error: "providerType and apiKey are required" }, { status: 400 })
  }

  const validTypes = ["openai", "anthropic", "google", "custom-openai"]
  if (!validTypes.includes(providerType)) {
    return NextResponse.json({ error: "Invalid provider type" }, { status: 400 })
  }

  const config = { providerType, apiKey, baseUrl, model }
  const encrypted = encrypt(JSON.stringify(config))

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
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
