import { NextRequest } from "next/server"
import { streamText } from "ai"
import { cookies } from "next/headers"
import { getInternalUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getProvider } from "@/lib/ai/client"
import { buildFullContext } from "@/lib/ai/context-builder"
import { classifyMode } from "@/lib/ai/mode-router"
import { getSystemBase } from "@/lib/ai/prompts/system-base"
import { getJdScanPrompt } from "@/lib/ai/prompts/jd-scan"
import { getProfilePrompt } from "@/lib/ai/prompts/profile"
import { getApplicationPrompt } from "@/lib/ai/prompts/application"
import { getTrackerPrompt } from "@/lib/ai/prompts/tracker"
import { getResponsePrompt } from "@/lib/ai/prompts/response"
import { getInterviewPrompt } from "@/lib/ai/prompts/interview"
import { getWeeklyPrompt } from "@/lib/ai/prompts/weekly"
import { getRecoveryPrompt } from "@/lib/ai/prompts/recovery"
import { decrypt } from "@/lib/encryption"
import type { AIMode } from "@/lib/ai/context-builder"

const MODE_PROMPTS: Record<string, () => string> = {
  "profile": getProfilePrompt,
  "jd-scan": getJdScanPrompt,
  "application": getApplicationPrompt,
  "tracker": getTrackerPrompt,
  "response": getResponsePrompt,
  "interview": getInterviewPrompt,
  "weekly": getWeeklyPrompt,
  "recovery": getRecoveryPrompt,
}

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  const cookieStore = await cookies()
  const encrypted = cookieStore.get("ai_config")?.value
  if (!encrypted) {
    return new Response(JSON.stringify({ error: "AI provider not configured. Go to Settings to set up your API key." }), { status: 400 })
  }

  let aiConfig: { providerType: string; apiKey: string; baseUrl?: string; model?: string }
  try {
    const decrypted = decrypt(encrypted)
    aiConfig = JSON.parse(decrypted)
  } catch {
    return new Response(JSON.stringify({ error: "Invalid AI configuration. Please reconfigure in Settings." }), { status: 400 })
  }

  const body = await request.json()
  const { message, sessionId: existingSessionId, mode: forcedMode, model: modelOverride } = body

  if (!message || typeof message !== "string") {
    return new Response(JSON.stringify({ error: "Message is required" }), { status: 400 })
  }

  const mode: AIMode = (forcedMode || classifyMode(message)) as AIMode
  let sessionId = existingSessionId

  if (!sessionId) {
    const session = await prisma.chatSession.create({
      data: { userId, mode, title: message.slice(0, 80) },
    })
    sessionId = session.id
  } else {
    const existing = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    })
    if (!existing) {
      return new Response(JSON.stringify({ error: "Session not found" }), { status: 404 })
    }
  }

  await prisma.chatMessage.create({
    data: { sessionId, role: "user", content: message, metadata: { mode } },
  })

  const previousMessages = await prisma.chatMessage.findMany({
    where: { sessionId, role: { in: ["user", "assistant"] } },
    orderBy: { createdAt: "asc" },
    take: 20,
  })

  const context = await buildFullContext(userId, mode)
  const systemBase = getSystemBase()
  const modePrompt = MODE_PROMPTS[mode]?.() || ""
  const systemPrompt = `${systemBase}\n\n${modePrompt}\n\n## User Context\n${context}`

  const resolvedProvider = getProvider({
    providerType: aiConfig.providerType as "openai" | "anthropic" | "google" | "custom-openai",
    apiKey: aiConfig.apiKey,
    baseUrl: aiConfig.baseUrl,
    model: aiConfig.model,
  })

  const modelToUse = modelOverride || resolvedProvider.defaultModel

  const result = streamText({
    model: resolvedProvider.model(modelToUse),
    system: systemPrompt,
    messages: previousMessages.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    onFinish: async ({ text }) => {
      await prisma.chatMessage.create({
        data: {
          sessionId,
          role: "assistant",
          content: text,
          metadata: { mode, model: modelToUse },
        },
      })
    },
  })

  return result.toTextStreamResponse()
}
