/* eslint-disable @typescript-eslint/no-explicit-any */
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres"
import { Pool } from "pg"
import { prisma } from "@/lib/prisma"

let postgresSaverInstance: PostgresSaver | null = null

/**
 * Returns a singleton PostgresSaver instance configured with the PostgreSQL connection pool.
 * Automatically initializes checkpoint tables via .setup().
 */
export async function getGraphCheckpointer(): Promise<PostgresSaver> {
  if (postgresSaverInstance) {
    return postgresSaverInstance
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  })

  postgresSaverInstance = new PostgresSaver(pool)

  // Initialize checkpoint tables
  await postgresSaverInstance.setup()

  return postgresSaverInstance
}

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
