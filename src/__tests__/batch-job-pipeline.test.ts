/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getBatchId,
  getNextBatchReleaseTime,
  getCurrentBatchStartTime,
  processUserJobBatch,
} from "@/inngest/functions/batch-job-pipeline"
import { prisma } from "@/lib/prisma"
import * as discoveryTools from "@/lib/ai/graph/tools/discovery-tools"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    discoveredJob: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
  withDbRetry: vi.fn((fn: any) => fn()),
}))

describe("6-Hour Staged Batch Pipeline & 24h Rolling Window", () => {
  const testUserId = "user-batch-test-123"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("computes deterministic 6-hour batch IDs", () => {
    // 04:30 UTC belongs to the 00:00 UTC batch
    const date1 = new Date(Date.UTC(2026, 8, 3, 4, 30, 0))
    expect(getBatchId(date1)).toBe("batch-2026-09-03T00:00:00.000Z")

    // 08:15 UTC belongs to the 06:00 UTC batch
    const date2 = new Date(Date.UTC(2026, 8, 3, 8, 15, 0))
    expect(getBatchId(date2)).toBe("batch-2026-09-03T06:00:00.000Z")

    // 13:00 UTC belongs to the 12:00 UTC batch
    const date3 = new Date(Date.UTC(2026, 8, 3, 13, 0, 0))
    expect(getBatchId(date3)).toBe("batch-2026-09-03T12:00:00.000Z")

    // 21:45 UTC belongs to the 18:00 UTC batch
    const date4 = new Date(Date.UTC(2026, 8, 3, 21, 45, 0))
    expect(getBatchId(date4)).toBe("batch-2026-09-03T18:00:00.000Z")
  })

  it("calculates next 6-hour batch release boundary", () => {
    const date = new Date(Date.UTC(2026, 8, 3, 7, 20, 0)) // 07:20 UTC -> next is 12:00 UTC
    const next = getNextBatchReleaseTime(date)
    expect(next.toISOString()).toBe("2026-09-03T12:00:00.000Z")
  })

  it("calculates current 6-hour batch start boundary", () => {
    const date = new Date(Date.UTC(2026, 8, 3, 7, 20, 0)) // 07:20 UTC -> start was 06:00 UTC
    const start = getCurrentBatchStartTime(date)
    expect(start.toISOString()).toBe("2026-09-03T06:00:00.000Z")
  })

  it("executes the 4-stage pipeline: staging, rolling 24h archival, publish switch, and notification", async () => {
    vi.spyOn(discoveryTools, "executeSearchExternalJobs").mockResolvedValue({
      success: true,
      count: 2,
      query: "dev",
      opportunities: [
        {
          id: "job-1",
          title: "Senior Fullstack Engineer",
          company: "Vercel",
          location: "Remote",
          url: "https://vercel.com/jobs/1",
          sourceBoard: "curated",
          tags: ["nextjs", "react", "typescript"],
          fitScore: 92,
          matchRationale: "Great match",
          descriptionSnippet: "Full stack role",
        },
      ],
    })

    vi.mocked(prisma.discoveredJob.findMany).mockResolvedValue([])
    vi.mocked(prisma.discoveredJob.createMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.discoveredJob.updateMany)
      .mockResolvedValueOnce({ count: 3 }) // Step 2: archive count
      .mockResolvedValueOnce({ count: 1 }) // Step 3: publish switch count
    vi.mocked(prisma.notification.create).mockResolvedValue({ id: "notif-1" } as any)

    const result = await processUserJobBatch(testUserId, {
      batchId: "batch-2026-09-03T06:00:00.000Z",
      notify: true,
    })

    expect(result.stagedCount).toBe(1)
    expect(result.publishedCount).toBe(1)
    expect(result.archivedCount).toBe(3)

    // Verify rolling 24h archival call
    expect(prisma.discoveredJob.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          userId: testUserId,
          status: "PUBLISHED",
          isSaved: false,
          publishedAt: expect.any(Object),
        }),
        data: { status: "ARCHIVED" },
      })
    )

    // Verify publishing switch call
    expect(prisma.discoveredJob.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          userId: testUserId,
          batchId: "batch-2026-09-03T06:00:00.000Z",
          status: "STAGED",
        }),
        data: expect.objectContaining({
          status: "PUBLISHED",
          publishedAt: expect.any(Date),
        }),
      })
    )

    // Verify in-app notification call
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: testUserId,
          title: expect.stringContaining("নতুন কিউরেটেড জবের ব্যাচ"),
          link: "/discovery",
        }),
      })
    )
  })
})
