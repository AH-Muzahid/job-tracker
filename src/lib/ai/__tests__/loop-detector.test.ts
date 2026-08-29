import { describe, it, expect, beforeEach } from "vitest"
import { LoopDetector } from "../loop-detector"

describe("LoopDetector", () => {
  let detector: LoopDetector

  beforeEach(() => {
    detector = new LoopDetector({
      repetitionThreshold: 3,
      timeWindowMs: 60_000,
    })
  })

  it("returns false for first call", () => {
    expect(detector.recordCall("search", { query: "test" })).toBe(false)
  })

  it("detects loop when same call repeated 3+ times", () => {
    detector.recordCall("search", { query: "test" })
    detector.recordCall("search", { query: "test" })
    expect(detector.recordCall("search", { query: "test" })).toBe(true)
  })

  it("does not detect loop with different args", () => {
    detector.recordCall("search", { query: "apple" })
    detector.recordCall("search", { query: "apple" })
    detector.recordCall("search", { query: "banana" })
    expect(detector.recordCall("search", { query: "banana" })).toBe(false)
  })

  it("does not detect loop with different tools", () => {
    detector.recordCall("search", { query: "test" })
    detector.recordCall("search", { query: "test" })
    expect(detector.recordCall("create", { name: "test" })).toBe(false)
  })

  it("detects excessive calls for a tool", () => {
    for (let i = 0; i < 5; i++) {
      detector.recordCall("search", { query: `test${i}` })
    }
    expect(detector.isToolExcessive("search", 5)).toBe(true)
  })

  it("reset clears history", () => {
    detector.recordCall("search", { query: "test" })
    detector.recordCall("search", { query: "test" })
    detector.reset()
    expect(detector.recordCall("search", { query: "test" })).toBe(false)
  })

  it("different arg orders produce same hash", () => {
    // {a: 1, b: 2} should hash same as {b: 2, a: 1}
    detector.recordCall("test", { a: 1, b: 2 })
    detector.recordCall("test", { a: 1, b: 2 })
    // This should NOT be a loop since args are semantically identical
    const result = detector.recordCall("test", { b: 2, a: 1 })
    expect(result).toBe(true) // same hash, 3rd call = loop
  })
})
