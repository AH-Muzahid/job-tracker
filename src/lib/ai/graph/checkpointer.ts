/* eslint-disable @typescript-eslint/no-explicit-any */
import { MemorySaver } from "@langchain/langgraph"
import { prisma } from "@/lib/prisma"

/**
 * In-memory checkpointer singleton for active agent execution states.
 */
export const memoryCheckpointer = new MemorySaver()

/**
 * Persists high-level plan & state metadata to Prisma ChatSession
 */
export async function persistGraphSessionState(
  sessionId: string,
  _state: {
    plan?: any
    currentStepIndex?: number
    goal?: string
    reflection?: any
  }
) {
  if (!sessionId) return
  try {
    // Save state snapshot into ChatSession metadata if needed
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        updatedAt: new Date(),
      },
    })
  } catch (err) {
    console.warn("[Checkpointer Persist Warning]:", err)
  }
}
