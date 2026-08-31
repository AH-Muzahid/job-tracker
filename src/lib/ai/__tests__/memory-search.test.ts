/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { cosineSimilarity } from "../cosine-similarity"
import {
  serializeEmbedding,
  deserializeEmbedding,
  searchUserMemories,
  generateEmbedding,
} from "../memory-search"
import { prisma } from "@/lib/prisma"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    userMemory: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
  withDbRetry: vi.fn((fn) => fn()),
}))

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

describe("searchUserMemories (pgvector & fallback)", () => {
  const testUserId = "user-vec-123"

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = "sk-test"
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ embedding: [0.1, 0.2, 0.3] }],
      }),
    } as any)
  })

  it("executes native pgvector query when database supports vector extension", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      {
        id: "mem-1",
        category: "preference",
        content: "Prefers remote Golang & React roles",
        similarity: 0.94,
        createdAt: new Date(),
      },
    ] as any)

    const results = await searchUserMemories(testUserId, "Golang remote jobs")
    expect(results).toHaveLength(1)
    expect(results[0].content).toContain("Golang")
    expect(results[0].similarity).toBe(0.94)
  })

  it("falls back gracefully to in-memory cosine similarity if raw query fails", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error("extension vector does not exist"))

    vi.mocked(prisma.userMemory.findMany).mockResolvedValueOnce([
      {
        id: "mem-fallback",
        category: "skill",
        content: "Senior TypeScript architect",
        embedding: "[0.1,0.2,0.3]",
        createdAt: new Date(),
      } as any,
    ])

    const results = await searchUserMemories(testUserId, "TypeScript")
    expect(results).toHaveLength(1)
    expect(results[0].content).toContain("TypeScript")
    expect(results[0].similarity).toBeCloseTo(1.0, 3)
  })
})