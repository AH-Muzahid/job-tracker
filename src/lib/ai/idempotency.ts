import { getRedisClient } from "@/lib/redis"

const IDEMPOTENCY_TTL = 300 // 5 minutes

/**
 * Generate an idempotency key from request parameters.
 */
export function generateIdempotencyKey(params: {
  userId: string
  action: string
  resourceType?: string
  resourceId?: string
  bodyHash?: string
}): string {
  const parts = [params.userId, params.action]
  if (params.resourceType) parts.push(params.resourceType)
  if (params.resourceId) parts.push(params.resourceId)
  if (params.bodyHash) parts.push(params.bodyHash)
  return `idem:${parts.join(":")}`
}

/**
 * Check if a request with this idempotency key was already processed.
 * Returns the stored result if duplicate, null if new.
 */
export async function checkIdempotency(
  key: string,
  ttlSeconds: number = IDEMPOTENCY_TTL // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<{ isDuplicate: boolean; existingResult?: unknown }> {
  const redis = getRedisClient()
  if (!redis) return { isDuplicate: false }
  try {
    const existing = await redis.get(key)
    if (existing) {
      return { isDuplicate: true, existingResult: JSON.parse(existing as string) }
    }
    return { isDuplicate: false }
  } catch {
    // Redis failure — proceed without dedup
    return { isDuplicate: false }
  }
}

/**
 * Store a result for idempotency dedup.
 */
export async function storeResult(
  key: string,
  result: unknown,
  ttlSeconds: number = IDEMPOTENCY_TTL
): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return
  try {
    await redis.set(key, JSON.stringify(result), { ex: ttlSeconds })
  } catch {
    // Redis failure — non-critical, log and continue
  }
}
