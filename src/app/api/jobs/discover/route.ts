/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = "force-dynamic"

import { NextRequest } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import {
  executeSaveJobOpportunityToTracker,
  normalizeCompany,
  normalizeTitle,
} from "@/lib/ai/graph/tools/discovery-tools"
import {
  getNextBatchReleaseTime,
  getCurrentBatchStartTime,
  processUserJobBatch,
} from "@/inngest/functions/batch-job-pipeline"
import { inngest } from "@/inngest/client"
import { checkDistributedRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { ResponseUtil } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return ResponseUtil.unauthorized()
  }

  // Rate limit general discovery queries (45 req / min)
  const rateLimit = await checkDistributedRateLimit(`discovery:get:${userId}`, 45, 60)
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit)
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query")?.toLowerCase().trim() || ""
  const forceRefresh = searchParams.get("refresh") === "true"

  // Stricter rate limit on explicit manual refresh (5 refreshes / min)
  if (forceRefresh) {
    const refreshLimit = await checkDistributedRateLimit(`discovery:refresh:${userId}`, 5, 60)
    if (!refreshLimit.success) {
      return rateLimitResponse(refreshLimit)
    }
  }

  console.log(`[JobDiscovery API] GET called: userId=${userId}, query="${query}", forceRefresh=${forceRefresh}`)

  try {
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // 1. Cold-start check: If CanonicalJob catalog has 0 jobs, trigger background ingest and return non-blocking syncing state (<50ms)
    const canonicalCount = await withDbRetry(() =>
      prisma.canonicalJob.count({ where: { isExpired: false } })
    )

    if (canonicalCount === 0) {
      console.log(`[JobDiscovery API] Canonical catalog is empty. Dispatching background crawler...`)
      inngest.send({ name: "discovery/global-crawl.trigger" }).catch((err) => {
        console.warn("[JobDiscovery API] Failed to trigger background crawl:", err)
      })

      return ResponseUtil.success({
        count: 0,
        syncing: true,
        message: "জব ক্যাটালগ ব্যাকগ্রাউন্ডে সিঙ্ক হচ্ছে। অনুগ্রহ করে কিছু মুহূর্ত পর পুনরায় রিফ্রেশ করুন।",
        nextBatchAt: getNextBatchReleaseTime(now).toISOString(),
        currentBatchStartedAt: getCurrentBatchStartTime(now).toISOString(),
        batchSummary: { justIn: 0, earlierToday: 0, yesterday: 0, totalActive: 0 },
        opportunities: [],
      })
    }

    // If explicit forceRefresh is requested, seed immediately from local DB
    if (forceRefresh) {
      console.log(`[JobDiscovery API] Explicit forceRefresh requested for userId=${userId}. Processing fresh batch...`)
      await processUserJobBatch(userId, { forceImmediatePublish: true, notify: false })
    }

    // Query user's existing tracker applications to detect already-applied roles
    const userApplications = await withDbRetry(() =>
      prisma.application.findMany({
        where: { userId },
        select: { id: true, companyName: true, jobTitle: true, status: true },
      })
    )
    const appMap = new Map<string, { id: string; status: string }>()
    for (const app of userApplications) {
      const key = `${normalizeCompany(app.companyName)}:${normalizeTitle(app.jobTitle)}`
      appMap.set(key, { id: app.id, status: app.status })
    }

    // Query all published job matches within the 24-hour rolling window OR saved jobs directly (excluding DISMISSED)
    let rawMatches = await withDbRetry(() =>
      prisma.userJobMatch.findMany({
        where: {
          userId,
          status: { not: "DISMISSED" },
          OR: [
            {
              status: "PUBLISHED",
              publishedAt: { gte: twentyFourHoursAgo },
            },
            {
              isSaved: true,
            },
          ],
        },
        include: {
          job: true,
        },
        orderBy: [
          { publishedAt: "desc" },
          { fitScore: "desc" },
        ],
        take: 60,
      })
    )
    console.log(`[JobDiscovery API] Found ${rawMatches.length} active matches in rolling window for userId=${userId}`)

    // If user has zero active matches, seed their initial batch in-memory from CanonicalJob (<50ms, zero HTTP calls)
    if (rawMatches.length === 0 && !forceRefresh) {
      console.log(`[JobDiscovery API] 0 active matches for userId=${userId}. Triggering fast in-memory batch generation...`)
      await processUserJobBatch(userId, { forceImmediatePublish: true, notify: false })
      rawMatches = await withDbRetry(() =>
        prisma.userJobMatch.findMany({
          where: {
            userId,
            status: { not: "DISMISSED" },
            OR: [
              {
                status: "PUBLISHED",
                publishedAt: { gte: twentyFourHoursAgo },
              },
              {
                isSaved: true,
              },
            ],
          },
          include: {
            job: true,
          },
          orderBy: [
            { publishedAt: "desc" },
            { fitScore: "desc" },
          ],
          take: 60,
        })
      )
      console.log(`[JobDiscovery API] Post-scoring DB matches count: ${rawMatches.length} for userId=${userId}`)
    }

    // Transform matches into UI-ready opportunity format with batch age metadata
    const opportunities = rawMatches.map((match) => {
      const job = match.job
      const publishedAt = match.publishedAt || match.createdAt
      const ageHours = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60)

      let batchSlot: "just-in" | "earlier-today" | "yesterday" = "just-in"
      let batchLabel = "Just In (<6h)"

      if (ageHours > 12) {
        batchSlot = "yesterday"
        batchLabel = "12-24h Ago"
      } else if (ageHours > 6) {
        batchSlot = "earlier-today"
        batchLabel = "6-12h Ago"
      }

      const dedupKey = `${normalizeCompany(job.company)}:${normalizeTitle(job.title)}`
      const existingApp = appMap.get(dedupKey)

      return {
        id: match.id,
        jobId: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        url: job.url,
        sourceBoard: job.sourceBoard as any,
        tags: job.tags || [],
        salary: job.salary || undefined,
        fitScore: match.fitScore,
        matchRationale: match.matchRationale || "",
        descriptionSnippet: job.description || "",
        batchId: match.batchId,
        batchSlot,
        batchLabel,
        publishedAt: publishedAt.toISOString(),
        isSaved: match.isSaved,
        appliedStatus: existingApp?.status || null,
        applicationId: existingApp?.id || null,
      }
    })

    // Filter by search query if provided
    const filteredOpportunities = query
      ? opportunities.filter((job) => {
          const matchTarget = `${job.title} ${job.company} ${job.location} ${job.tags.join(" ")}`.toLowerCase()
          return matchTarget.includes(query)
        })
      : opportunities

    const nextBatchAt = getNextBatchReleaseTime(now).toISOString()
    const currentBatchStartedAt = getCurrentBatchStartTime(now).toISOString()

    const batchSummary = {
      justIn: opportunities.filter((j) => j.batchSlot === "just-in").length,
      earlierToday: opportunities.filter((j) => j.batchSlot === "earlier-today").length,
      yesterday: opportunities.filter((j) => j.batchSlot === "yesterday").length,
      totalActive: opportunities.length,
    }

    console.log(
      `[JobDiscovery API] Returning ${filteredOpportunities.length} opportunities for userId=${userId}. Slots:`,
      batchSummary
    )

    return ResponseUtil.success({
      count: filteredOpportunities.length,
      nextBatchAt,
      currentBatchStartedAt,
      batchSummary,
      opportunities: filteredOpportunities,
    })
  } catch (error: any) {
    console.error("[JobDiscovery API] GET Error:", error)
    return ResponseUtil.error(error?.message || "Internal server error", 500)
  }
}

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return ResponseUtil.unauthorized()
  }

  // Rate limit discovery mutations (30 actions / min per user)
  const rateLimit = await checkDistributedRateLimit(`discovery:post:${userId}`, 30, 60)
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit)
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { action } = body
    console.log(`[JobDiscovery API] POST action="${action}" for userId=${userId}`)

    if (action === "save") {
      const { jobId, companyName, jobTitle, jobUrl, location, salary, notes } = body
      if (!companyName || !jobTitle) {
        return ResponseUtil.badRequest("companyName and jobTitle are required")
      }

      // 1. Create tracker application record
      const saveResult = await executeSaveJobOpportunityToTracker(userId, {
        companyName,
        jobTitle,
        jobUrl,
        location,
        salary,
        notes,
      })

      if (!saveResult.success) {
        return ResponseUtil.error(saveResult.error || "Failed to save job", 500)
      }

      // 2. Mark UserJobMatch as isSaved: true (protected from rolling 24h archival)
      if (jobId) {
        await withDbRetry(() =>
          prisma.userJobMatch.updateMany({
            where: {
              userId,
              OR: [{ id: jobId }, { jobId: jobId }],
            },
            data: { isSaved: true },
          })
        ).catch((err) => console.warn("[UserJobMatch save mark error]:", err))
      } else {
        await withDbRetry(() =>
          prisma.userJobMatch.updateMany({
            where: {
              userId,
              job: { company: companyName, title: jobTitle },
            },
            data: { isSaved: true },
          })
        ).catch((err) => console.warn("[UserJobMatch save mark error]:", err))
      }

      return ResponseUtil.success(saveResult)
    }

    if (action === "refresh") {
      console.log(`[JobDiscovery API] Refresh batch triggered for userId=${userId}`)
      const result = await processUserJobBatch(userId, { forceImmediatePublish: true, notify: false })
      return ResponseUtil.success(result)
    }

    if (action === "dismiss") {
      const { jobId, companyName, jobTitle, dismissReason } = body
      if (jobId) {
        await withDbRetry(() =>
          prisma.userJobMatch.updateMany({
            where: {
              userId,
              OR: [{ id: jobId }, { jobId: jobId }],
            },
            data: {
              status: "DISMISSED",
              dismissReason: dismissReason || "user_hidden",
            },
          })
        )
      } else if (companyName && jobTitle) {
        await withDbRetry(() =>
          prisma.userJobMatch.updateMany({
            where: {
              userId,
              job: { company: companyName, title: jobTitle },
            },
            data: {
              status: "DISMISSED",
              dismissReason: dismissReason || "user_hidden",
            },
          })
        )
      }
      return ResponseUtil.success({ dismissed: true })
    }

    if (action === "undismiss") {
      const { jobId, companyName, jobTitle } = body
      if (jobId) {
        await withDbRetry(() =>
          prisma.userJobMatch.updateMany({
            where: {
              userId,
              OR: [{ id: jobId }, { jobId: jobId }],
            },
            data: {
              status: "PUBLISHED",
              dismissReason: null,
            },
          })
        )
      } else if (companyName && jobTitle) {
        await withDbRetry(() =>
          prisma.userJobMatch.updateMany({
            where: {
              userId,
              job: { company: companyName, title: jobTitle },
            },
            data: {
              status: "PUBLISHED",
              dismissReason: null,
            },
          })
        )
      }
      return ResponseUtil.success({ restored: true })
    }

    return ResponseUtil.badRequest("Invalid action")
  } catch (error: any) {
    console.error("[JobDiscovery API] POST Error:", error)
    return ResponseUtil.error(error?.message || "Internal server error", 500)
  }
}

