import { inngest } from "../client"
import { prisma, withDbRetry } from "@/lib/prisma"
import { executeSearchExternalJobs } from "@/lib/ai/graph/tools/discovery-tools"

/**
 * Generates a deterministic batch ID for the 6-hour interval
 * 6-hour intervals in UTC: 00:00, 06:00, 12:00, 18:00
 */
export function getBatchId(date: Date = new Date()): string {
  const hour = Math.floor(date.getUTCHours() / 6) * 6
  const batchDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour, 0, 0, 0))
  return `batch-${batchDate.toISOString()}`
}

/**
 * Calculates the exact timestamp of the next upcoming 6-hour batch release
 */
export function getNextBatchReleaseTime(date: Date = new Date()): Date {
  const currentIntervalHour = Math.floor(date.getUTCHours() / 6) * 6
  const nextDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), currentIntervalHour + 6, 0, 0, 0))
  return nextDate
}

/**
 * Calculates the exact start timestamp of the current 6-hour batch release
 */
export function getCurrentBatchStartTime(date: Date = new Date()): Date {
  const currentIntervalHour = Math.floor(date.getUTCHours() / 6) * 6
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), currentIntervalHour, 0, 0, 0))
}

/**
 * Core processor for a single user:
 * 1. Crawls & scores external opportunities (STAGED)
 * 2. Archives jobs older than 24h where isSaved == false (Rolling 24h Archival)
 * 3. Switches current batch from STAGED -> PUBLISHED
 * 4. Dispatches in-app notification to the user
 */
export async function processUserJobBatch(
  userId: string,
  options: {
    batchId?: string
    forceImmediatePublish?: boolean
    notify?: boolean
  } = {}
) {
  const now = new Date()
  const batchId = options.batchId || getBatchId(now)
  const shouldNotify = options.notify !== false

  // 1. Fetch & score jobs against user resume/profile
  const searchResult = await executeSearchExternalJobs(userId, { limit: 16 })
  const opportunities = searchResult.opportunities || []

  let stagedCount = 0

  // 2. Stage new jobs using single bulk lookup & createMany (P0 optimization: N+1 elimination)
  if (opportunities.length > 0) {
    const existingJobs =
      (await withDbRetry(() =>
        prisma.discoveredJob.findMany({
          where: {
            userId,
            batchId,
          },
          select: {
            title: true,
            company: true,
          },
        })
      )) || []

    const existingKeySet = new Set(
      existingJobs.map((j) => `${j.title.toLowerCase()}|${j.company.toLowerCase()}`)
    )

    const newJobsToInsert = opportunities.filter(
      (opp) => !existingKeySet.has(`${opp.title.toLowerCase()}|${opp.company.toLowerCase()}`)
    )

    if (newJobsToInsert.length > 0) {
      await withDbRetry(() =>
        prisma.discoveredJob.createMany({
          data: newJobsToInsert.map((opp) => ({
            userId,
            sourceBoard: opp.sourceBoard,
            externalId: opp.id,
            title: opp.title,
            company: opp.company,
            location: opp.location,
            url: opp.url,
            salary: opp.salary,
            tags: opp.tags || [],
            description: opp.descriptionSnippet,
            fitScore: opp.fitScore,
            matchRationale: opp.matchRationale,
            status: options.forceImmediatePublish ? "PUBLISHED" : "STAGED",
            batchId,
            isSaved: false,
            publishedAt: options.forceImmediatePublish ? now : null,
          })),
        })
      )
      stagedCount = newJobsToInsert.length
    }
  }

  // 3. Step B: Rolling 24-Hour Archival Rule
  // If publishedAt is older than 24 hours AND isSaved is false -> transition to ARCHIVED
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const archiveResult = await withDbRetry(() =>
    prisma.discoveredJob.updateMany({
      where: {
        userId,
        status: "PUBLISHED",
        isSaved: false,
        publishedAt: {
          lt: twentyFourHoursAgo,
        },
      },
      data: {
        status: "ARCHIVED",
      },
    })
  )

  // 4. Step C: The Publishing Switch
  // Transition all STAGED jobs for this batchId into PUBLISHED
  const publishResult = await withDbRetry(() =>
    prisma.discoveredJob.updateMany({
      where: {
        userId,
        batchId,
        status: "STAGED",
      },
      data: {
        status: "PUBLISHED",
        publishedAt: now,
      },
    })
  )

  // 5. In-App Notification Dispatch
  if (shouldNotify && (publishResult.count > 0 || options.forceImmediatePublish)) {
    await withDbRetry(() =>
      prisma.notification.create({
        data: {
          userId,
          title: "নতুন কিউরেটেড জবের ব্যাচ উন্মুক্ত হয়েছে!",
          message:
            "আপনার প্রোফাইল ও দক্ষতার ভিত্তিতে পরবর্তী ৬ ঘণ্টার জন্য কিউরেটেড জবের নতুন ব্যাচ প্রস্তুত করা হয়েছে। এখনই ডিসকভারি হাব এক্সপ্লোর করুন।",
          type: "DAILY_HUNT",
          link: "/discovery",
        },
      })
    ).catch((err) => console.warn("[Batch Job Notification Error]:", err))
  }

  return {
    userId,
    batchId,
    stagedCount: stagedCount || opportunities.length,
    publishedCount: publishResult.count,
    archivedCount: archiveResult.count,
  }
}

/**
 * 6-Hour Master Fan-out Dispatcher (Cron: 00:00, 06:00, 12:00, 18:00 UTC)
 */
export const batchJobReleaseScheduler = inngest.createFunction(
  {
    id: "batch-job-release-scheduler",
    name: "6-Hour Staged Job Release Scheduler",
    triggers: [
      { cron: "0 */6 * * *" }, // Run every 6 hours on the hour (00:00, 06:00, 12:00, 18:00 UTC)
      { event: "app/job-batch.trigger" },
    ],
  },
  async ({ step, event }) => {
    const batchId = getBatchId(new Date())

    const userBatches = await step.run("fetch-target-users", async () => {
      const targetUserId =
        event?.data && "userId" in event.data ? (event.data as { userId?: string }).userId : undefined

      if (targetUserId) {
        return [{ userIds: [targetUserId] }]
      }

      const users = await withDbRetry(() =>
        prisma.user.findMany({
          where: {
            OR: [
              { applications: { some: {} } },
              { profile: { isNot: null } },
              { resumes: { some: {} } },
            ],
          },
          select: { id: true },
        })
      )

      const batchSize = 50
      const batches: Array<{ userIds: string[] }> = []
      for (let i = 0; i < users.length; i += batchSize) {
        batches.push({ userIds: users.slice(i, i + batchSize).map((u) => u.id) })
      }
      return batches
    })

    for (let i = 0; i < userBatches.length; i++) {
      await step.sendEvent(`fanout-job-batch-${i}`, {
        name: "career/job-batch.process",
        data: { userIds: userBatches[i].userIds, batchId },
      })
    }

    return {
      batchId,
      totalBatches: userBatches.length,
      totalUsers: userBatches.reduce((acc, b) => acc + b.userIds.length, 0),
    }
  }
)

/**
 * Parallel Worker for Processing 6-Hour User Batches
 */
export const processUserJobBatchWorker = inngest.createFunction(
  {
    id: "process-user-job-batch-worker",
    name: "Process User Job Batch Worker",
    triggers: [{ event: "career/job-batch.process" }],
  },
  async ({ event, step }) => {
    const { userIds, batchId } = event.data as { userIds: string[]; batchId: string }
    if (!userIds || !Array.isArray(userIds)) {
      return { processed: 0, skipped: true }
    }

    const results = []
    for (const userId of userIds) {
      const res = await step.run(`process-user-${userId}`, async () => {
        return await processUserJobBatch(userId, { batchId })
      })
      results.push(res)
    }

    return { processed: results.length, results }
  }
)
