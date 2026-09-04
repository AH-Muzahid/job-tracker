/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma"

export type DiscoveryEventType =
  | "BATCH_PUBLISHED"
  | "FEED_VIEWED"
  | "JOB_SAVED"
  | "JOB_DISMISSED"
  | "JOB_UNDISMISSED"
  | "JOB_APPLIED"
  | "JOB_CLICK_EXTERNAL"
  | "FEED_REFRESHED"

export interface LogEventParams {
  userId: string
  eventType: DiscoveryEventType
  jobId?: string
  metadata?: Record<string, any>
}

/**
 * Non-blocking, fire-and-forget telemetry logger for job discovery interactions.
 * Never awaits inside request handlers; catches and logs failures gracefully so
 * the primary user request latency is never impacted.
 */
export function logDiscoveryEvent(params: LogEventParams): void {
  // Execute completely detached in the background
  void (async () => {
    try {
      await prisma.discoveryEvent.create({
        data: {
          userId: params.userId,
          eventType: params.eventType,
          jobId: params.jobId || null,
          metadata: params.metadata || undefined,
        },
      })
    } catch (err) {
      // Telemetry must never crash or bubble up errors
      console.warn(`[Telemetry] Failed to log ${params.eventType} for user ${params.userId}:`, err)
    }
  })()
}

export interface FunnelMetrics {
  feedViews: number
  batchesPublished: number
  jobsSaved: number
  jobsDismissed: number
  jobsApplied: number
  externalClicks: number
  saveConversionRate: number // Percentage (0 - 100)
  applyConversionRate: number // Percentage (0 - 100)
  dismissalRate: number // Percentage (0 - 100)
  topDismissReasons: Record<string, number>
}

/**
 * Computes end-to-end conversion funnel metrics across user discovery interactions
 */
export async function getDiscoveryFunnelMetrics(
  userId?: string,
  sinceDays: number = 30
): Promise<FunnelMetrics> {
  const sinceDate = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000)

  const whereClause: any = {
    createdAt: { gte: sinceDate },
  }
  if (userId) {
    whereClause.userId = userId
  }

  const events = await prisma.discoveryEvent.findMany({
    where: whereClause,
    select: {
      eventType: true,
      metadata: true,
    },
  })

  let feedViews = 0
  let batchesPublished = 0
  let jobsSaved = 0
  let jobsDismissed = 0
  let jobsApplied = 0
  let externalClicks = 0
  const topDismissReasons: Record<string, number> = {}

  for (const event of events) {
    switch (event.eventType) {
      case "FEED_VIEWED":
        feedViews++
        break
      case "BATCH_PUBLISHED":
        batchesPublished++
        break
      case "JOB_SAVED":
        jobsSaved++
        break
      case "JOB_DISMISSED": {
        jobsDismissed++
        const meta = event.metadata as Record<string, any> | null
        const reason = meta?.dismissReason || "unspecified"
        topDismissReasons[reason] = (topDismissReasons[reason] || 0) + 1
        break
      }
      case "JOB_APPLIED":
        jobsApplied++
        break
      case "JOB_CLICK_EXTERNAL":
        externalClicks++
        break
    }
  }

  // Calculate conversion rates
  // Save rate: percentage of feed views resulting in a job saved to the tracker
  const saveConversionRate = feedViews > 0
    ? Math.round((jobsSaved / feedViews) * 1000) / 10
    : 0

  // Apply rate: percentage of high-intent actions (saved or clicked external) that reached applied status
  const totalIntent = jobsSaved + externalClicks
  const applyConversionRate = totalIntent > 0
    ? Math.round((jobsApplied / totalIntent) * 1000) / 10
    : 0

  const dismissalRate = feedViews > 0
    ? Math.round((jobsDismissed / feedViews) * 1000) / 10
    : 0

  return {
    feedViews,
    batchesPublished,
    jobsSaved,
    jobsDismissed,
    jobsApplied,
    externalClicks,
    saveConversionRate,
    applyConversionRate,
    dismissalRate,
    topDismissReasons,
  }
}
