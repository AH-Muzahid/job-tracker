import { cache } from "react"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { prisma, withDbRetry } from "@/lib/prisma"
import { getCachedJson, setCachedJson } from "@/lib/redis"

const userIdMemoryCache = new Map<string, string>()

/**
 * High-performance internal user ID resolver with 2-layer caching:
 * 1. In-memory local map (0ms)
 * 2. Distributed Upstash Redis cache (15ms across serverless lambdas)
 * 3. Neon DB lookup with write-through cache populate
 */
export const getInternalUserId = cache(async function getInternalUserId() {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return null

  // Layer 1: In-memory local node cache
  const localCachedId = userIdMemoryCache.get(clerkUserId)
  if (localCachedId) return localCachedId

  // Layer 2: Redis distributed cache
  const redisCacheKey = `auth:clerk:${clerkUserId}`
  const redisCachedId = await getCachedJson<string>(redisCacheKey)
  if (redisCachedId) {
    userIdMemoryCache.set(clerkUserId, redisCachedId)
    return redisCachedId
  }

  // Layer 3: Neon DB query
  let user = await withDbRetry(() =>
    prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    })
  )

  if (!user) {
    const clerkUser = await (await clerkClient()).users.getUser(clerkUserId)
    const email = clerkUser.emailAddresses?.[0]?.emailAddress
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || email

    user = await withDbRetry(() =>
      prisma.user.create({
        data: {
          clerkUserId,
          name: name || "",
          email: email || "",
        },
        select: { id: true },
      })
    )
  }

  if (user?.id) {
    // Populate both cache layers for 24 hours (86400s)
    userIdMemoryCache.set(clerkUserId, user.id)
    void setCachedJson(redisCacheKey, user.id, 86400)
  }

  return user?.id || null
})
