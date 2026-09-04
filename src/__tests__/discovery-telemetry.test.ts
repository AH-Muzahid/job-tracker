/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  logDiscoveryEvent,
  getDiscoveryFunnelMetrics,
} from "@/lib/discovery/telemetry"
import { prisma } from "@/lib/prisma"

describe("Discovery Telemetry & Funnel Observability Engine", () => {
  const testUserId = "user-telemetry-test-123"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("logs discovery event in background without blocking or throwing", async () => {
    const createSpy = vi.spyOn((prisma as any).discoveryEvent, "create").mockResolvedValueOnce({
      id: "event-1",
      userId: testUserId,
      eventType: "FEED_VIEWED",
      createdAt: new Date(),
    })

    logDiscoveryEvent({
      userId: testUserId,
      eventType: "FEED_VIEWED",
      metadata: { count: 12 },
    })

    // Wait a tick for detached async execution
    await new Promise((r) => setTimeout(r, 20))

    expect(createSpy).toHaveBeenCalledWith({
      data: {
        userId: testUserId,
        eventType: "FEED_VIEWED",
        jobId: null,
        metadata: { count: 12 },
      },
    })
  })

  it("handles db error silently during logDiscoveryEvent without throwing", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn((prisma as any).discoveryEvent, "create").mockRejectedValueOnce(
      new Error("DB connection timeout")
    )

    expect(() => {
      logDiscoveryEvent({
        userId: testUserId,
        eventType: "JOB_SAVED",
        jobId: "job-1",
      })
    }).not.toThrow()

    await new Promise((r) => setTimeout(r, 20))
    expect(consoleWarnSpy).toHaveBeenCalled()
  })

  it("aggregates discovery events into accurate funnel conversion metrics", async () => {
    const mockEvents = [
      { eventType: "FEED_VIEWED", metadata: null },
      { eventType: "FEED_VIEWED", metadata: null },
      { eventType: "FEED_VIEWED", metadata: null },
      { eventType: "FEED_VIEWED", metadata: null },
      { eventType: "BATCH_PUBLISHED", metadata: { batchId: "batch-1" } },
      { eventType: "JOB_SAVED", metadata: { companyName: "Stripe" } },
      { eventType: "JOB_SAVED", metadata: { companyName: "bKash" } },
      { eventType: "JOB_DISMISSED", metadata: { dismissReason: "geo_mismatch" } },
      { eventType: "JOB_DISMISSED", metadata: { dismissReason: "geo_mismatch" } },
      { eventType: "JOB_DISMISSED", metadata: { dismissReason: "bad_salary" } },
      { eventType: "JOB_CLICK_EXTERNAL", metadata: { clickType: "external_link" } },
      { eventType: "JOB_APPLIED", metadata: { clickType: "apply" } },
    ]

    vi.spyOn((prisma as any).discoveryEvent, "findMany").mockResolvedValueOnce(mockEvents)

    const metrics = await getDiscoveryFunnelMetrics(testUserId, 30)

    expect(metrics.feedViews).toBe(4)
    expect(metrics.batchesPublished).toBe(1)
    expect(metrics.jobsSaved).toBe(2)
    expect(metrics.jobsDismissed).toBe(3)
    expect(metrics.externalClicks).toBe(1)
    expect(metrics.jobsApplied).toBe(1)

    // Save Conversion Rate: 2 saves / 4 feedViews = 50%
    expect(metrics.saveConversionRate).toBe(50)

    // Total high intent: 2 saves + 1 external click = 3
    // Apply Conversion Rate: 1 applied / 3 total intent = 33.3%
    expect(metrics.applyConversionRate).toBe(33.3)

    // Dismissal Rate: 3 dismissals / 4 feedViews = 75%
    expect(metrics.dismissalRate).toBe(75)

    // Top Dismiss Reasons breakdown
    expect(metrics.topDismissReasons).toEqual({
      geo_mismatch: 2,
      bad_salary: 1,
    })
  })
})
