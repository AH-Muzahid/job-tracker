/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = "force-dynamic"

import { NextRequest, after } from "next/server"
import { z } from "zod"
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
import { getCachedJson, setCachedJson, invalidateCache } from "@/lib/redis"
import { logDiscoveryEvent } from "@/lib/discovery/telemetry"
import { invalidateUserImplicitPreferences } from "@/lib/discovery/preferences"
import { generateApplicationMaterialsAgent } from "@/lib/discovery/cover-letter-agent"
import { getCompanyEnrichment } from "@/lib/discovery/company-enrichment"
import { retrieveCandidateJobsTier1 } from "@/lib/discovery/vector-retrieval"
import { deepReRankCandidateJobs } from "@/lib/discovery/ai-reranker"
import {
  harvestLinkedInOpportunities,
  ingestLinkedInOpportunitiesToCatalog,
} from "@/lib/discovery/linkedin-harvester"

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
    const cacheKey = `discovery:feed:v1:${userId}`
    if (!forceRefresh && !query) {
      const cached = await getCachedJson<Record<string, unknown>>(cacheKey)
      if (cached) {
        return ResponseUtil.success(cached)
      }
    }

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
        batchSummary: { today: 0, yesterday: 0, week: 0, totalActive: 0 },
        opportunities: [],
      })
    }

    // 2. FAST PATH: Read pre-computed UserJobMatch records (batch pipeline already scored these)
    // This is the same strategy Dashboard uses — instant DB read, no vector retrieval or AI re-ranking.
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Parallelize ALL remaining reads
    const [precomputedMatches, savedMatchesList, profile, resume, userApplications] = await Promise.all([
      withDbRetry(() =>
        prisma.userJobMatch.findMany({
          where: {
            userId,
            status: { in: ["PUBLISHED", "STAGED"] },
            isSaved: false,
            OR: [
              { publishedAt: { gte: sevenDaysAgo } },
              { publishedAt: null }, // STAGED matches haven't been published yet
            ],
            job: { isExpired: false },
          },
          include: {
            job: {
              select: {
                id: true,
                title: true,
                company: true,
                location: true,
                isRemote: true,
                url: true,
                salary: true,
                salaryMin: true,
                salaryMax: true,
                tags: true,
                description: true,
                postedAt: true,
                visaSponsorship: true,
                sourceBoard: true,
              },
            },
          },
          orderBy: [{ fitScore: "desc" }, { publishedAt: "desc" }],
          take: 60,
        })
      ) as Promise<any[]>,
      withDbRetry(() =>
        prisma.userJobMatch.findMany({
          where: {
            userId,
            isSaved: true,
            job: { isExpired: false },
          },
          include: {
            job: {
              select: {
                id: true,
                title: true,
                company: true,
                location: true,
                isRemote: true,
                url: true,
                salary: true,
                salaryMin: true,
                salaryMax: true,
                tags: true,
                description: true,
                postedAt: true,
                visaSponsorship: true,
                sourceBoard: true,
              },
            },
          },
          orderBy: [{ fitScore: "desc" }],
          take: 30,
        })
      ) as Promise<any[]>,
      withDbRetry(() => prisma.userProfile.findUnique({ where: { userId } })),
      withDbRetry(() =>
        prisma.resume.findFirst({
          where: { userId },
          orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
        })
      ),
      withDbRetry(() =>
        prisma.application.findMany({
          where: { userId },
          select: { id: true, companyName: true, jobTitle: true, status: true },
        })
      ),
    ])

    // Merge & deduplicate (saved may overlap with published)
    const allMatchesMap = new Map<string, typeof precomputedMatches[0]>()
    for (const m of precomputedMatches) {
      allMatchesMap.set(m.jobId, m)
    }
    for (const m of savedMatchesList) {
      if (!allMatchesMap.has(m.jobId)) allMatchesMap.set(m.jobId, m)
    }
    const allMatches = Array.from(allMatchesMap.values())

    // 3. Resolve Profile (needed for appMap, and for fallback vector retrieval)
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
    const appMap = new Map<string, { id: string; status: string }>()
    for (const app of userApplications) {
      const key = `${normalizeCompany(app.companyName)}:${normalizeTitle(app.jobTitle)}`
      appMap.set(key, { id: app.id, status: app.status })
    }

    // Helper: transform a CanonicalJob + match data into UI-ready opportunity format
    const transformToOpportunity = (jobData: {
      id: string; title: string; company: string; location: string; isRemote: boolean;
      url: string; salary: string | null; salaryMin: number | null; salaryMax: number | null;
      tags: string[]; description: string | null; postedAt: Date | null;
      visaSponsorship: string; sourceBoard?: string | null;
    }, matchData: { id: string; fitScore: number; matchRationale: string | null; isSaved: boolean; publishedAt?: Date | null }) => {
      // The date this job was released into the user's feed (batch publish time).
      // Bucketing uses this, NOT the original external posting date, so "Today" = today's batch.
      const releasedAt = matchData.publishedAt || jobData.postedAt || now
      const daysAgo = Math.floor((now.getTime() - releasedAt.getTime()) / (1000 * 60 * 60 * 24))

      const batchSlot: "today" | "yesterday" | "week" =
        daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : "week"
      const batchLabel = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`

      const dedupKey = `${normalizeCompany(jobData.company)}:${normalizeTitle(jobData.title)}`
      const existingApp = appMap.get(dedupKey)
      const freshness = calculateJobFreshness(jobData.postedAt || releasedAt)
      const employmentType = detectEmploymentType({
        title: jobData.title,
        description: jobData.description || "",
        tags: jobData.tags || [],
      })

      return {
        id: jobData.id,
        jobId: jobData.id,
        title: jobData.title,
        company: jobData.company,
        location: jobData.location,
        url: jobData.url,
        sourceBoard: (jobData.sourceBoard || "curated") as any,
        tags: jobData.tags || [],
        salary: jobData.salary || (jobData.salaryMin && jobData.salaryMax ? `$${jobData.salaryMin} - $${jobData.salaryMax}` : undefined),
        fitScore: matchData.fitScore,
        matchRationale: matchData.matchRationale,
        descriptionSnippet: (jobData.description || "").slice(0, 300),
        batchId: `recsys-${now.toISOString().slice(0, 10)}`,
        batchSlot,
        batchLabel,
        publishedAt: releasedAt.toISOString(),
        postedAt: (jobData.postedAt || releasedAt).toISOString(),
        freshnessLabel: freshness.label,
        visaSponsorship: (jobData.visaSponsorship as any) || "unknown",
        employmentType,
        isSaved: matchData.isSaved,
        appliedStatus: existingApp?.status || null,
        applicationId: existingApp?.id || null,
        companyEnrichment: getCompanyEnrichment(jobData.company, {
          description: jobData.description || undefined,
          location: jobData.location,
          url: jobData.url,
          tags: jobData.tags || [],
        }),
      }
    }

    // 4. Build opportunities from pre-computed matches (instant — no vector retrieval, no AI re-ranking)
    const opportunities = allMatches
      .filter((m) => m.job)
      .map((m) => transformToOpportunity(m.job!, m))

    // 5. FALLBACK: If pre-computed matches are insufficient, run full vector retrieval + re-ranking pipeline
    const FAST_PATH_MIN_THRESHOLD = 10
    if (forceRefresh || opportunities.length < FAST_PATH_MIN_THRESHOLD) {
      console.log(`[JobDiscovery API] Pre-computed matches: ${opportunities.length}. Running full pipeline (forceRefresh=${forceRefresh})...`)

      if (forceRefresh) {
        // Dispatch asynchronous LinkedIn harvest to Inngest so the user GET request doesn't stall
        inngest
          .send({
            name: "discovery/linkedin-harvest.trigger",
            data: { skills: userSkills, targetRoles, experienceLevel, location, workPreference },
          })
          .catch((err) => console.warn("[JobDiscovery API] Force refresh LinkedIn trigger failed:", err))
      }

      const shortlistedCandidates = await retrieveCandidateJobsTier1({
        userId, targetRoles, userSkills, projects, workPreference, limit: 25,
      })
      console.log(`[JobDiscovery API] Tier 1 retrieved ${shortlistedCandidates.length} vector candidates`)

      const reRankedOpportunities = await deepReRankCandidateJobs({
        candidateProfile: { userId, targetRoles, skills: userSkills, experienceLevel, location, projects },
        jobs: shortlistedCandidates,
      })
      console.log(`[JobDiscovery API] Tier 2 re-ranked ${reRankedOpportunities.length} opportunities`)

      const pipelineOpps = reRankedOpportunities.map((job) =>
        transformToOpportunity(job, { id: job.id, fitScore: job.fitScore, matchRationale: job.matchRationale, isSaved: false })
      )

      // Merge: pre-computed first, then pipeline results (deduplicate by job id)
      const existingIds = new Set(opportunities.map((o) => o.id))
      for (const opp of pipelineOpps) {
        if (!existingIds.has(opp.id)) {
          opportunities.push(opp)
          existingIds.add(opp.id)
        }
      }
    }

    // Re-sort by fitScore descending (pre-computed already sorted, but merged results need re-sort)
    opportunities.sort((a, b) => b.fitScore - a.fitScore)

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
      today: opportunities.filter((j) => j.batchSlot === "today").length,
      yesterday: opportunities.filter((j) => j.batchSlot === "yesterday").length,
      week: opportunities.filter((j) => j.batchSlot === "week").length,
      totalActive: opportunities.length,
    }

    const topPicksCount = filteredOpportunities.filter((o) => o.fitScore >= 90).length

    console.log(
      `[JobDiscovery API] Returning ${filteredOpportunities.length} opportunities for userId=${userId} (${topPicksCount} top picks). Slots:`,
      batchSummary
    )

    // Non-blocking after() tasks: telemetry + background LinkedIn harvesting
    after(async () => {
      try {
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

        if (!forceRefresh) {
          // Throttle background LinkedIn harvest to max once per 30 minutes per user
          const harvestThrottleKey = `discovery:linkedin-harvest:${userId}`
          const lastHarvest = await getCachedJson<number>(harvestThrottleKey).catch(() => null)
          const HARVEST_COOLDOWN_MS = 30 * 60 * 1000 // 30 minutes

          if (!lastHarvest || Date.now() - lastHarvest > HARVEST_COOLDOWN_MS) {
            await setCachedJson(harvestThrottleKey, Date.now(), 1800).catch(() => {})
            // Decoupled Inngest event: completes in milliseconds, freeing the container immediately
            await inngest
              .send({
                name: "discovery/linkedin-harvest.trigger",
                data: { skills: userSkills, targetRoles, experienceLevel, location, workPreference },
              })
              .catch((err) => console.warn("[JobDiscovery API] Inngest LinkedIn trigger failed:", err))
          }
        }
      } catch (bgError) {
        console.warn("[JobDiscovery API] Background tasks failed:", bgError)
      }
    })

    const responsePayload = {
      count: filteredOpportunities.length,
      totalAvailable: opportunities.length,
      topPicksCount,
      nextBatchAt,
      currentBatchStartedAt,
      batchSummary,
      opportunities: filteredOpportunities,
    }

    if (!query) {
      void setCachedJson(cacheKey, responsePayload, 300) // 5-minute server cache (pipeline invalidates on batch update)
    }

    return ResponseUtil.success(responsePayload)
  } catch (error: any) {
    console.error("[JobDiscovery API] GET Error:", error)
    return ResponseUtil.error(error?.message || "Internal server error", 500)
  }
}

const DiscoverActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save"),
    jobId: z.string().optional(),
    companyName: z.string().min(1, "Company name is required").max(200),
    jobTitle: z.string().min(1, "Job title is required").max(200),
    jobUrl: z.string().max(2000).optional(),
    location: z.string().max(200).optional(),
    salary: z.string().max(100).optional(),
    status: z.string().max(50).optional(),
    notes: z.string().max(5000).optional(),
    fitScore: z.number().min(0).max(100).optional(),
  }),
  z.object({
    action: z.literal("unsave"),
    jobId: z.string().optional(),
    companyName: z.string().max(200).optional(),
    jobTitle: z.string().max(200).optional(),
  }),
  z.object({
    action: z.literal("refresh"),
  }),
  z.object({
    action: z.literal("dismiss"),
    jobId: z.string().optional(),
    companyName: z.string().max(200).optional(),
    jobTitle: z.string().max(200).optional(),
    dismissReason: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal("undismiss"),
    jobId: z.string().optional(),
    companyName: z.string().max(200).optional(),
    jobTitle: z.string().max(200).optional(),
  }),
  z.object({
    action: z.literal("track_click"),
    jobId: z.string().optional(),
    companyName: z.string().max(200).optional(),
    jobTitle: z.string().max(200).optional(),
    clickType: z.enum(["apply", "view", "external"]).optional(),
  }),
])

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
    const rawBody = await request.json().catch(() => null)
    if (!rawBody || typeof rawBody !== "object") {
      return ResponseUtil.badRequest("Invalid request body: expected JSON object")
    }

    const parseResult = DiscoverActionSchema.safeParse(rawBody)
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")
      return ResponseUtil.badRequest(`Validation error: ${errorMsg}`)
    }

    const body = parseResult.data as any
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

    const safeAfter = (fn: () => Promise<void> | void) => {
      try {
        after(fn)
      } catch {
        void fn()
      }
    }

    if (action === "save") {
      const { jobId, companyName, jobTitle, jobUrl, location, salary, status, notes, fitScore } = body
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

      // 2. Mark UserJobMatch as isSaved: true (protected from rolling 24h archival) and STAGED if status is Staged
      const isStagedAction = status === "Staged" || status === "STAGED"
      const matchUpdateData = {
        isSaved: true,
        ...(isStagedAction ? { status: "STAGED" } : {}),
        ...(typeof fitScore === "number" ? { fitScore } : {}),
      }

      if (jobId) {
        await withDbRetry(() =>
          prisma.userJobMatch.updateMany({
            where: {
              userId,
              OR: [
                { id: jobId },
                { jobId: jobId },
                ...(resolvedJobId ? [{ jobId: resolvedJobId }] : []),
              ],
            },
            data: matchUpdateData,
          })
        ).catch((err) => console.warn("[UserJobMatch save mark error]:", err))
      } else {
        await withDbRetry(() =>
          prisma.userJobMatch.updateMany({
            where: {
              userId,
              job: {
                company: { equals: companyName, mode: "insensitive" },
                title: { equals: jobTitle, mode: "insensitive" },
              },
            },
            data: matchUpdateData,
          })
        ).catch((err) => console.warn("[UserJobMatch save mark error]:", err))
      }

      // 3. Post-response background execution via Next.js 15 after() to prevent serverless CPU freeze
      const savedAppId = (saveResult as any).applicationId
      safeAfter(async () => {
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
            invalidateCache(`discovery:feed:v1:${userId}`),
            invalidateCache(`user:stats:v2:${userId}`),
            invalidateCache(`dashboard:stats:${userId}`),
            invalidateCache(`applications:${userId}`),
            savedAppId
              ? generateApplicationMaterialsAgent(userId, savedAppId, {
                  companyName,
                  jobTitle,
                  jobUrl,
                  location,
                  notes,
                  salary,
                  fitScore: typeof fitScore === "number" ? fitScore : undefined,
                })
              : Promise.resolve(),
          ])
        } catch (afterErr) {
          console.error("[JobDiscovery API] Error in post-save background tasks:", afterErr)
        }
      })

      return ResponseUtil.success(saveResult)
    }

    if (action === "unsave") {
      const { jobId } = body
      let { companyName, jobTitle } = body
      const resolvedJobId = await resolveCanonicalJobId(jobId)

      // If companyName or jobTitle not provided, look up from UserJobMatch
      if ((!companyName || !jobTitle) && jobId) {
        const foundMatch = await prisma.userJobMatch.findFirst({
          where: { userId, OR: [{ id: jobId }, { jobId: jobId }] },
          include: { job: { select: { company: true, title: true } } },
        }).catch(() => null)

        if (foundMatch?.job) {
          companyName = companyName || foundMatch.job.company
          jobTitle = jobTitle || foundMatch.job.title
        }
      }

      // 1. Mark UserJobMatch as isSaved: false
      if (jobId) {
        await withDbRetry(() =>
          prisma.userJobMatch.updateMany({
            where: {
              userId,
              OR: [{ id: jobId }, { jobId: jobId }],
            },
            data: { isSaved: false },
          })
        ).catch((err) => console.warn("[UserJobMatch unsave mark error]:", err))
      } else if (companyName && jobTitle) {
        await withDbRetry(() =>
          prisma.userJobMatch.updateMany({
            where: {
              userId,
              job: { company: companyName, title: jobTitle },
            },
            data: { isSaved: false },
          })
        ).catch((err) => console.warn("[UserJobMatch unsave mark error]:", err))
      }

      // 2. Remove bookmark Application record if still in Saved status
      if (companyName && jobTitle) {
        await withDbRetry(() =>
          prisma.application.deleteMany({
            where: {
              userId,
              companyName: { equals: companyName, mode: "insensitive" },
              jobTitle: { equals: jobTitle, mode: "insensitive" },
              status: "Saved",
            },
          })
        ).catch((err) => console.warn("[Application unsave remove error]:", err))
      }

      // 3. Invalidate caches and log telemetry
      safeAfter(async () => {
        try {
          await Promise.allSettled([
            invalidateCache(`discovery:feed:v1:${userId}`),
            invalidateCache(`user:stats:v2:${userId}`),
            invalidateCache(`dashboard:stats:${userId}`),
            invalidateCache(`applications:${userId}`),
            Promise.resolve(
              logDiscoveryEvent({
                userId,
                eventType: "JOB_UNSAVED",
                jobId: resolvedJobId || jobId || undefined,
                metadata: { companyName, jobTitle },
              })
            ),
            invalidateUserImplicitPreferences(userId),
          ])
        } catch (afterErr) {
          console.error("[JobDiscovery API] Error in post-unsave background tasks:", afterErr)
        }
      })

      return ResponseUtil.success({ unsaved: true })
    }

    if (action === "refresh") {
      console.log(`[JobDiscovery API] Refresh batch triggered for userId=${userId}`)
      await invalidateCache(`discovery:feed:v1:${userId}`)
      safeAfter(async () => {
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

      safeAfter(async () => {
        try {
          await Promise.allSettled([
            invalidateCache(`discovery:feed:v1:${userId}`),
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

      safeAfter(async () => {
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

      safeAfter(async () => {
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

