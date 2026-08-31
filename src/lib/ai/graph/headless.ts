/* eslint-disable @typescript-eslint/no-explicit-any */
import { getUserAIConfig } from "@/lib/ai/config"
import { buildCareerAgentGraph } from "@/lib/ai/graph/workflow"
import { createLangfuseCallbackHandler, flushLangfuse } from "@/lib/ai/graph/telemetry"
import { HumanMessage } from "@langchain/core/messages"

/**
 * Executes the LangGraph agent state machine server-side (headless)
 * without an active HTTP stream. Integrates Langfuse tracing and auto-flushing.
 */
export async function runHeadlessEvaluation(
  userId: string,
  taskPrompt: string
): Promise<{ success: boolean; content: string; plan?: any[] }> {
  try {
    const aiConfig = await getUserAIConfig(userId)
    if (!aiConfig) {
      return {
        success: false,
        content: "AI provider not configured for user. Please set up API keys in Settings.",
      }
    }

    const app = await buildCareerAgentGraph(aiConfig)
    const threadId = `bg-eval-${userId}-${Date.now()}`
    const langfuseHandler = createLangfuseCallbackHandler({
      userId,
      sessionId: threadId,
      tags: ["headless", "inngest", "background-briefing"],
      metadata: { task: "headless-evaluation" },
    })

    const threadConfig = {
      configurable: { thread_id: threadId },
      ...(langfuseHandler ? { callbacks: [langfuseHandler] } : {}),
    }

    const inputArg = {
      userId,
      sessionId: threadId,
      goal: taskPrompt,
      messages: [new HumanMessage(taskPrompt)],
      plan: [],
      currentStepIndex: 0,
      reflection: { passed: true, retryCount: 0 },
    }

    const finalState: any = await app.invoke(inputArg, threadConfig)
    await flushLangfuse()

    return {
      success: true,
      content: finalState.responseContent || "Evaluation completed successfully.",
      plan: finalState.plan || [],
    }
  } catch (err: any) {
    console.error(`[Headless Evaluation Error] User ${userId}:`, err)
    await flushLangfuse()
    return {
      success: false,
      content: `Headless evaluation encountered an error: ${err?.message || "Unknown error"}`,
    }
  }
}
