/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = "force-dynamic"

import { NextRequest } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { getUserAIConfig } from "@/lib/ai/config"
import { buildCareerAgentGraph } from "@/lib/ai/graph/workflow"
import { HumanMessage } from "@langchain/core/messages"
import { Command } from "@langchain/langgraph"
import { trackGraphExecution, createLangfuseCallbackHandler, flushLangfuse } from "@/lib/ai/graph/telemetry"
import { prisma, withDbRetry } from "@/lib/prisma"
import { triggerBackgroundSummarize } from "@/lib/ai/conversation-summarizer"
import { generateAndSaveSessionTitle } from "@/lib/ai/title-generator"
import { invalidateCache } from "@/lib/redis"

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  const aiConfig = await getUserAIConfig(userId, undefined, { requireUserKey: true })
  if (!aiConfig) {
    return new Response(
      JSON.stringify({
        error: "AI key required. Please add your personal AI API key (Google Gemini, Groq, or OpenAI) in Settings > AI Configuration.",
        code: "AI_KEY_REQUIRED",
      }),
      { status: 400 }
    )
  }

  let body: {
    message?: string
    sessionId?: string
    resumeAction?: string
    resumePayload?: any
    routeContext?: {
      currentRoute?: string
      entityId?: string
      entityType?: "application" | "opportunity" | "general" | string
      metadata?: Record<string, any>
    }
  }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 })
  }

  const { message, sessionId = crypto.randomUUID(), resumeAction, resumePayload, routeContext } = body

  if (!message && !resumeAction) {
    return new Response(JSON.stringify({ error: "Message or resume action is required" }), { status: 400 })
  }

  if (message && message.length > 4000) {
    return new Response(
      JSON.stringify({ error: "Message exceeds maximum allowed length of 4000 characters." }),
      { status: 400 }
    )
  }

  // Ensure ChatSession exists in DB
  try {
    await withDbRetry(() =>
      prisma.chatSession.upsert({
        where: { id: sessionId },
        create: {
          id: sessionId,
          userId,
          title: message ? message.slice(0, 40) : "Agent Session",
        },
        update: {
          updatedAt: new Date(),
        },
      })
    )

    if (message) {
      await withDbRetry(() =>
        prisma.chatMessage.create({
          data: {
            sessionId,
            role: "user",
            content: message,
          },
        })
      )
      await invalidateCache(`session:data:${sessionId}`, `user:sessions:${userId}`)
    }
  } catch (dbErr) {
    console.warn("[Session Upsert Warning]:", dbErr)
  }

  // Candidate Profile Context to prevent generic placeholder hallucination
  let candidateContext = ""
  try {
    const userRecord = await withDbRetry(() =>
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          profile: {
            select: {
              targetRoles: true,
              experienceLevel: true,
              strengths: true,
            },
          },
        },
      })
    )
    if (userRecord) {
      const parts: string[] = []
      if (userRecord.name) parts.push(`Candidate Name: ${userRecord.name}`)
      if (userRecord.profile?.targetRoles && userRecord.profile.targetRoles.length > 0) {
        parts.push(`Target Role: ${userRecord.profile.targetRoles.join(", ")}`)
      }
      if (userRecord.profile?.experienceLevel) {
        parts.push(`Experience Level: ${userRecord.profile.experienceLevel}`)
      }
      if (userRecord.profile?.strengths) {
        parts.push(`Key Strengths: ${userRecord.profile.strengths}`)
      }
      candidateContext = parts.join(" | ")
    }
  } catch (err) {
    console.warn("[Candidate Context Warning]:", err)
  }

  // Ambient Copilot: Enrich route context with verified tenant-isolated entity data
  let enrichedRouteContext: any = null
  const currentRoute = routeContext?.currentRoute || "/"
  const entityId = routeContext?.entityId
  const entityType = routeContext?.entityType
  const metadata = routeContext?.metadata || {}
  let entitySummary: Record<string, any> | undefined = undefined

  if (entityId && entityType === "application") {
    try {
      const app = await withDbRetry(() =>
        prisma.application.findFirst({
          where: { id: entityId, userId },
          select: {
            id: true,
            companyName: true,
            jobTitle: true,
            status: true,
            interviewDate: true,
            interviewRound: true,
            notes: true,
          },
        })
      )
      if (app) {
        entitySummary = {
          applicationId: app.id,
          companyName: app.companyName,
          jobTitle: app.jobTitle,
          status: app.status,
          interviewDate: app.interviewDate ? app.interviewDate.toISOString() : null,
          interviewRound: app.interviewRound || null,
          notes: app.notes || null,
        }
      }
    } catch (appErr) {
      console.warn("[RouteContext App Lookup Warning]:", appErr)
    }
  } else if (entityId && entityType === "opportunity") {
    try {
      const match = await withDbRetry(async () => {
        if (!prisma.userJobMatch?.findFirst) return null
        return await prisma.userJobMatch.findFirst({
          where: { id: entityId, userId },
          include: {
            job: {
              select: {
                id: true,
                title: true,
                company: true,
                location: true,
                salary: true,
                url: true,
              },
            },
          },
        })
      })
      if (match) {
        entitySummary = {
          matchId: match.id,
          fitScore: match.fitScore,
          jobTitle: match.job?.title,
          companyName: match.job?.company,
          location: match.job?.location,
          salary: match.job?.salary,
        }
      }
    } catch (matchErr) {
      console.warn("[RouteContext Match Lookup Warning]:", matchErr)
    }
  }

  enrichedRouteContext = {
    currentRoute,
    entityId,
    entityType,
    entitySummary,
    metadata: {
      ...metadata,
      candidate: candidateContext || undefined,
    },
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(payload))
        } catch {
          // Stream might be closed by client if navigated away; background execution continues safely
        }
      }

      // Instant status event to eliminate silent TTFT delay
      sendEvent("status", { text: "Thinking..." })

      try {
        let accumulatedResponseContent = ""
        let accumulatedPlan: any[] = []

        sendEvent("status", { text: "Analyzing request & planning..." })

        const app = await buildCareerAgentGraph(aiConfig, {
          onToken: (delta: string) => {
            accumulatedResponseContent += delta
            sendEvent("token", { delta })
          },
        })
        const threadConfig = {
          configurable: {
            thread_id: sessionId,
          },
        }

        let inputArg: any

        if (resumeAction) {
          inputArg = new Command({
            resume: {
              action: resumeAction,
              payload: resumePayload,
            },
          })
        } else {
          inputArg = {
            userId,
            sessionId,
            goal: message,
            messages: [new HumanMessage(message!)],
            plan: [],
            currentStepIndex: 0,
            reflection: { passed: true, retryCount: 0 },
            routeContext: enrichedRouteContext,
          }
        }

        const langfuseHandler = createLangfuseCallbackHandler({
          userId,
          sessionId,
          tags: ["chat-stream", "interactive-agent"],
          metadata: { resumeAction: resumeAction || null },
        })

        const events = await app.stream(inputArg, {
          ...threadConfig,
          streamMode: "updates",
          ...(langfuseHandler ? { callbacks: [langfuseHandler] } : {}),
        })

        for await (const update of events) {
          for (const [nodeName, nodeState] of Object.entries(update)) {
            sendEvent(nodeName, nodeState)
            if (nodeName === "planner") {
              sendEvent("status", { text: "Executing plan..." })
            } else if (nodeName === "executor") {
              sendEvent("status", { text: "Verifying actions..." })
            } else if (nodeName === "reflector") {
              sendEvent("status", { text: "Synthesizing response..." })
            }
            if ((nodeState as any)?.responseContent) {
              accumulatedResponseContent = String((nodeState as any).responseContent)
            }
            if (Array.isArray((nodeState as any)?.plan) && (nodeState as any).plan.length > 0) {
              accumulatedPlan = (nodeState as any).plan
            }
            if (!langfuseHandler) {
              void trackGraphExecution({
                userId,
                sessionId,
                nodeName,
                input: inputArg,
                output: nodeState,
                startTime: Date.now(),
              })
            }
          }
        }

        // Check if graph halted on interrupt
        const finalState = await app.getState(threadConfig)
        if (finalState.tasks && finalState.tasks.length > 0 && finalState.tasks[0].interrupts?.length > 0) {
          sendEvent("interrupt", {
            interrupts: finalState.tasks[0].interrupts,
            state: finalState.values,
          })
        } else {
          const finalValues: any = finalState.values || {}
          let responseText = (finalValues?.responseContent || accumulatedResponseContent || "").trim()
          const planToSave = (Array.isArray(finalValues?.plan) && finalValues.plan.length > 0) ? finalValues.plan : accumulatedPlan

          if (!responseText) {
            if (Array.isArray(planToSave) && planToSave.some((s: any) => s.status === "completed" && s.result)) {
              const completedTasks = planToSave
                .filter((s: any) => s.status === "completed")
                .map((s: any) => `• ${s.task}`)
                .join("\n")
              responseText = `I have completed the requested actions:\n\n${completedTasks}\n\nPlease let me know how you would like to proceed next.`
            } else {
              responseText = "I have processed your request. How would you like to proceed next?"
            }
            finalValues.responseContent = responseText
          }

          // Persist assistant message in DB
          try {
            await withDbRetry(() =>
              prisma.chatMessage.create({
                data: {
                  sessionId,
                  role: "assistant",
                  content: responseText,
                  metadata: {
                    plan: planToSave,
                  },
                },
              })
            )

            // Await Redis cache invalidation so immediate client refetches guaranteed see the assistant message
            await invalidateCache(`session:data:${sessionId}`, `user:sessions:${userId}`)

              // Asynchronously check & trigger background summarizer if threshold reached
              void (async () => {
                try {
                  const messageCount = await prisma.chatMessage.count({ where: { sessionId } })
                  if (messageCount >= 8 && messageCount % 4 === 0) {
                    await triggerBackgroundSummarize(sessionId, userId)
                  }
                } catch (summaryTriggerErr) {
                  console.warn("[Background Summarizer Trigger Warning]:", summaryTriggerErr)
                }
              })()

              // Asynchronously generate smart session title if needed
              void (async () => {
                try {
                  const currentSession = await prisma.chatSession.findUnique({
                    where: { id: sessionId },
                    select: { title: true },
                  })
                  const title = currentSession?.title || ""
                  if (
                    !title ||
                    title === "New Chat" ||
                    title === "Agent Session" ||
                    title.toLowerCase().startsWith("hi") ||
                    title.length <= 4
                  ) {
                    await generateAndSaveSessionTitle(sessionId, message || "", responseText)
                  }
                } catch (titleErr) {
                  console.warn("[Smart Title Generation Warning]:", titleErr)
                }
              })()
            } catch (saveErr) {
              console.warn("[Save Assistant Msg Warning]:", saveErr)
            }

          sendEvent("done", {
            state: finalValues,
          })
        }

        await flushLangfuse()
        controller.close()
      } catch (err: any) {
        sendEvent("error", { error: err?.message || "Graph execution error" })
        await flushLangfuse()
        controller.close()
      }
    },
    cancel() {
      // Client closed downstream SSE stream; background execution continues to persist completed message in DB
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "X-Session-Id": sessionId,
    },
  })
}
