import { describe, it, expect } from "vitest"
import { scoreMemory, findMergeableMemories } from "../memory-consolidator"

describe("scoreMemory", () => {
  it("gives higher score to frequently accessed memory", () => {
    const recent = scoreMemory({
      confidence: 1.0,
      accessCount: 10,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
    })
    const stale = scoreMemory({
      confidence: 1.0,
      accessCount: 0,
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      lastAccessedAt: null,
    })
    expect(recent).toBeGreaterThan(stale)
  })

  it("considers confidence in scoring", () => {
    const high = scoreMemory({ confidence: 1.0, accessCount: 5, createdAt: new Date(), lastAccessedAt: new Date() })
    const low = scoreMemory({ confidence: 0.3, accessCount: 5, createdAt: new Date(), lastAccessedAt: new Date() })
    expect(high).toBeGreaterThan(low)
  })

  it("returns a value between 0 and 1", () => {
    const score = scoreMemory({ confidence: 0.5, accessCount: 3, createdAt: new Date(), lastAccessedAt: null })
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(1)
  })

  it("defaults confidence to 1.0 when null", () => {
    const withNull = scoreMemory({ confidence: null, accessCount: 0, createdAt: new Date(), lastAccessedAt: null })
    const withOne = scoreMemory({ confidence: 1.0, accessCount: 0, createdAt: new Date(), lastAccessedAt: null })
    expect(withNull).toBe(withOne)
  })
})

describe("findMergeableMemories", () => {
  it("finds similar memories in same category", () => {
    const memories = [
      { id: "1", content: "Prefers React over Vue for frontend", category: "preference" },
      { id: "2", content: "Prefers React over Angular for frontend work", category: "preference" },
      { id: "3", content: "Uses Python for backend", category: "skill" },
    ]
    const mergeable = findMergeableMemories(memories)
    expect(mergeable.length).toBe(1)
    expect(mergeable[0][0].keep).toBe("1")
  })

  it("does not merge across categories", () => {
    const memories = [
      { id: "1", content: "Prefers React for frontend", category: "preference" },
      { id: "2", content: "Prefers React for frontend development", category: "skill" },
    ]
    const mergeable = findMergeableMemories(memories)
    expect(mergeable.length).toBe(0)
  })

  it("returns empty array when no similar memories", () => {
    const memories = [
      { id: "1", content: "Prefers React", category: "preference" },
      { id: "2", content: "Uses Python for backend", category: "skill" },
    ]
    const mergeable = findMergeableMemories(memories)
    expect(mergeable.length).toBe(0)
  })

  it("handles empty input", () => {
    const mergeable = findMergeableMemories([])
    expect(mergeable.length).toBe(0)
  })

  it("does not merge a memory with itself", () => {
    const memories = [
      { id: "1", content: "Prefers React over Vue for frontend", category: "preference" },
    ]
    const mergeable = findMergeableMemories(memories)
    expect(mergeable.length).toBe(0)
  })
})
