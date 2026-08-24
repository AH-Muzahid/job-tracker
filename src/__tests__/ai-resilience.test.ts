import { describe, it, expect } from "vitest"
import {
  isRetryableError,
  getBackoffDelay,
  getEmergencyInterviewTurn,
} from "@/lib/ai/resilience"

describe("AI Resilience Engine", () => {
  describe("isRetryableError", () => {
    it("identifies 429 rate limit as retryable", () => {
      expect(isRetryableError({ status: 429 })).toBe(true)
      expect(isRetryableError({ statusCode: 429 })).toBe(true)
      expect(isRetryableError(new Error("Rate limit exceeded"))).toBe(true)
    })

    it("identifies 500/503 server errors as retryable", () => {
      expect(isRetryableError({ status: 500 })).toBe(true)
      expect(isRetryableError({ status: 503 })).toBe(true)
      expect(isRetryableError({ response: { status: 502 } })).toBe(true)
    })

    it("identifies network drops, connection timeouts, and aborts as retryable", () => {
      expect(isRetryableError(new Error("fetch failed"))).toBe(true)
      expect(isRetryableError(new Error("The operation was aborted"))).toBe(true)
      expect(isRetryableError(new Error("Model connection timeout"))).toBe(true)
      expect(isRetryableError({ code: "ECONNRESET" })).toBe(true)
    })

    it("identifies non-retryable errors as false (e.g. 400 Bad Request / 401 Unauthorized)", () => {
      expect(isRetryableError({ status: 400 })).toBe(false)
      expect(isRetryableError({ status: 401 })).toBe(false)
      expect(isRetryableError(new Error("Invalid schema"))).toBe(false)
      expect(isRetryableError(null)).toBe(false)
    })
  })

  describe("getBackoffDelay", () => {
    it("calculates exponential backoff within bounds", () => {
      const delay1 = getBackoffDelay(1, 500, 3000)
      expect(delay1).toBeGreaterThanOrEqual(1000)
      expect(delay1).toBeLessThan(1500)

      const delay3 = getBackoffDelay(3, 500, 3000)
      expect(delay3).toBeGreaterThanOrEqual(3000)
      expect(delay3).toBeLessThanOrEqual(3250)
    })
  })

  describe("getEmergencyInterviewTurn", () => {
    it("returns contextually appropriate questions across turns", () => {
      const turn1 = getEmergencyInterviewTurn("Backend Engineer", "Google", "Intro", 1)
      expect(turn1).toContain("Backend Engineer")

      const turn2 = getEmergencyInterviewTurn("Staff Architect", "Meta", "Tech", 2)
      expect(turn2).toContain("Meta")

      const turn5 = getEmergencyInterviewTurn("Lead Frontend", "Stripe", "Wrap-up", 5)
      expect(turn5).toContain("Lead Frontend")
    })
  })
})
