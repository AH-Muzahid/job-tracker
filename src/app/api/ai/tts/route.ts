import { NextRequest, NextResponse } from "next/server"

function splitIntoChunks(text: string, maxLen = 180): string[] {
  const clean = text.replace(/[*_#`]/g, "").trim()
  if (!clean) return []

  // Split by sentence terminators (Bengali dari '।', periods, question marks, exclamation, newlines)
  const sentences = clean.split(/(?<=[।?!.\n])\s+/)
  const chunks: string[] = []
  let current = ""

  for (const s of sentences) {
    if ((current + " " + s).trim().length <= maxLen) {
      current = (current + " " + s).trim()
    } else {
      if (current) chunks.push(current)
      if (s.length > maxLen) {
        // If a single sentence is super long, split by comma or space
        const words = s.split(/(?<=[, ])/)
        let sub = ""
        for (const w of words) {
          if ((sub + w).length <= maxLen) {
            sub += w
          } else {
            if (sub) chunks.push(sub.trim())
            sub = w
          }
        }
        if (sub) current = sub.trim()
        else current = ""
      } else {
        current = s
      }
    }
  }
  if (current) chunks.push(current)
  return chunks.filter(Boolean)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const text = searchParams.get("text") || ""
  let lang = searchParams.get("lang") || "en"

  if (!text.trim()) {
    return new NextResponse("Text is required", { status: 400 })
  }

  // Auto-detect Bengali script
  const hasBengali = /[\u0980-\u09FF]/.test(text)
  if (hasBengali) {
    lang = "bn"
  }

  const chunks = splitIntoChunks(text, 180)
  if (chunks.length === 0) {
    return new NextResponse("Invalid text", { status: 400 })
  }

  try {
    const buffers: Buffer[] = []

    for (const chunk of chunks) {
      const targetLang = /[\u0980-\u09FF]/.test(chunk) ? "bn" : lang
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
        chunk
      )}&tl=${targetLang}&client=tw-ob`

      const res = await fetch(ttsUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      })

      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer()
        buffers.push(Buffer.from(arrayBuffer))
      }
    }

    if (buffers.length === 0) {
      return new NextResponse("TTS generation failed", { status: 500 })
    }

    const combined = Buffer.concat(buffers)

    return new NextResponse(combined, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": combined.length.toString(),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    })
  } catch (err: unknown) {
    console.error("[TTS Generation Error]:", err)
    return new NextResponse("Failed to generate speech audio", { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, lang = "en" } = body
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    const url = new URL(request.url)
    url.searchParams.set("text", text)
    url.searchParams.set("lang", lang)

    return GET(new NextRequest(url))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Invalid request"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
