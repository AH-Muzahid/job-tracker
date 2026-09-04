import { prisma, withDbRetry } from "@/lib/prisma"
import { getCachedJson, setCachedJson, invalidateCache } from "@/lib/redis"

/**
 * Checks connection status of user's Google Account.
 * Lightweight - does not load the massive googleapis SDK.
 */
export async function getConnectedGoogleAccount(userId: string): Promise<{
  connected: boolean
  email?: string
  provider?: string
  expiresAt?: Date
}> {
  if (!userId) return { connected: false }

  const cacheKey = `account:connected:${userId}`
  const cached = await getCachedJson<{ email: string; provider: string; expiresAt: string }>(cacheKey)

  if (cached) {
    return {
      connected: true,
      email: cached.email,
      provider: cached.provider,
      expiresAt: new Date(cached.expiresAt),
    }
  }

  const account = await withDbRetry(() =>
    prisma.connectedAccount.findUnique({
      where: { userId },
      select: { email: true, provider: true, expiresAt: true },
    })
  )

  if (!account) {
    return { connected: false }
  }

  void setCachedJson(
    cacheKey,
    {
      email: account.email,
      provider: account.provider,
      expiresAt: account.expiresAt.toISOString(),
    },
    3600
  )

  return {
    connected: true,
    email: account.email,
    provider: account.provider,
    expiresAt: account.expiresAt,
  }
}

/**
 * Disconnects the user's Google Account and removes cached credentials.
 */
export async function disconnectGoogleAccount(userId: string): Promise<{ success: boolean }> {
  if (!userId) return { success: false }

  await withDbRetry(() =>
    prisma.connectedAccount.deleteMany({
      where: { userId, provider: "google" },
    })
  )

  await invalidateCache(`account:connected:${userId}`)
  return { success: true }
}
