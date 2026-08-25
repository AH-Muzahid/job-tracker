/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = "force-dynamic"

import { NextRequest } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { invalidateCache } from "@/lib/redis"
import { getUserAIConfig } from "@/lib/ai/config"
import { buildFullContext, budgetConversationHistory } from "@/lib/ai/context-builder"
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
import { getGeneralPrompt } from "@/lib/ai/prompts/general"
import { checkDistributedRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { createAiTools } from "@/lib/ai/tools"
import { generateHeuristicTitle, generateAndSaveSessionTitle } from "@/lib/ai/title-generator"
import { resilientStreamText } from "@/lib/ai/resilience"
import { logAITransaction } from "@/lib/ai/telemetry"
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
  "general": getGeneralPrompt,
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const traceId = crypto.randomUUID()

  const userId = await getInternalUserId()
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  const rateCheck = await checkDistributedRateLimit(`ai-chat:${userId}`, 20, 60)
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck)
  }

  const aiConfig = await getUserAIConfig(userId)
  if (!aiConfig) {
    return new Response(
      JSON.stringify({ error: "AI provider not configured. Go to Settings to set up your API key." }),
      { status: 400 }
    )
  }

  let body: { message?: string; sessionId?: string; mode?: string; model?: string; modelOverride?: string }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 })
  }

  const {
    message,
    sessionId: existingSessionId,
    mode: forcedMode,
    model: modelParam,
    modelOverride: modelOverrideParam,
  } = body
  const modelOverride = modelOverrideParam || modelParam

  if (!message || typeof message !== "string") {
    return new Response(JSON.stringify({ error: "Message is required" }), { status: 400 })
  }

  const MAX_MESSAGE_LENGTH = 15_000
  if (message.length > MAX_MESSAGE_LENGTH) {
    return new Response(
      JSON.stringify({ error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.` }),
      { status: 400 }
    )
  }

  let mode: AIMode
  let sessionId = existingSessionId

  if (!sessionId) {
    mode = (forcedMode || classifyMode(message)) as AIMode
    const initialTitle = generateHeuristicTitle(message)
    const session = await prisma.chatSession.create({
      data: { userId, mode, title: initialTitle },
    })
    sessionId = session.id
  } else {
    const existing = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    })
    if (!existing) {
      return new Response(JSON.stringify({ error: "Session not found" }), { status: 404 })
    }
    mode = (forcedMode || existing.mode || classifyMode(message)) as AIMode
  }

  // 1. Fetch previous history and context concurrently
  const [historyRaw, context] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { sessionId, role: { in: ["user", "assistant"] } },
      orderBy: { createdAt: "desc" },
      take: 16,
    }),
    buildFullContext(userId, mode),
  ])

  // Save current user message asynchronously
  void prisma.chatMessage.create({
    data: { sessionId, role: "user", content: message, metadata: { mode } },
  }).catch((err) => console.error("Failed to persist user message:", err))

  const history = historyRaw.reverse()
  const rawFormatted = [
    ...history.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user" as const, content: message },
  ]

  // Enforce character/token budgeting on conversation history
  const budgetedMessages = budgetConversationHistory(rawFormatted, 24_000)

  // Prefix Caching optimization: Static instructions in System, Dynamic user context in initial system-note
  const systemBase = getSystemBase()
  const modePrompt = MODE_PROMPTS[mode]?.() || ""
  const systemPrompt = `${systemBase}\n\n## Mandatory Output Rule\nALWAYS output your full, complete, and helpful response directly in Markdown text so the user can read and copy it immediately. If any tool was invoked (e.g. creating/updating applications), provide a clear, formatted confirmation of the action performed and next steps.\n\n## Active Mode Instructions\n${modePrompt}`

  const messagesWithContext = [
    {
      role: "user" as const,
      content: `<user_runtime_context>\n${context}\n</user_runtime_context>\n\n[Loaded current user context. Ready for workflow instructions.]`,
    },
    {
      role: "assistant" as const,
      content: "Context loaded. How can I assist you with your career workflow today?",
    },
    ...budgetedMessages,
  ]

  console.log("\n=======================================================")
  console.log(`➡️ [AI CHAT: STEP 1] Message received: "${message}"`)
  console.log(`🧠 [AI CHAT: STEP 2] Mode: [${mode}] | Session: ${sessionId}`)
  console.log(`⚙️ [AI CHAT: STEP 3] Dispatched to LLM Stream (Provider: ${aiConfig.providerType}, Model: ${modelOverride || aiConfig.model || "default"})`)

  const tools = createAiTools(userId)

  try {
    const { result, modelUsed, providerUsed } = await resilientStreamText({
      userId,
      preferredModelId: modelOverride,
      system: systemPrompt,
      messages: messagesWithContext,
      temperature: 0.35,
      tools,
      maxSteps: 2,
      onError: (err) => {
        console.error("❌ [AI CHAT: ERROR] resilientStreamText runtime error:", err)
      },
      onFinish: async ({ text, usage, toolResults }: any) => {
        console.log(`📤 [AI CHAT: STEP 4] Model Finished (Provider: ${providerUsed}, Model: ${modelUsed})`)
        console.log(`🛠️ [AI CHAT: STEP 5] Tool Invocations Count: ${toolResults?.length ?? 0}`)
        if (toolResults && toolResults.length > 0) {
          console.log("🛠️ [AI CHAT: STEP 5.1] Tool Details:", JSON.stringify(toolResults, null, 2))
        }

        let finalText = text
        if (!finalText?.trim() && toolResults && toolResults.length > 0) {
          finalText = toolResults
            .map((tr: any) => {
              const res = tr.result ?? tr.output ?? tr
              if (typeof res === "string") return res
              if (res && typeof res === "object") {
                return res.message || res.summary || res.error || `Action completed: ${tr.toolName || "tool"}`
              }
              return `Action completed: ${tr.toolName || "tool"}`
            })
            .filter(Boolean)
            .join("\n\n")
        }

        console.log(`📝 [AI CHAT: STEP 6] Final Response Text: "${finalText?.slice(0, 160)}..."`)
        console.log("=======================================================\n")

        if (finalText?.trim()) {
          try {
            const toolInvocations = (toolResults || []).map((tr: any) => ({
              toolCallId: tr.toolCallId || tr.id || `tool-${Math.random().toString(36).slice(2, 8)}`,
              toolName: tr.toolName || "tool",
              args: tr.args || {},
              state: "result" as const,
              result: tr.result ?? tr.output,
            }))

            await prisma.chatMessage.create({
              data: {
                sessionId,
                role: "assistant",
                content: finalText,
                metadata: {
                  mode,
                  model: modelUsed,
                  provider: providerUsed,
                  toolCallsCount: toolResults?.length ?? 0,
                  toolInvocations,
                },
              },
            })
            // Generate and save a smart AI title in the background
            void generateAndSaveSessionTitle(sessionId, message, finalText)

            // Invalidate Redis caches for instant freshness
            void invalidateCache(`session:data:${sessionId}`)
            void invalidateCache(`user:sessions:${userId}`)
          } catch (dbErr) {
            console.error("Failed to persist assistant message to DB:", dbErr)
          }
        }

        logAITransaction({
          traceId,
          userId,
          sessionId,
          endpoint: "/api/ai/chat",
          provider: providerUsed,
          model: modelUsed,
          promptTokens: usage?.promptTokens,
          completionTokens: usage?.completionTokens,
          latencyMs: Date.now() - startTime,
          status: "success",
          toolCallsCount: toolResults?.length ?? 0,
        })
      },
    })

    if (typeof (result as any).toDataStreamResponse === "function") {
      return (result as any).toDataStreamResponse({
        headers: {
          "X-Session-Id": sessionId,
          "X-Accel-Buffering": "no",
          "Cache-Control": "no-cache, no-transform",
        },
      })
    }

    return (result as any).toTextStreamResponse({
      headers: {
        "X-Session-Id": sessionId,
        "X-Accel-Buffering": "no",
        "Cache-Control": "no-cache, no-transform",
      },
    })
  } catch (initialErr: unknown) {
    const errMsg = initialErr instanceof Error ? initialErr.message : "Failed to initialize model stream"
    logAITransaction({
      traceId,
      userId,
      sessionId,
      endpoint: "/api/ai/chat",
      provider: aiConfig.providerType,
      model: modelOverride || aiConfig.model || "default",
      latencyMs: Date.now() - startTime,
      status: "error",
      error: errMsg,
    })

    return new Response(`⚠️ **Model Error:** ${errMsg}`, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Session-Id": sessionId,
      },
    })
  }
}
