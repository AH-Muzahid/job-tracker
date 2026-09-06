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
    canonicalJob: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    },
    userJobMatch: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    discoveryEvent: {
      create: vi.fn().mockResolvedValue({ id: "evt-1" }),
      findMany: vi.fn().mockResolvedValue([]),
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

    vi.mocked(prisma.canonicalJob.findMany).mockResolvedValue([{ id: "job-1" }] as any)
    vi.mocked(prisma.userJobMatch.findMany).mockResolvedValue([])
    vi.mocked(prisma.userJobMatch.createMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.userJobMatch.updateMany)
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
    expect(prisma.userJobMatch.updateMany).toHaveBeenNthCalledWith(
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
    expect(prisma.userJobMatch.updateMany).toHaveBeenNthCalledWith(
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

  it("revives previously ARCHIVED jobs back to STAGED/PUBLISHED instead of silently dropping", async () => {
    vi.spyOn(discoveryTools, "executeSearchExternalJobs").mockResolvedValue({
      success: true,
      count: 2,
      query: "dev",
      opportunities: [
        {
          id: "job-new-1",
          title: "Frontend Engineer",
          company: "Acme",
          location: "Remote",
          url: "https://acme.com/jobs/1",
          sourceBoard: "curated",
          tags: ["react"],
          fitScore: 88,
          matchRationale: "Solid React match",
          descriptionSnippet: "Build modern web apps",
        },
        {
          id: "job-archived-1",
          title: "Backend Engineer",
          company: "Beta",
          location: "Remote",
          url: "https://beta.com/jobs/2",
          sourceBoard: "curated",
          tags: ["node"],
          fitScore: 85,
          matchRationale: "Solid Node match",
          descriptionSnippet: "Design resilient APIs",
        },
      ],
    })

    vi.mocked(prisma.canonicalJob.findMany).mockResolvedValue([
      { id: "job-new-1" },
      { id: "job-archived-1" },
    ] as any)

    // Existing matches has job-archived-1 in ARCHIVED status
    vi.mocked(prisma.userJobMatch.findMany).mockResolvedValue([
      { jobId: "job-archived-1", status: "ARCHIVED" },
    ] as any)

    vi.mocked(prisma.userJobMatch.createMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.userJobMatch.update).mockResolvedValue({ id: "match-archived-1" } as any)
    vi.mocked(prisma.userJobMatch.updateMany)
      .mockResolvedValueOnce({ count: 0 }) // Step 2: archive count
      .mockResolvedValueOnce({ count: 2 }) // Step 3: publish switch count (both new and revived)

    const result = await processUserJobBatch(testUserId, {
      batchId: "batch-2026-09-03T12:00:00.000Z",
      notify: false,
    })

    // Both new and revived are counted in staged
    expect(result.stagedCount).toBe(2)

    // New job is inserted with createMany
    expect(prisma.userJobMatch.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            jobId: "job-new-1",
            status: "STAGED",
          }),
        ],
      })
    )

    // Archived job is updated back to STAGED with reset publishedAt
    expect(prisma.userJobMatch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_jobId: { userId: testUserId, jobId: "job-archived-1" },
        },
        data: expect.objectContaining({
          status: "STAGED",
          batchId: "batch-2026-09-03T12:00:00.000Z",
          publishedAt: null,
          dismissReason: null,
        }),
      })
    )
  })
})
