import { NextResponse } from "next/server"
import { ResponseUtil } from "@/lib/api-response"

interface RateLimitRecord {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitRecord>()

// Periodically clean up expired entries every 5 minutes
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
