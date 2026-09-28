import { describe, it, expect, vi, beforeEach } from "vitest"
import { handleApplicationOutcomeFeedback } from "../learning-engine"
import * as redis from "@/lib/redis"

vi.mock("@/lib/redis", () => ({
  invalidateCache: vi.fn().mockResolvedValue(true),
  getCachedJson: vi.fn().mockResolvedValue(null),
  setCachedJson: vi.fn().mockResolvedValue(true),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
  withDbRetry: vi.fn((cb) => cb()),
}))

describe("Level 5 Closed-Loop Self-Evolution Feedback Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("triggers calibration and invalidates cache when application converts to Interview", async () => {
    const result = await handleApplicationOutcomeFeedback("user-1", {
      id: "app-1",
      status: "Interview",
      companyName: "Stripe",
      jobTitle: "Senior Systems Engineer",
    })

    expect(result.calibrated).toBe(true)
    expect(result.signal).toContain("Positive signal")
    expect(result.signal).toContain("Stripe")
    expect(redis.invalidateCache).toHaveBeenCalledWith("user:macro-outcomes:user-1")
  })

  it("triggers calibration when application converts to Rejected", async () => {
    const result = await handleApplicationOutcomeFeedback("user-1", {
      id: "app-2",
      status: "Rejected",
      companyName: "Google",
      jobTitle: "L6 Staff Engineer",
    })

    expect(result.calibrated).toBe(true)
    expect(result.signal).toContain("Calibration signal")
    expect(redis.invalidateCache).toHaveBeenCalledWith("user:macro-outcomes:user-1")
  })

  it("skips non-outcome status transitions (e.g. Saved or Applied)", async () => {
    const result = await handleApplicationOutcomeFeedback("user-1", {
      id: "app-3",
      status: "Applied",
      companyName: "Netflix",
    })

    expect(result.calibrated).toBe(false)
    expect(redis.invalidateCache).not.toHaveBeenCalled()
  })
})
