/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
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
import { ResponseUtil } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json(ResponseUtil.error("Unauthorized", 401), { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query")?.toLowerCase().trim() || ""
  const forceRefresh = searchParams.get("refresh") === "true"

  try {
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // If explicit forceRefresh is requested, seed immediately
    if (forceRefresh) {
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

    // Query all published jobs within the 24-hour rolling window OR saved jobs directly (excluding DISMISSED)
    let rawJobs = await withDbRetry(() =>
      prisma.discoveredJob.findMany({
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
        orderBy: [
          { publishedAt: "desc" },
          { fitScore: "desc" },
        ],
        take: 60,
      })
    )

    // If user has zero active jobs, seed their initial batch (cold-start recovery)
    if (rawJobs.length === 0 && !forceRefresh) {
      await processUserJobBatch(userId, { forceImmediatePublish: true, notify: false })
      rawJobs = await withDbRetry(() =>
        prisma.discoveredJob.findMany({
          where: {
            userId,
            status: "PUBLISHED",
            publishedAt: { gte: twentyFourHoursAgo },
          },
          orderBy: [
            { publishedAt: "desc" },
            { fitScore: "desc" },
          ],
          take: 60,
        })
      )
    }

    // Transform jobs into UI-ready opportunity format with batch age metadata
    const opportunities = rawJobs.map((job) => {
      const publishedAt = job.publishedAt || job.createdAt
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
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        url: job.url,
        sourceBoard: job.sourceBoard as any,
        tags: job.tags || [],
        salary: job.salary || undefined,
        fitScore: job.fitScore,
        matchRationale: job.matchRationale || "",
        descriptionSnippet: job.description || "",
        batchId: job.batchId,
        batchSlot,
        batchLabel,
        publishedAt: publishedAt.toISOString(),
        isSaved: job.isSaved,
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

    return NextResponse.json(
      ResponseUtil.success({
        count: filteredOpportunities.length,
        nextBatchAt,
        currentBatchStartedAt,
        batchSummary,
        opportunities: filteredOpportunities,
      })
    )
  } catch (error: any) {
    return NextResponse.json(ResponseUtil.error(error?.message || "Internal server error"), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json(ResponseUtil.error("Unauthorized", 401), { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { action } = body

    if (action === "save") {
      const { jobId, companyName, jobTitle, jobUrl, location, salary, notes } = body
      if (!companyName || !jobTitle) {
        return NextResponse.json(ResponseUtil.error("companyName and jobTitle are required"), { status: 400 })
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
        return NextResponse.json(ResponseUtil.error(saveResult.error || "Failed to save job"), { status: 500 })
      }

      // 2. Mark DiscoveredJob as isSaved: true (protected from rolling 24h archival)
      if (jobId) {
        await withDbRetry(() =>
          prisma.discoveredJob.updateMany({
            where: {
              id: jobId,
              userId,
            },
            data: { isSaved: true },
          })
        ).catch((err) => console.warn("[DiscoveredJob save mark error]:", err))
      } else {
        await withDbRetry(() =>
          prisma.discoveredJob.updateMany({
            where: {
              userId,
              company: companyName,
              title: jobTitle,
            },
            data: { isSaved: true },
          })
        ).catch((err) => console.warn("[DiscoveredJob save mark error]:", err))
      }

      return NextResponse.json(ResponseUtil.success(saveResult))
    }

    if (action === "refresh") {
      const result = await processUserJobBatch(userId, { forceImmediatePublish: true, notify: false })
      return NextResponse.json(ResponseUtil.success(result))
    }

    if (action === "dismiss") {
      const { jobId, companyName, jobTitle } = body
      if (jobId) {
        await withDbRetry(() =>
          prisma.discoveredJob.updateMany({
            where: { id: jobId, userId },
            data: { status: "DISMISSED" },
          })
        )
      } else if (companyName && jobTitle) {
        await withDbRetry(() =>
          prisma.discoveredJob.updateMany({
            where: { userId, company: companyName, title: jobTitle },
            data: { status: "DISMISSED" },
          })
        )
      }
      return NextResponse.json(ResponseUtil.success({ dismissed: true }))
    }

    if (action === "undismiss") {
      const { jobId, companyName, jobTitle } = body
      if (jobId) {
        await withDbRetry(() =>
          prisma.discoveredJob.updateMany({
            where: { id: jobId, userId },
            data: { status: "PUBLISHED" },
          })
        )
      } else if (companyName && jobTitle) {
        await withDbRetry(() =>
          prisma.discoveredJob.updateMany({
            where: { userId, company: companyName, title: jobTitle },
            data: { status: "PUBLISHED" },
          })
        )
      }
      return NextResponse.json(ResponseUtil.success({ restored: true }))
    }

    return NextResponse.json(ResponseUtil.error("Invalid action", 400), { status: 400 })
  } catch (error: any) {
    return NextResponse.json(ResponseUtil.error(error?.message || "Internal server error"), { status: 500 })
  }
}

