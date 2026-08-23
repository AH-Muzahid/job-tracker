/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { getInternalUserId } from "@/lib/auth"
import { getProvider } from "@/lib/ai/client"
import { getUserAIConfig } from "@/lib/ai/config"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rateCheck = checkRateLimit(`transcribe:${userId}`, 45, 60 * 1000)
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck)
  }

  const aiConfig = await getUserAIConfig(userId)
  if (!aiConfig) {
    return NextResponse.json({ error: "AI provider not configured" }, { status: 400 })
  }

  try {
    const contentType = request.headers.get("content-type") || ""

    // 1. Audio Form-Data Request (Direct audio buffer transcription)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const audioFile = formData.get("audio") as File | null
      const language = (formData.get("language") as string) || "mixed"

      if (!audioFile) {
        return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
      }

      const arrayBuffer = await audioFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const mimeType = audioFile.type || "audio/webm"

      // A. If user configured Google Gemini, use Gemini Multimodal Audio
      if (aiConfig.providerType === "google") {
        const resolvedProvider = getProvider({
          providerType: "google",
          apiKey: aiConfig.apiKey,
        })
        const model = resolvedProvider.model("gemini-1.5-flash")

        const result = await generateText({
          model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `You are an expert bilingual speech-to-text transcriber for tech interviews.
Target Language mode: ${language}.
Speaker might speak Bengali (বাংলা), English, or Banglish (Bengali mixed with English technical terms like React, Next.js, Docker, API, State Management, Redux, PostgreSQL, microservices, etc.).
RULES:
1. Transcribe the spoken audio with 100% precision.
2. Keep technical words (React, Next.js, API, Redis, Database, Architecture, State, Component, etc.) in clean English technical spelling where appropriate or accurate Bengali.
3. Fix any stuttering or filler noise, outputting ONLY the final clean spoken text.
4. Output raw text ONLY. No explanations, markdown, or quotation marks.`,
                },
                {
                  type: "file",
                  data: buffer,
                  mediaType: mimeType,
                } as any,
              ],
            },
          ],
        })

        const text = result.text.trim().replace(/^["']|["']$/g, "")
        return NextResponse.json({ transcript: text })
      }

      // B. If OpenAI or Custom OpenAI with Whisper support
      if (aiConfig.providerType === "openai" || aiConfig.providerType === "custom-openai") {
        try {
          const baseUrl = aiConfig.baseUrl || "https://api.openai.com/v1"
          const whisperFormData = new FormData()
          whisperFormData.append(
            "file",
            new Blob([buffer], { type: mimeType }),
            "audio.webm"
          )
          whisperFormData.append("model", "whisper-1")
          if (language === "bn") {
            whisperFormData.append("language", "bn")
          }
          whisperFormData.append(
            "prompt",
            "Bengali and Banglish speech transcription with tech keywords: React, Next.js, Redux, Docker, Kubernetes, PostgreSQL, API, State Management, Microservices."
          )

          const whisperRes = await fetch(`${baseUrl.replace(/\/+$/, "")}/audio/transcriptions`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${aiConfig.apiKey}`,
            },
            body: whisperFormData,
          })

          if (whisperRes.ok) {
            const data = await whisperRes.json()
            if (data.text) {
              return NextResponse.json({ transcript: data.text.trim() })
            }
          }
        } catch (whisperErr) {
          console.warn("Whisper transcription fallback:", whisperErr)
        }
      }
    }

    // 2. Text Refinement / Normalization Request (Fast cleanup of browser STT phonetic typos)
    const body = await request.json().catch(() => ({}))
    const { rawText = "", language = "mixed" } = body

    if (!rawText.trim()) {
      return NextResponse.json({ transcript: "" })
    }

    const resolvedProvider = getProvider({
      providerType: aiConfig.providerType as any,
      apiKey: aiConfig.apiKey,
      baseUrl: aiConfig.baseUrl,
      model: aiConfig.model,
    })
    const targetModel = resolvedProvider.model(aiConfig.model || resolvedProvider.defaultModel)

    const refinePrompt = `You are an expert bilingual speech-to-text text normalizer.
The following text was generated by a basic Speech-to-Text browser engine from a candidate speaking in ${
      language === "bn" ? "Bengali (বাংলা)" : language === "mixed" ? "Banglish (Bengali + English tech terms)" : "English"
    }.

Raw STT Text:
"${rawText}"

YOUR TASK:
1. Fix any garbled words, phonetic misspellings, or distorted tech words (e.g. convert 'রিডাক্স'/'রি ডাক্স' to 'Redux', 'নেক্সট জেএস' to 'Next.js', 'এপিআই' to 'API', 'পোস্টগ্রেস' to 'PostgreSQL', 'ডকার' to 'Docker', 'স্টেট ম্যানেজমেন্ট' to 'State Management').
2. Fix broken Bengali grammar or homophone errors caused by STT without changing the user's intended meaning.
3. Return ONLY the refined, clean spoken text. No quotes, explanations, or notes.`

    const refined = await generateText({
      model: targetModel,
      prompt: refinePrompt,
      temperature: 0.1,
    })

    const cleanTranscript = refined.text.trim().replace(/^["']|["']$/g, "")
    return NextResponse.json({ transcript: cleanTranscript || rawText })
  } catch (error) {
    console.error("Transcribe API error:", error)
    return NextResponse.json(
      { error: "Failed to transcribe or refine speech" },
      { status: 500 }
    )
  }
}
