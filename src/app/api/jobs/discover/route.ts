/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = "force-dynamic"

import { NextRequest, after } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import {
  executeSaveJobOpportunityToTracker,
  normalizeCompany,
  normalizeTitle,
  calculateJobFreshness,
} from "@/lib/ai/graph/tools/discovery-tools"
import { detectEmploymentType } from "@/lib/discovery/matching"
import {
  getNextBatchReleaseTime,
  getCurrentBatchStartTime,
  processUserJobBatch,
} from "@/inngest/functions/batch-job-pipeline"
import { inngest } from "@/inngest/client"
import { checkDistributedRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { ResponseUtil } from "@/lib/api-response"
import { logDiscoveryEvent } from "@/lib/discovery/telemetry"
import { invalidateUserImplicitPreferences } from "@/lib/discovery/preferences"
import { generateApplicationMaterialsAgent } from "@/lib/discovery/cover-letter-agent"
import { getCompanyEnrichment } from "@/lib/discovery/company-enrichment"
import { retrieveCandidateJobsTier1 } from "@/lib/discovery/vector-retrieval"
import { deepReRankCandidateJobs } from "@/lib/discovery/ai-reranker"

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

    // 2. Resolve Profile & Demonstrated Projects
    const [profile, resume] = await Promise.all([
      withDbRetry(() => prisma.userProfile.findUnique({ where: { userId } })),
      withDbRetry(() =>
        prisma.resume.findFirst({
          where: { userId },
          orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
        })
      ),
    ])

    const targetRoles =
      profile?.targetRoles && profile.targetRoles.length > 0
        ? profile.targetRoles
        : ["Software Engineer", "Full Stack Developer"]

    const userSkills: string[] = []
    if ((profile as any)?.skills && Array.isArray((profile as any).skills)) {
      userSkills.push(...(profile as any).skills)
    }
    if (profile?.strengths) {
      profile.strengths.split(/[,|\n]+/).forEach((s) => {
        const t = s.trim()
        if (t && !userSkills.includes(t)) userSkills.push(t)
      })
    }
    if (resume?.textContent) {
      const tokens = resume.textContent.toLowerCase().match(/[a-z0-9+#.-]+/g) || []
      tokens.slice(0, 25).forEach((tok) => {
        if (tok.length > 2 && !userSkills.includes(tok)) userSkills.push(tok)
      })
    }

    const projects = ((profile?.bestProjects as any[]) || (profile as any)?.projects as any[]) || []
    const workPreference = profile?.workPreference || "remote"
    const experienceLevel = profile?.experienceLevel || "mid"
    const location = profile?.location || "Remote"

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

    // 3. TIER 1: Dense Vector Retrieval (<30ms)
    const shortlistedCandidates = await retrieveCandidateJobsTier1({
      userId,
      targetRoles,
      userSkills,
      projects,
      workPreference,
      limit: 25,
    })

    console.log(`[JobDiscovery API] Tier 1 retrieved ${shortlistedCandidates.length} vector candidates for userId=${userId}`)

    // 4. TIER 2: Deep Cross-Encoder Re-Ranking (<800ms)
    const reRankedOpportunities = await deepReRankCandidateJobs({
      candidateProfile: {
        targetRoles,
        skills: userSkills,
        experienceLevel,
        location,
        projects,
      },
      jobs: shortlistedCandidates,
    })

    console.log(`[JobDiscovery API] Tier 2 re-ranked ${reRankedOpportunities.length} opportunities for userId=${userId}`)

    // 5. Query user's saved jobs from the shortlisted candidates
    const candidateJobIds = reRankedOpportunities.map((o) => o.id)
    const savedMatches = await withDbRetry(() =>
      prisma.userJobMatch.findMany({
        where: {
          userId,
          jobId: { in: candidateJobIds },
          isSaved: true,
        },
        select: { jobId: true },
      })
    ).catch(() => [])
    const savedJobIdSet = new Set(savedMatches.map((m) => m.jobId))

    // 6. Transform into UI-ready opportunity format with batch age metadata
    const opportunities = reRankedOpportunities.map((job) => {
      const publishedAt = job.postedAt || now
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
      const freshness = calculateJobFreshness(job.postedAt || publishedAt)
      const employmentType = detectEmploymentType({
        title: job.title,
        description: job.description || "",
        tags: job.tags || [],
      })

      return {
        id: job.id,
        jobId: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        url: job.url,
        sourceBoard: ((job as any).sourceBoard || "curated") as any,
        tags: job.tags || [],
        salary: job.salary || (job.salaryMin && job.salaryMax ? `$${job.salaryMin} - $${job.salaryMax}` : undefined),
        fitScore: job.fitScore,
        matchRationale: job.matchRationale,
        descriptionSnippet: job.description || "",
        batchId: `recsys-${now.toISOString().slice(0, 10)}`,
        batchSlot,
        batchLabel,
        publishedAt: publishedAt.toISOString(),
        postedAt: (job.postedAt || publishedAt).toISOString(),
        freshnessLabel: freshness.label,
        visaSponsorship: (job.visaSponsorship as any) || "unknown",
        employmentType,
        isSaved: savedJobIdSet.has(job.id),
        appliedStatus: existingApp?.status || null,
        applicationId: existingApp?.id || null,
        scoreBreakdown: job.scoreBreakdown,
        companyEnrichment: getCompanyEnrichment(job.company, {
          description: job.description || undefined,
          location: job.location,
          url: job.url,
          tags: job.tags || [],
        }),
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

    const topPicksCount = filteredOpportunities.filter((o) => o.fitScore >= 90).length

    console.log(
      `[JobDiscovery API] Returning ${filteredOpportunities.length} opportunities for userId=${userId} (${topPicksCount} top picks). Slots:`,
      batchSummary
    )

    // Fire-and-forget telemetry logging (non-blocking, zero latency impact on GET)
    logDiscoveryEvent({
      userId,
      eventType: "FEED_VIEWED",
      metadata: {
        count: filteredOpportunities.length,
        totalActive: opportunities.length,
        topPicksCount,
        query: query || undefined,
        forceRefresh,
      },
    })

    return ResponseUtil.success({
      count: filteredOpportunities.length,
      totalAvailable: reRankedOpportunities.length,
      topPicksCount,
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

    // Helper to resolve canonicalJobId from jobId (which may be a UserJobMatch id or CanonicalJob id)
    const resolveCanonicalJobId = async (rawId?: string): Promise<string | undefined> => {
      if (!rawId) return undefined
      try {
        const match = await prisma.userJobMatch.findFirst({
          where: { userId, OR: [{ id: rawId }, { jobId: rawId }] },
          select: { jobId: true },
        })
        return match?.jobId || rawId
      } catch {
        return rawId
      }
    }

    if (action === "save") {
      const { jobId, companyName, jobTitle, jobUrl, location, salary, status, notes } = body
      const resolvedJobId = await resolveCanonicalJobId(jobId)

      // 1. Save directly into User Tracker (Application model)
      const saveResult = await executeSaveJobOpportunityToTracker(userId, {
        companyName,
        jobTitle,
        jobUrl,
        location,
        salary,
        status: status || "Saved",
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

      // 3. Post-response background execution via Next.js 15 after() to prevent serverless CPU freeze
      const savedAppId = (saveResult as any).applicationId
      after(async () => {
        try {
          await Promise.allSettled([
            Promise.resolve(
              logDiscoveryEvent({
                userId,
                eventType: "JOB_SAVED",
                jobId: resolvedJobId || jobId || undefined,
                metadata: { companyName, jobTitle, location, salary },
              })
            ),
            invalidateUserImplicitPreferences(userId),
            savedAppId
              ? generateApplicationMaterialsAgent(userId, savedAppId, {
                  companyName,
                  jobTitle,
                  jobUrl,
                  location,
                  notes,
                  salary,
                })
              : Promise.resolve(),
          ])
        } catch (afterErr) {
          console.error("[JobDiscovery API] Error in post-save background tasks:", afterErr)
        }
      })

      return ResponseUtil.success(saveResult)
    }

    if (action === "refresh") {
      console.log(`[JobDiscovery API] Refresh batch triggered for userId=${userId}`)
      after(async () => {
        try {
          logDiscoveryEvent({
            userId,
            eventType: "FEED_REFRESHED",
          })
        } catch (afterErr) {
          console.error("[JobDiscovery API] Error logging refresh event:", afterErr)
        }
      })
      const result = await processUserJobBatch(userId, { forceImmediatePublish: true, notify: false })
      return ResponseUtil.success(result)
    }

    if (action === "dismiss") {
      const { jobId, companyName, jobTitle, dismissReason } = body
      const resolvedJobId = await resolveCanonicalJobId(jobId)

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

      after(async () => {
        try {
          await Promise.allSettled([
            Promise.resolve(
              logDiscoveryEvent({
                userId,
                eventType: "JOB_DISMISSED",
                jobId: resolvedJobId || jobId || undefined,
                metadata: { companyName, jobTitle, dismissReason: dismissReason || "user_hidden" },
              })
            ),
            invalidateUserImplicitPreferences(userId),
          ])
        } catch (afterErr) {
          console.error("[JobDiscovery API] Error in post-dismiss background tasks:", afterErr)
        }
      })

      return ResponseUtil.success({ dismissed: true })
    }

    if (action === "undismiss") {
      const { jobId, companyName, jobTitle } = body
      const resolvedJobId = await resolveCanonicalJobId(jobId)

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

      after(async () => {
        try {
          await Promise.allSettled([
            Promise.resolve(
              logDiscoveryEvent({
                userId,
                eventType: "JOB_UNDISMISSED",
                jobId: resolvedJobId || jobId || undefined,
                metadata: { companyName, jobTitle },
              })
            ),
            invalidateUserImplicitPreferences(userId),
          ])
        } catch (afterErr) {
          console.error("[JobDiscovery API] Error in post-undismiss background tasks:", afterErr)
        }
      })

      return ResponseUtil.success({ restored: true })
    }

    if (action === "track_click") {
      const { jobId, companyName, jobTitle, clickType } = body
      const resolvedJobId = await resolveCanonicalJobId(jobId)
      const eventType = clickType === "apply" ? "JOB_APPLIED" : "JOB_CLICK_EXTERNAL"

      after(async () => {
        try {
          await Promise.allSettled([
            Promise.resolve(
              logDiscoveryEvent({
                userId,
                eventType,
                jobId: resolvedJobId || jobId || undefined,
                metadata: { companyName, jobTitle, clickType },
              })
            ),
            eventType === "JOB_APPLIED" ? invalidateUserImplicitPreferences(userId) : Promise.resolve(),
          ])
        } catch (afterErr) {
          console.error("[JobDiscovery API] Error in post-track-click background tasks:", afterErr)
        }
      })

      return ResponseUtil.success({ tracked: true, eventType })
    }

    return ResponseUtil.badRequest("Invalid action")
  } catch (error: any) {
    console.error("[JobDiscovery API] POST Error:", error)
    return ResponseUtil.error(error?.message || "Internal server error", 500)
  }
}

