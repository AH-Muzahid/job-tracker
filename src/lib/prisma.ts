import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

/**
 * Executes a Prisma query with automatic reconnect retry & exponential backoff
 * if DB connection drops, times out, or pooler fails (P1001, P1002, P1017, ECONNRESET, etc.)
 */
export async function withDbRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastError: unknown
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (err: unknown) {
      lastError = err
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errObj = err as any
      const code = errObj?.code
      const name = errObj?.name
      const msg = String(errObj?.message || "")

      const isConnectionError =
        code === "P1001" ||
        code === "P1002" ||
        code === "P1017" ||
        name === "PrismaClientInitializationError" ||
        msg.includes("Can't reach database") ||
        msg.includes("Server has closed the connection") ||
        msg.includes("ECONNRESET") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("closed the connection")

      if (isConnectionError && i < retries) {
        const waitMs = 1000 * (i + 1)
        console.warn(`[DB Retry] Connection issue detected (${code || name || "network"}). Retrying in ${waitMs}ms (attempt ${i + 1}/${retries})...`)
        
        await new Promise((r) => setTimeout(r, waitMs))
        try {
          await prisma.$disconnect()
          await prisma.$connect()
        } catch {
          // ignore disconnect/connect errors during backoff retry
        }
        continue
      }
      throw err
    }
  }
  throw lastError
}
