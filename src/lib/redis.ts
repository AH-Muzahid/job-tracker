import { Redis } from "@upstash/redis"

let redisClient: Redis | null = null

export function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

  if (!url || !token) {
    redisClient = null
    return null
  }

  if (!redisClient) {
    redisClient = new Redis({
      url,
      token,
    })
  }

  return redisClient
}

/**
 * Safely fetch a JSON-parsed cached item from Redis.
 */
export async function getCachedJson<T>(key: string): Promise<T | null> {
  const client = getRedisClient()
  if (!client) return null

  try {
    const data = await client.get<T>(key)
    return data ?? null
  } catch (err) {
    console.warn(`[Redis Cache Read Error] Key: ${key}`, err)
    return null
  }
}

/**
 * Safely store an item in Redis with a TTL in seconds (default: 1 hour = 3600s).
 */
export async function setCachedJson<T>(
  key: string,
  value: T,
  ttlSeconds: number = 3600
): Promise<boolean> {
  const client = getRedisClient()
  if (!client) return false

  try {
    await client.set(key, value, { ex: ttlSeconds })
    return true
  } catch (err) {
    console.warn(`[Redis Cache Write Error] Key: ${key}`, err)
    return false
  }
}

/**
 * Invalidate a cached key or multiple keys.
 */
export async function invalidateCache(...keys: string[]): Promise<boolean> {
  const client = getRedisClient()
  if (!client || keys.length === 0) return false

  try {
    await client.del(...keys)
    return true
  } catch (err) {
    console.warn(`[Redis Cache Delete Error] Keys: ${keys.join(", ")}`, err)
    return false
  }
}
