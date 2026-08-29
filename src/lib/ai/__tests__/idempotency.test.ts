import { describe, it, expect, vi, beforeEach } from "vitest"
import { generateIdempotencyKey, checkIdempotency, storeResult } from "../idempotency"

const mockRedis = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue("OK"),
}

vi.mock("@/lib/redis", () => ({
  getRedisClient: vi.fn(() => mockRedis),
}))

describe("generateIdempotencyKey", () => {
  it("generates key from basic params", () => {
    const key = generateIdempotencyKey({ userId: "u1", action: "create" })
    expect(key).toBe("idem:u1:create")
  })

  it("includes resourceType and resourceId", () => {
    const key = generateIdempotencyKey({
      userId: "u1",
      action: "create",
      resourceType: "application",
      resourceId: "app1",
    })
    expect(key).toBe("idem:u1:create:application:app1")
  })

  it("includes bodyHash", () => {
    const key = generateIdempotencyKey({
      userId: "u1",
      action: "create",
      bodyHash: "abc123",
    })
    expect(key).toBe("idem:u1:create:abc123")
  })
})

describe("checkIdempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns isDuplicate false when key not found", async () => {
    mockRedis.get.mockResolvedValue(null)
    const result = await checkIdempotency("idem:u1:create")
    expect(result.isDuplicate).toBe(false)
  })

  it("returns isDuplicate true with stored result when found", async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify({ id: "app1" }))
    const result = await checkIdempotency("idem:u1:create")
    expect(result.isDuplicate).toBe(true)
    expect(result.existingResult).toEqual({ id: "app1" })
  })

  it("returns isDuplicate false on Redis error", async () => {
    mockRedis.get.mockRejectedValue(new Error("Redis down"))
    const result = await checkIdempotency("idem:u1:create")
    expect(result.isDuplicate).toBe(false)
  })
})

describe("storeResult", () => {
  it("stores result in Redis with TTL", async () => {
    await storeResult("idem:u1:create", { id: "app1" }, 300)
    expect(mockRedis.set).toHaveBeenCalledWith(
      "idem:u1:create",
      JSON.stringify({ id: "app1" }),
      { ex: 300 }
    )
  })

  it("does not throw on Redis error", async () => {
    mockRedis.set.mockRejectedValue(new Error("Redis down"))
    await expect(storeResult("key", "value")).resolves.not.toThrow()
  })
})