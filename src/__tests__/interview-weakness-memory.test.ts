import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  persistInterviewWeaknesses,
  getUserWeaknesses,
  formatWeaknessProbingContext,
  resolveInterviewWeaknesses,
} from "@/lib/ai/memory"
import { prisma } from "@/lib/prisma"
import { invalidateCache } from "@/lib/redis"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userMemory: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  withDbRetry: vi.fn((fn) => fn()),
}))

vi.mock("@/lib/redis", () => ({
  invalidateCache: vi.fn(),
}))

describe("INT-13: Cross-Session Interview Weakness & Memory Persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("extracts and persists knowledge gaps into UserMemory with weakness category and proper confidence", async () => {
    vi.mocked(prisma.userMemory.findMany).mockResolvedValueOnce([])
    vi.mocked(prisma.userMemory.create).mockResolvedValue({ id: "mem-1" } as any)

    const gaps = [
      {
        id: "gap-1",
        topic: "Distributed Transactions (Saga Pattern)",
        severity: "high",
        questionAsked: "How do you handle consistency across microservices?",
        weaknessReason: "Candidate jumped straight to 2PC without acknowledging availability tradeoffs or network partitions.",
      },
      {
        id: "gap-2",
        topic: "STAR Framing for Conflict",
        severity: "medium",
        questionAsked: "Tell me about a time you disagreed with a PM.",
        weaknessReason: "Lacked concrete measurable Result metric.",
      },
    ]

    const count = await persistInterviewWeaknesses("user-123", gaps, {
      targetCompany: "Stripe",
      targetRole: "Staff Backend Engineer",
      roundType: "System Design",
    })

    expect(count).toBe(2)
    expect(prisma.userMemory.create).toHaveBeenCalledTimes(2)

    // Verify first high severity insertion
    expect(prisma.userMemory.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        userId: "user-123",
        category: "weakness",
        source: "interview",
        confidence: 0.95,
        content: expect.stringContaining("Distributed Transactions (Saga Pattern)"),
      }),
    })

    // Verify second medium severity insertion
    expect(prisma.userMemory.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        userId: "user-123",
        category: "weakness",
        source: "interview",
        confidence: 0.8,
        content: expect.stringContaining("STAR Framing for Conflict"),
      }),
    })

    expect(invalidateCache).toHaveBeenCalledWith("user:memories:user-123")
  })

  it("skips duplicates if the weakness topic/content already exists for the user", async () => {
    const existingContent = "[Weakness: Kafka Partitions] [System Design] at Uber for Staff Engineer: Candidate did not understand partition key distribution"
    vi.mocked(prisma.userMemory.findMany).mockResolvedValueOnce([
      { id: "mem-existing", content: existingContent },
    ] as any)

    const gaps = [
      {
        topic: "Kafka Partitions",
        weaknessReason: "Candidate did not understand partition key distribution",
      },
      {
        topic: "Redis Cluster Sharding",
        weaknessReason: "Unaware of hash slots mechanism",
        severity: "low",
      },
    ]

    const count = await persistInterviewWeaknesses("user-123", gaps, {
      targetCompany: "Uber",
      targetRole: "Staff Engineer",
      roundType: "System Design",
    })

    expect(count).toBe(1)
    expect(prisma.userMemory.create).toHaveBeenCalledTimes(1)
    expect(prisma.userMemory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        content: expect.stringContaining("Redis Cluster Sharding"),
        confidence: 0.65,
      }),
    })
  })

  it("handles empty gaps or invalid input gracefully", async () => {
    const count = await persistInterviewWeaknesses("user-123", [])
    expect(count).toBe(0)
    expect(prisma.userMemory.create).not.toHaveBeenCalled()
  })

  it("retrieves past user weaknesses", async () => {
    const mockMemories = [
      {
        id: "mem-1",
        userId: "user-123",
        category: "weakness",
        content: "[Weakness: Raft Consensus]: Failed to explain leader election",
        confidence: 0.9,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    vi.mocked(prisma.userMemory.findMany).mockResolvedValueOnce(mockMemories as any)

    const result = await getUserWeaknesses("user-123", 3)
    expect(result).toEqual(mockMemories)
    expect(prisma.userMemory.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-123",
        category: "weakness",
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    })
  })

  it("formats weakness probing context for follow-up interviews", () => {
    const memories = [
      {
        id: "mem-1",
        userId: "user-123",
        category: "weakness",
        content: "[Weakness: Kafka]: Struggles with rebalancing",
        confidence: 0.9,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    const formatted = formatWeaknessProbingContext(memories)
    expect(formatted).toContain("PREVIOUS INTERVIEW WEAKNESSES IDENTIFIED")
    expect(formatted).toContain("1. [Weakness: Kafka]: Struggles with rebalancing")
    expect(formatted).toContain("Probe the candidate on one of these areas")
  })

  it("resolves active weaknesses when candidate scores >= 80% with matching topics/role", async () => {
    const existingWeaknesses = [
      {
        id: "mem-kafka",
        userId: "user-123",
        category: "weakness",
        content: "[Weakness: Kafka Partitions] at Stripe for Backend Engineer: Poor understanding",
      },
    ]

    vi.mocked(prisma.userMemory.findMany).mockResolvedValueOnce(existingWeaknesses as any)
    vi.mocked(prisma.userMemory.update).mockResolvedValue({ id: "mem-kafka" } as any)

    const resolved = await resolveInterviewWeaknesses("user-123", {
      targetRole: "Backend Engineer",
      topics: ["Kafka Partitions", "System Architecture"],
      overallScore: 88,
    })

    expect(resolved).toBe(1)
    expect(prisma.userMemory.update).toHaveBeenCalledWith({
      where: { id: "mem-kafka" },
      data: {
        category: "resolved_weakness",
        content: expect.stringContaining("[RESOLVED with score 88%"),
      },
    })
    expect(invalidateCache).toHaveBeenCalledWith("user:memories:user-123")
  })

  it("does not resolve weaknesses if candidate score is below 80%", async () => {
    const resolved = await resolveInterviewWeaknesses("user-123", {
      targetRole: "Backend Engineer",
      topics: ["Kafka Partitions"],
      overallScore: 65,
    })

    expect(resolved).toBe(0)
    expect(prisma.userMemory.findMany).not.toHaveBeenCalled()
    expect(prisma.userMemory.update).not.toHaveBeenCalled()
  })
})

