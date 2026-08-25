import { NextResponse } from "next/server"
import { ResponseUtil } from "@/lib/api-response"
import { getRedisClient } from "@/lib/redis"

interface RateLimitRecord {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitRecord>()

// Periodically clean up expired in-memory entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetAt) {
        rateLimitStore.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetInSeconds: number
}

/**
 * In-memory sliding window rate limiter helper for Next.js Route Handlers.
 * @param identifier Unique key (e.g., userId or IP address)
 * @param limit Maximum requests allowed within window
 * @param windowMs Time window in milliseconds (default: 60,000ms = 1 min)
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 15,
  windowMs: number = 60 * 1000
): RateLimitResult {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)

  if (!record || now > record.resetAt) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetAt: now + windowMs,
    }
    rateLimitStore.set(identifier, newRecord)
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
    }
  }

  if (record.count >= limit) {
    const resetInSeconds = Math.ceil((record.resetAt - now) / 1000)
    return {
      success: false,
      limit,
      remaining: 0,
      resetInSeconds: Math.max(1, resetInSeconds),
    }
  }

  record.count += 1
  rateLimitStore.set(identifier, record)

  return {
    success: true,
    limit,
    remaining: limit - record.count,
    resetInSeconds: Math.ceil((record.resetAt - now) / 1000),
  }
}

/**
 * Distributed rate limiter using Upstash Redis with local memory fallback.
 */
export async function checkDistributedRateLimit(
  identifier: string,
  limit: number = 15,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const redis = getRedisClient()
  if (!redis) {
    return checkRateLimit(identifier, limit, windowSeconds * 1000)
  }

  const key = `ratelimit:${identifier}`
  try {
    const current = await redis.incr(key)
    if (current === 1) {
      await redis.expire(key, windowSeconds)
    } else {
      // Self-healing: if key has no TTL due to a previous crash, re-apply expiry
      const currentTtl = await redis.ttl(key)
      if (currentTtl === -1) {
        await redis.expire(key, windowSeconds)
      }
    }
    const ttl = await redis.ttl(key)
    const resetInSeconds = ttl > 0 ? ttl : windowSeconds

    if (current > limit) {
      return {
        success: false,
        limit,
        remaining: 0,
        resetInSeconds,
      }
    }

    return {
      success: true,
      limit,
      remaining: Math.max(0, limit - current),
      resetInSeconds,
    }
  } catch (err) {
    console.warn(`[Distributed RateLimit Error] Falling back to in-memory:`, err)
    return checkRateLimit(identifier, limit, windowSeconds * 1000)
  }
}

/**
 * Returns a 429 Too Many Requests response with standard RateLimit headers.
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const response = ResponseUtil.error(
    `Rate limit exceeded. Please try again in ${result.resetInSeconds} seconds.`,
    429
  )

  response.headers.set("X-RateLimit-Limit", result.limit.toString())
  response.headers.set("X-RateLimit-Remaining", result.remaining.toString())
  response.headers.set("X-RateLimit-Reset", result.resetInSeconds.toString())
  response.headers.set("Retry-After", result.resetInSeconds.toString())

  return response
}
