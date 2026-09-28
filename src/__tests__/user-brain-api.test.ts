/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/auth", () => ({
  getInternalUserId: vi.fn(),
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
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    careerKnowledgeGraph: {
      findUnique: vi.fn(),
    },
  },
  withDbRetry: vi.fn((cb) => cb()),
}))

vi.mock("@/lib/redis", () => ({
  invalidateCache: vi.fn().mockResolvedValue(undefined),
  getCachedJson: vi.fn().mockResolvedValue(null),
  setCachedJson: vi.fn().mockResolvedValue(undefined),
}))

import { getInternalUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { GET, POST, DELETE } from "@/app/api/user/brain/route"

describe("Career Brain Ground Truth Dossier API (CAG-13)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when unauthorized", async () => {
    ;(getInternalUserId as any).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("aggregates profile, memories, and knowledge graph into structured dossier", async () => {
    ;(getInternalUserId as any).mockResolvedValue("user-123")
    ;(prisma.user.findUnique as any).mockResolvedValue({
      name: "Jane Developer",
      profile: {
        targetRoles: ["Senior Full Stack Engineer"],
        strengths: "TypeScript, React, Node.js, PostgreSQL",
        bestProjects: [
          { name: "Distributed Task Queue", stack: "Node.js, Redis", description: "High-volume job runner" },
        ],
        salaryExpectation: "$160,000",
        location: "Remote",
      },
    })
    ;(prisma.userMemory.findMany as any).mockResolvedValue([
      {
        id: "mem-1",
        userId: "user-123",
        category: "constraint",
        content: "Minimum base salary $160,000",
        createdAt: new Date("2026-09-20"),
        updatedAt: new Date("2026-09-20"),
      },
      {
        id: "mem-2",
        userId: "user-123",
        category: "experience",
        content: "Scaled Redis caching reducing p99 latency to 15ms",
        source: "resume",
        createdAt: new Date("2026-09-21"),
        updatedAt: new Date("2026-09-21"),
      },
      {
        id: "mem-3",
        userId: "user-123",
        category: "weakness",
        content: "[Weakness: System Design]: Needs deeper discussion of CAP theorem",
        confidence: 0.8,
        createdAt: new Date("2026-09-22"),
        updatedAt: new Date("2026-09-22"),
      },
      {
        id: "mem-4",
        userId: "user-123",
        category: "resolved_weakness",
        content: "[Weakness: Concurrency]: Resolved with score 88%",
        createdAt: new Date("2026-09-23"),
        updatedAt: new Date("2026-09-23"),
      },
    ])
    ;(prisma.careerKnowledgeGraph.findUnique as any).mockResolvedValue({
      nodes: [
        { id: "node-1", label: "TypeScript", type: "skill", weight: 95 },
        { id: "node-2", label: "PostgreSQL", type: "skill", weight: 90 },
      ],
      edges: [{ source: "node-1", target: "node-2", label: "used_in" }],
      summary: "Full stack engineer specializing in TypeScript and relational databases.",
    })

    const res = await GET()
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.profile.fullName).toBe("Jane Developer")
    expect(data.profile.strengths).toContain("TypeScript")
    expect(data.nonNegotiables).toHaveLength(1)
    expect(data.nonNegotiables[0].content).toContain("Minimum base salary $160,000")
    expect(data.verifiedMetrics).toHaveLength(1)
    expect(data.verifiedMetrics[0].content).toContain("Scaled Redis caching")
    expect(data.interviewGaps.active).toHaveLength(1)
    expect(data.interviewGaps.resolved).toHaveLength(1)
    expect(data.knowledgeGraph.nodesCount).toBe(2)
    expect(data.knowledgeGraph.edgesCount).toBe(1)
  })

  it("POST creates a new memory item with tenant isolation", async () => {
    ;(getInternalUserId as any).mockResolvedValue("user-123")
    ;(prisma.userMemory.create as any).mockResolvedValue({
      id: "mem-new-1",
      userId: "user-123",
      category: "constraint",
      content: "Strictly remote positions only",
    })

    const req = new NextRequest("http://localhost/api/user/brain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "constraint",
        content: "Strictly remote positions only",
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(prisma.userMemory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-123",
          category: "constraint",
          content: "Strictly remote positions only",
          source: "user_brain_dossier",
        }),
      })
    )
  })

  it("DELETE removes memory item verifying user ownership", async () => {
    ;(getInternalUserId as any).mockResolvedValue("user-123")
    const testId = "11111111-1111-4111-8111-111111111111"
    ;(prisma.userMemory.findFirst as any).mockResolvedValue({
      id: testId,
      userId: "user-123",
    })
    ;(prisma.userMemory.delete as any).mockResolvedValue({ id: testId })

    const req = new NextRequest(`http://localhost/api/user/brain?id=${testId}`, {
      method: "DELETE",
    })

    const res = await DELETE(req)
    expect(res.status).toBe(200)
    expect(prisma.userMemory.delete).toHaveBeenCalledWith({
      where: { id: testId },
    })
  })
})
