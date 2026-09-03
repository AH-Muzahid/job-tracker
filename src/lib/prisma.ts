import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const prisma: PrismaClient & {
  userMemory: any
  knowledgeGraph: any
  [key: string]: any
} = (globalForPrisma.prisma ?? new PrismaClient()) as any

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

/**
 * Executes a Prisma query with automatic reconnect retry & exponential backoff
 * if DB connection drops, times out, or pooler fails (P1001, P1002, P1017, ECONNRESET, etc.)
 */
export async function withDbRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (err: unknown) {
      lastError = err
      const errObj = err as any
      const code = errObj?.code
      const name = errObj?.name
      const msg = String(errObj?.message || "")

      const isConnectionError =
        code === "P1001" ||
        code === "P1002" ||
        code === "P1017" ||
        code === "P2024" ||
        name === "PrismaClientInitializationError" ||
        name === "PrismaClientUnknownRequestError" ||
        msg.includes("Engine is not yet connected") ||
        msg.includes("Can't reach database") ||
        msg.includes("EMAXCONNSESSION") ||
        msg.includes("max clients reached") ||
        msg.includes("connection pool") ||
        msg.includes("connection limit") ||
        msg.includes("ECONNRESET") ||
        msg.includes("ETIMEDOUT")

      if (isConnectionError && i < retries) {
        const waitMs = 300 * (i + 1)
        console.warn(`[DB Retry] Connection issue detected (${code || name || "network"}). Retrying in ${waitMs}ms (attempt ${i + 1}/${retries})...`)
        await new Promise((r) => setTimeout(r, waitMs))
        continue
      }
      throw err
    }
  }
  throw lastError
}
