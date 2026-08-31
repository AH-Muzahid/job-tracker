/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { buildFullContext, getCachedProfile } from "../context-builder"
import { searchUserMemories } from "../memory-search"
import { prisma } from "@/lib/prisma"

vi.mock("../memory-search", () => ({
  searchUserMemories: vi.fn(),
}))

vi.mock("@/lib/redis", () => ({
  getCachedJson: vi.fn().mockResolvedValue(null),
  setCachedJson: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    userProfile: {
      findUnique: vi.fn(),
    },
    userMemory: {
      findMany: vi.fn(),
    },
    careerKnowledgeGraph: {
      findUnique: vi.fn(),
    },
    application: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
  withDbRetry: vi.fn((fn) => fn()),
}))

describe("Semantic Context Builder with pgvector", () => {
  const testUserId = "user-vector-ctx-123"

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      name: "Jane Doe",
      email: "jane.doe@example.com",
    } as any)

    vi.mocked(prisma.userProfile.findUnique).mockResolvedValue({
      location: "San Francisco, CA",
      targetRoles: ["Staff Backend Engineer", "Distributed Systems Lead"],
      experienceLevel: "Staff",
      strengths: "Golang, Rust, PostgreSQL, Kubernetes",
    } as any)

    vi.mocked(prisma.careerKnowledgeGraph.findUnique).mockResolvedValue(null)
  })

  it("fetches semantic memories matching user message using searchUserMemories", async () => {
    vi.mocked(searchUserMemories).mockResolvedValueOnce([
      {
        id: "mem-1",
        category: "achievement",
        content: "Optimized Postgres queries reducing latency by 45%",
        similarity: 0.89,
        createdAt: new Date(),
      },
      {
        id: "mem-2",
        category: "preference",
        content: "Prefers asynchronous remote work in Pacific timezone",
        similarity: 0.78,
        createdAt: new Date(),
      },
    ])

    const message = "Help me prepare for a Postgres architecture interview"
    const context = await buildFullContext(testUserId, message)

    expect(searchUserMemories).toHaveBeenCalledWith(testUserId, message, 3, 0.65)
    expect(context).toContain("Jane Doe")
    expect(context).toContain("Staff Backend Engineer")
    expect(context).toContain("Relevant Facts:")
    expect(context).toContain("[achievement] Optimized Postgres queries reducing latency by 45%")
    expect(context).toContain("[preference] Prefers asynchronous remote work in Pacific timezone")
  })

  it("falls back to recent memories when no message is provided", async () => {
    vi.mocked(prisma.userMemory.findMany).mockResolvedValueOnce([
      {
        category: "general",
        content: "Completed AWS Solutions Architect Certification",
      },
    ] as any)

    const context = await buildFullContext(testUserId, "general")

    expect(searchUserMemories).not.toHaveBeenCalled()
    expect(context).toContain("Jane Doe")
    expect(context).toContain("[general] Completed AWS Solutions Architect Certification")
  })

  it("scrubs PII such as emails and phone numbers from assembled context", async () => {
    vi.mocked(searchUserMemories).mockResolvedValueOnce([
      {
        id: "mem-pii",
        category: "contact",
        content: "Reach out via recruiter.john@topcompany.com or phone 415-555-2671",
        similarity: 0.92,
        createdAt: new Date(),
      },
    ])

    const context = await buildFullContext(testUserId, "Review my contact info")

    expect(context).not.toContain("recruiter.john@topcompany.com")
    expect(context).toContain("r***@topcompany.com")
    expect(context).toContain("***-***-2671")
  })

  it("getCachedProfile fetches and caches user profile", async () => {
    const profile = await getCachedProfile(testUserId)
    expect(profile).toBeDefined()
    expect(profile?.location).toBe("San Francisco, CA")
  })
})
