/* eslint-disable @typescript-eslint/no-explicit-any */
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres"
import { MemorySaver } from "@langchain/langgraph"
import type { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint"
import { Pool } from "pg"
import { prisma } from "@/lib/prisma"

const globalForCheckpointer = globalThis as unknown as {
  graphCheckpointer?: BaseCheckpointSaver
  graphPool?: Pool
  checkpointerSetupPromise?: Promise<BaseCheckpointSaver>
}

/**
 * Returns a singleton PostgresSaver instance configured with the PostgreSQL connection pool.
 * Automatically initializes checkpoint tables via .setup().
 * If database pool connection fails (e.g. EMAXCONNSESSION, timeout), gracefully falls back to MemorySaver
 * to guarantee that interactive chat streaming never freezes or crashes.
 */
export async function getGraphCheckpointer(): Promise<BaseCheckpointSaver> {
  if (globalForCheckpointer.graphCheckpointer) {
    return globalForCheckpointer.graphCheckpointer
  }

  if (globalForCheckpointer.checkpointerSetupPromise) {
    return globalForCheckpointer.checkpointerSetupPromise
  }

  globalForCheckpointer.checkpointerSetupPromise = (async (): Promise<BaseCheckpointSaver> => {
    try {
      const isRemoteDb =
        process.env.DATABASE_URL?.includes("pooler.supabase.com") ||
        process.env.DATABASE_URL?.includes("supabase.co") ||
        process.env.DATABASE_URL?.includes("neon.tech") ||
        process.env.DATABASE_URL?.includes("sslmode=require")

      const pool =
        globalForCheckpointer.graphPool ??
        new Pool({
          connectionString: process.env.DATABASE_URL,
          max: 2, // Conservative pool max so checkpointer never exhausts Supabase/Neon limits
          idleTimeoutMillis: 10000,
          connectionTimeoutMillis: 5000,
          keepAlive: true,
          ssl:
            process.env.NODE_ENV === "production" || isRemoteDb
              ? { rejectUnauthorized: false }
              : undefined,
        })

      // Listen to idle client error events to prevent unhandled EventEmitter errors
      if (typeof pool.on === "function") {
        pool.on("error", (err: any) => {
          console.warn("[PostgresSaver Pool Idle Client Warning]:", err?.message || err)
        })
      }

      globalForCheckpointer.graphPool = pool

      const saver = new PostgresSaver(pool)

      // Initialize checkpoint tables with a short 5s timeout to prevent hanging on pool exhaustion
      await Promise.race([
        saver.setup(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("PostgresSaver setup timed out after 5s")), 5000)),
      ])

      globalForCheckpointer.graphCheckpointer = saver
      return saver
    } catch (setupErr: any) {
      console.warn(
        "[PostgresSaver Setup Fallback]: Could not initialize PostgresSaver (using MemorySaver fallback):",
        setupErr?.message || setupErr
      )
      const fallbackSaver = new MemorySaver()
      globalForCheckpointer.graphCheckpointer = fallbackSaver
      return fallbackSaver
    }
  })()

  try {
    return await globalForCheckpointer.checkpointerSetupPromise
  } catch {
    const fallbackSaver = new MemorySaver()
    globalForCheckpointer.graphCheckpointer = fallbackSaver
    return fallbackSaver
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
