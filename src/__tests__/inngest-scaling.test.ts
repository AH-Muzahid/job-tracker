/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { dailyJobHuntScheduler, processUserAuditBatch } from "@/inngest/functions/daily-job-hunt"
import { weeklyMemoryHygiene } from "@/inngest/functions/memory-decay-digest"
import { consolidateUserMemories } from "@/lib/ai/memory-consolidator"
import { prisma } from "@/lib/prisma"
import * as headless from "@/lib/ai/graph/headless"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    application: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    userMemory: {
      findMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
  },
  withDbRetry: vi.fn((fn) => fn()),
}))

describe("Inngest Batch Fan-Out & Scalability Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("chunks 125 active users into 3 batch event dispatches", async () => {
    // Generate 125 mock user IDs
    const mockUsers = Array.from({ length: 125 }, (_, i) => ({ id: `user-${i + 1}` }))
    vi.mocked(prisma.user.findMany).mockResolvedValueOnce(mockUsers as any)

    const sentEvents: any[] = []
    const mockStep = {
      run: vi.fn(async (_name: string, fn: () => any) => fn()),
      sendEvent: vi.fn(async (stepId: string, eventObj: any) => {
        sentEvents.push({ stepId, eventObj })
      }),
    }

    const handler = (dailyJobHuntScheduler as any)["fn"]
    const result = await handler({ step: mockStep, event: {} })

    expect(result.totalBatches).toBe(3)
    expect(result.totalUsers).toBe(125)
    expect(sentEvents).toHaveLength(3)

    expect(sentEvents[0].eventObj.name).toBe("career/batch.audit.process")
    expect(sentEvents[0].eventObj.data.userIds).toHaveLength(50)
    expect(sentEvents[1].eventObj.data.userIds).toHaveLength(50)
    expect(sentEvents[2].eventObj.data.userIds).toHaveLength(25)
  })

  it("processes user audit batch, runs headless evaluation, and creates follow-up notifications", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: "user-batch-1",
      name: "Sam Altman",
      email: "sam@example.com",
    } as any)

    vi.mocked(prisma.application.count).mockResolvedValueOnce(3)
    vi.mocked(prisma.application.findMany).mockResolvedValueOnce([
      {
        id: "app-stale-1",
        jobTitle: "Staff Systems Engineer",
        companyName: "Stripe",
        company: { name: "Stripe" },
        status: "Applied",
        updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    ] as any)

    vi.spyOn(headless, "runHeadlessEvaluation").mockResolvedValueOnce({
      success: true,
      content: "Send a polite follow-up email to the Stripe recruiter regarding your Staff Systems application.",
      plan: [],
    })

    const mockStep = {
      run: vi.fn(async (_name: string, fn: () => any) => fn()),
    }

    const handler = (processUserAuditBatch as any)["fn"]
    const result = await handler({
      event: { data: { userIds: ["user-batch-1"] } },
      step: mockStep,
    })

    expect(result.processed).toBe(1)
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-batch-1",
          type: "FOLLOW_UP",
          title: expect.stringContaining("Follow-up"),
          message: expect.stringContaining("Stripe recruiter"),
        }),
      })
    )
  })

  it("executes weekly memory hygiene by pruning stale items and consolidating duplicates", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValueOnce([
      { id: "user-hygiene-1" },
      { id: "user-hygiene-2" },
    ] as any)

    // Mock memories for user 1 & 2
    vi.mocked(prisma.userMemory.findMany).mockResolvedValue([
      {
        id: "mem-stale-1",
        confidence: 0.1,
        accessCount: 0,
        createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
        lastAccessedAt: null,
      },
    ] as any)

    const mockStep = {
      run: vi.fn(async (_name: string, fn: () => any) => fn()),
    }

    const handler = (weeklyMemoryHygiene as any)["fn"]
    const result = await handler({ step: mockStep })

    expect(result.status).toBe("completed")
    expect(result.usersProcessed).toBe(2)
  })

  it("consolidates duplicate user memories in database", async () => {
    vi.mocked(prisma.userMemory.findMany).mockResolvedValueOnce([
      { id: "mem-a", content: "Prefers remote Golang and React roles", category: "preference" },
      { id: "mem-b", content: "Prefers remote Golang and React jobs", category: "preference" },
    ] as any)

    const mergedCount = await consolidateUserMemories("user-test-dedup")

    expect(mergedCount).toBe(1)
    expect(prisma.userMemory.delete).toHaveBeenCalledWith({ where: { id: "mem-b" } })
    expect(prisma.userMemory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "mem-a" },
        data: expect.objectContaining({ accessCount: { increment: 1 } }),
      })
    )
  })
})
