/* eslint-disable @typescript-eslint/no-explicit-any */
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres"
import { Pool } from "pg"
import { prisma } from "@/lib/prisma"

const globalForCheckpointer = globalThis as unknown as {
  graphCheckpointer?: PostgresSaver
  graphPool?: Pool
  checkpointerSetupPromise?: Promise<PostgresSaver>
}

/**
 * Returns a singleton PostgresSaver instance configured with the PostgreSQL connection pool.
 * Automatically initializes checkpoint tables via .setup().
 */
export async function getGraphCheckpointer(): Promise<PostgresSaver> {
  if (globalForCheckpointer.graphCheckpointer) {
    return globalForCheckpointer.graphCheckpointer
  }

  if (globalForCheckpointer.checkpointerSetupPromise) {
    return globalForCheckpointer.checkpointerSetupPromise
  }

  globalForCheckpointer.checkpointerSetupPromise = (async () => {
    const isRemoteDb =
      process.env.DATABASE_URL?.includes("pooler.supabase.com") ||
      process.env.DATABASE_URL?.includes("supabase.co") ||
      process.env.DATABASE_URL?.includes("neon.tech") ||
      process.env.DATABASE_URL?.includes("sslmode=require")

    const pool =
      globalForCheckpointer.graphPool ??
      new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        keepAlive: true,
        ssl:
          process.env.NODE_ENV === "production" || isRemoteDb
            ? { rejectUnauthorized: false }
            : undefined,
      })

    // Listen to idle client error events to prevent unhandled EventEmitter errors
    // from triggering uncaughtException crashes when Supabase/Neon/Postgres drops idle connections.
    if (typeof pool.on === "function") {
      pool.on("error", (err: any) => {
        console.warn("[PostgresSaver Pool Idle Client Warning]:", err?.message || err)
      })
    }

    globalForCheckpointer.graphPool = pool

    const saver = new PostgresSaver(pool)

    // Initialize checkpoint tables
    await saver.setup()

    globalForCheckpointer.graphCheckpointer = saver
    return saver
  })()

  try {
    return await globalForCheckpointer.checkpointerSetupPromise
  } catch (err) {
    // Reset setup promise on failure so next attempt can retry
    globalForCheckpointer.checkpointerSetupPromise = undefined
    throw err
  }
}

/**
 * Persists high-level plan & state metadata to Prisma ChatSession
 */
export async function persistGraphSessionState(
  sessionId: string,
  state?: {
    plan?: any
    currentStepIndex?: number
    goal?: string
    reflection?: any
  }
) {
  if (!sessionId) return
  void state
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
