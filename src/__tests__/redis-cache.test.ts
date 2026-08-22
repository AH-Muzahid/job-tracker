import { describe, it, expect, beforeEach } from "vitest"
import { getCachedJson, setCachedJson, getRedisClient } from "@/lib/redis"

describe("Redis Cache Layer", () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = "https://novel-newt-117056.upstash.io"
    process.env.UPSTASH_REDIS_REST_TOKEN = "gQAAAAAAAclAAAIgcDEzZTg5YmQwZTA4ODE0ZTdhODI5MWRhODIxNDI3OGJjMg"
  })

  it("initializes Redis client when credentials are provided", () => {
    const client = getRedisClient()
    expect(client).toBeDefined()
  })

  it("handles non-existent keys gracefully returning null", async () => {
    const nonExistent = await getCachedJson("key:that:does:not:exist:99999")
    expect(nonExistent).toBeNull()
  })

  it("handles unconfigured Redis gracefully without crashing", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    delete process.env.KV_REST_API_URL
    delete process.env.KV_REST_API_TOKEN

    const result = await getCachedJson("any:key")
    expect(result).toBeNull()

    const setRes = await setCachedJson("any:key", { test: 1 })
    expect(setRes).toBe(false)
  })
})
