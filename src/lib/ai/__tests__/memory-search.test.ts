import { describe, it, expect, vi, beforeEach } from "vitest"
import { cosineSimilarity } from "../cosine-similarity"
import { serializeEmbedding, deserializeEmbedding } from "../memory-search"

describe("cosineSimilarity", () => {
  it("should return 1 for identical vectors", () => {
    const a = [1, 0, 0]
    const b = [1, 0, 0]
    expect(cosineSimilarity(a, b)).toBe(1)
  })

  it("should return 0 for orthogonal vectors", () => {
    const a = [1, 0, 0]
    const b = [0, 1, 0]
    expect(cosineSimilarity(a, b)).toBe(0)
  })

  it("should return -1 for opposite vectors", () => {
    const a = [1, 0, 0]
    const b = [-1, 0, 0]
    expect(cosineSimilarity(a, b)).toBe(-1)
  })

  it("should return 0 for zero vector", () => {
    const a = [0, 0, 0]
    const b = [1, 0, 0]
    expect(cosineSimilarity(a, b)).toBe(0)
  })

  it("should throw for vectors of different lengths", () => {
    const a = [1, 0]
    const b = [1, 0, 0]
    expect(() => cosineSimilarity(a, b)).toThrow("Vectors must have the same length")
  })

  it("should compute correct similarity for similar vectors", () => {
    const a = [1, 1, 0]
    const b = [1, 0, 0]
    const expected = 1 / Math.sqrt(2)
    expect(cosineSimilarity(a, b)).toBeCloseTo(expected, 5)
  })
})

describe("serializeEmbedding", () => {
  it("should serialize a number array to JSON string", () => {
    const embedding = [0.1, 0.2, 0.3]
    const result = serializeEmbedding(embedding)
    expect(result).toBe("[0.1,0.2,0.3]")
  })

  it("should handle empty array", () => {
    const result = serializeEmbedding([])
    expect(result).toBe("[]")
  })
})

describe("deserializeEmbedding", () => {
  it("should deserialize JSON string to number array", () => {
    const serialized = "[0.1,0.2,0.3]"
    const result = deserializeEmbedding(serialized)
    expect(result).toEqual([0.1, 0.2, 0.3])
  })

  it("should handle empty array string", () => {
    const result = deserializeEmbedding("[]")
    expect(result).toEqual([])
  })

  it("should throw for invalid JSON", () => {
    expect(() => deserializeEmbedding("invalid")).toThrow()
  })
})