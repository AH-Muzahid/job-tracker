import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { checkDistributedRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { getUserAIConfig } from "@/lib/ai/config"

/**
 * Fetch high-fidelity Bengali TTS audio using Google Translate TTS API (frame-concatenated MP3)
 */
async function fetchGoogleTTSAudio(text: string, lang: string = "bn"): Promise<ArrayBuffer | null> {
  try {
    const cleaned = text.replace(/[*_#~`>[\]()]/g, "").trim()
    if (!cleaned) return null

    // Split into sentences / segments under 180 chars (Google TTS limit is 200 chars)
    const segments = cleaned.match(/[^।?!.\n]+[।?!.\n]?/g) || [cleaned]
    const chunks: string[] = []
    let current = ""

    for (const seg of segments) {
      if ((current + seg).length > 180) {
        if (current.trim()) chunks.push(current.trim())
        current = seg
      } else {
        current += (current ? " " : "") + seg
      }
    }
    if (current.trim()) chunks.push(current.trim())

    const buffers: Uint8Array[] = []
    // Up to 4 chunks covers standard 1-2 sentence spoken interview turns comfortably
    for (const chunk of chunks.slice(0, 4)) {
      if (!chunk.trim()) continue
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
        chunk
      )}&tl=${lang}&client=tw-ob`

      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(6000),
      })

      if (res.ok) {
        const buf = await res.arrayBuffer()
        buffers.push(new Uint8Array(buf))
      }
    }

    if (buffers.length === 0) return null
    const totalLength = buffers.reduce((acc, b) => acc + b.length, 0)
    const merged = new Uint8Array(totalLength)
    let offset = 0
    for (const b of buffers) {
      merged.set(b, offset)
      offset += b.length
    }
    return merged.buffer
  } catch (err) {
    console.warn("[TTS] Google TTS error:", err)
    return null
  }
}

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
  const isBengali = hasBengali || lang === "bn" || lang === "mixed"

  // Retrieve user or system OpenAI configuration
  const userConfig = await getUserAIConfig(userId)
  const apiKey =
    (userConfig?.providerType === "openai" && userConfig.apiKey) ||
    process.env.OPENAI_API_KEY

  // 1. If OpenAI API key is available, try OpenAI tts-1 (supports Bengali and English)
  if (apiKey) {
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

      if (response.ok) {
        const audioBuffer = await response.arrayBuffer()
        return new NextResponse(audioBuffer, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Content-Length": audioBuffer.byteLength.toString(),
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          },
        })
      }
    } catch (error) {
      console.warn("[TTS] OpenAI speech generation error:", error)
    }
  }

  // 2. For Bengali, generate pristine native Bengali audio via Google TTS
  if (isBengali) {
    const googleAudio = await fetchGoogleTTSAudio(text, "bn")
    if (googleAudio) {
      return new NextResponse(googleAudio, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": googleAudio.byteLength.toString(),
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      })
    }
  }

  // 3. Graceful fallback: client will use browser SpeechSynthesis
  return new NextResponse(null, { status: 204 })
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
