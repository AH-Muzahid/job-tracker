import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { checkDistributedRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { getUserAIConfig } from "@/lib/ai/config"

async function processTTS({
  userId,
  rawText,
  lang = "en",
  gender = "male",
  voice,
}: {
  userId: string
  rawText: string
  lang?: string
  gender?: string
  voice?: string | null
}) {
  if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
    return new NextResponse("Text is required", { status: 400 })
  }

  const text = rawText
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/[*_#~>]/g, "")
    .trim()

  if (!text) {
    return new NextResponse("Invalid text", { status: 400 })
  }

  const hasBengali = /[\u0980-\u09FF]/.test(text)
  const isBengali = hasBengali || lang === "bn"

  // Return HTTP 204 No Content for non-supported/Bengali languages so
  // the client gracefully uses native browser SpeechSynthesis.
  if (isBengali) {
    return new NextResponse(null, { status: 204 })
  }

  // Retrieve user or system OpenAI configuration
  const userConfig = await getUserAIConfig(userId)
  const apiKey =
    (userConfig?.providerType === "openai" && userConfig.apiKey) ||
    process.env.OPENAI_API_KEY

  if (!apiKey) {
    // Graceful fallback: client will use browser SpeechSynthesis
    return new NextResponse(null, { status: 204 })
  }

  const validVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]
  const defaultVoice = gender === "female" ? "nova" : "onyx"
  const selectedVoice = voice && validVoices.includes(voice) ? voice : defaultVoice

  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text.slice(0, 4096),
        voice: selectedVoice,
        response_format: "mp3",
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.warn(`[TTS] OpenAI TTS returned ${response.status}: ${await response.text().catch(() => "")}`)
      return new NextResponse(null, { status: 204 })
    }

    const audioBuffer = await response.arrayBuffer()
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    })
  } catch (error) {
    console.warn("[TTS] Error generating speech audio:", error)
    return new NextResponse(null, { status: 204 })
  }
}

export async function GET(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rl = await checkDistributedRateLimit(`tts:${userId}`, 60, 60)
  if (!rl.success) return rateLimitResponse(rl)

  const { searchParams } = new URL(request.url)
  const rawText = searchParams.get("text") || ""
  const lang = searchParams.get("lang") || "en"
  const gender = searchParams.get("gender") || "male"
  const voice = searchParams.get("voice")

  return processTTS({ userId, rawText, lang, gender, voice })
}

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rl = await checkDistributedRateLimit(`tts:${userId}`, 60, 60)
  if (!rl.success) return rateLimitResponse(rl)

  try {
    const body = await request.json()
    const { text, lang = "en", gender = "male", voice } = body
    return processTTS({ userId, rawText: text, lang, gender, voice })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Invalid request"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
