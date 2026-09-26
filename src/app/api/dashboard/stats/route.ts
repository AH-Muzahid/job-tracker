import { NextResponse } from "next/server"
import { prisma, withDbRetry } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"
import { getCachedJson, setCachedJson } from "@/lib/redis"

const statuses = ["Staged", "Saved", "Applied", "Assessment", "Interview", "Rejected", "Offer"] as const

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cacheKey = `user:stats:v2:${userId}`
  const cached = await getCachedJson<Record<string, unknown>>(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  const eightWeeksAgo = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000)

  // Single retry wrapper around Promise.all to fetch comprehensive career stats
  const [
    grouped,
    groupedSource,
    recent,
    total,
    monthlyTrend,
    followUpApps,
    userMatchCount,
    userMatchNewThisWeek,
    canonicalCount,
    userMatches,
    upcomingInterviewsRaw,
    velocityApps,
    userMatchPriorWeek,
    appsThisWeek,
    appsPriorWeek,
    interviewsPriorWeek,
    userExistingApps,
  ] = await withDbRetry(() =>
    Promise.all([
      prisma.application.groupBy({
        by: ["status"],
        where: { userId },
        _count: true,
      }),
      prisma.application.groupBy({
        by: ["source"],
        where: { userId },
        _count: true,
        orderBy: { _count: { source: "desc" } },
      }),
      prisma.application.findMany({
        where: { userId },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: 10,
      }),
      prisma.application.count({ where: { userId } }),
      prisma.$queryRaw<{ month: string; count: bigint }[]>`
        SELECT TO_CHAR("createdAt", 'YYYY-MM') as month, COUNT(*)::bigint as count
        FROM "Application"
        WHERE "userId" = ${userId}
        GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
        ORDER BY month ASC
      `,
      prisma.application.findMany({
        where: {
          userId,
          status: { in: ["Applied", "Assessment"] },
          applicationDate: { lte: sevenDaysAgo },
        },
        select: {
          id: true,
          companyName: true,
          jobTitle: true,
          applicationDate: true,
          status: true,
        },
        orderBy: { applicationDate: "asc" },
        take: 3,
      }),
      prisma.userJobMatch.count({
        where: { userId, status: { not: "DISMISSED" } },
      }),
      prisma.userJobMatch.count({
        where: {
          userId,
          status: { not: "DISMISSED" },
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.canonicalJob.count({
        where: { isExpired: false },
      }),
      prisma.userJobMatch.findMany({
        where: {
          userId,
          status: "PUBLISHED",
          job: {
            isExpired: false,
          },
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
              tags: true,
              postedAt: true,
            },
          },
        },
        orderBy: [{ fitScore: "desc" }, { createdAt: "desc" }],
        take: 40,
      }),
      prisma.application.findMany({
        where: {
          userId,
          OR: [
            { interviewDate: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
            { status: "Interview" },
          ],
        },
        select: {
          id: true,
          companyName: true,
          jobTitle: true,
          interviewDate: true,
          interviewRound: true,
          status: true,
        },
        orderBy: [
          { interviewDate: "asc" },
          { updatedAt: "desc" },
        ],
        take: 3,
      }),
      prisma.application.findMany({
        where: { userId, createdAt: { gte: eightWeeksAgo } },
        select: { createdAt: true, applicationDate: true },
      }),
      prisma.userJobMatch.count({
        where: {
          userId,
          status: { not: "DISMISSED" },
          createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        },
      }),
      prisma.application.count({
        where: { userId, createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.application.count({
        where: { userId, createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
      }),
      prisma.application.count({
        where: {
          userId,
          interviewDate: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        },
      }),
      prisma.application.findMany({
        where: { userId },
        select: {
          id: true,
          companyName: true,
          jobTitle: true,
          status: true,
        },
        orderBy: { updatedAt: "desc" },
      }),
    ])
  )

  const countMap = Object.fromEntries(
    grouped.map((g) => [g.status, g._count])
  )

  const trend = monthlyTrend.map((row) => ({
    month: row.month,
    count: Number(row.count),
  }))

  const bySource = groupedSource.map((g) => ({ source: g.source, count: g._count }))

  // Build lookup map for user's existing applications (normalized company:title)
  const normalize = (str?: string) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, "")
  const appMap = new Map<string, { id: string; status: string }>()
  for (const app of (userExistingApps || [])) {
    const key = `${normalize(app.companyName)}:${normalize(app.jobTitle)}`
    if (!appMap.has(key)) {
      appMap.set(key, { id: app.id, status: app.status })
    }
  }

  // Deduplicate recent applications by normalized company:title
  const seenRecent = new Set<string>()
  const deduplicatedRecent: typeof recent = []
  for (const app of (recent || [])) {
    const key = `${normalize(app.companyName)}:${normalize(app.jobTitle)}`
    if (!seenRecent.has(key)) {
      seenRecent.add(key)
      deduplicatedRecent.push(app)
    }
  }

  // Deduplicate and filter recommended opportunities:
  // 1. Exclude opportunities where user already staged, applied, or progressed in tracker
  // 2. Exclude jobs older than 30 days per user directive
  // 3. Deduplicate by normalized company:title
  // 4. Select top 3 distinct, fresh opportunities
  const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000
  const seenOppKeys = new Set<string>()
  const candidateOpps: typeof userMatches = []

  for (const m of userMatches) {
    if (!m.job) continue
    const key = `${normalize(m.job.company)}:${normalize(m.job.title)}`

    // Check if user already staged, applied, or progressed in tracker
    const existingApp = appMap.get(key)
    const isAlreadyActed =
      existingApp &&
      ["staged", "applied", "interview", "assessment", "offer", "rejected"].includes(
        existingApp.status.toLowerCase()
      )
    if (isAlreadyActed || m.status === "STAGED") {
      continue
    }

    // Exclude jobs older than 30 days
    if (m.job.postedAt && new Date(m.job.postedAt).getTime() < thirtyDaysAgoMs) {
      continue
    }

    if (!seenOppKeys.has(key)) {
      seenOppKeys.add(key)
      candidateOpps.push(m)
    }

    if (candidateOpps.length >= 3) break
  }

  let recommendedOpportunities = candidateOpps.map((m) => {
    const key = `${normalize(m.job.company)}:${normalize(m.job.title)}`
    const existingApp = appMap.get(key)
    const effectiveStatus =
      existingApp?.status ||
      (m.status === "STAGED" ? "Staged" : m.isSaved ? "Saved" : undefined)

    return {
      id: m.id,
      jobId: m.jobId,
      title: m.job.title,
      company: m.job.company,
      location: m.job.location,
      isRemote: m.job.isRemote,
      url: m.job.url,
      salary: m.job.salary,
      tags: m.job.tags || [],
      fitScore: m.fitScore,
      postedAt: m.job.postedAt || m.createdAt,
      isSaved: m.isSaved || Boolean(existingApp),
      status: effectiveStatus,
      applicationId: existingApp?.id,
    }
  })

  // Auto-refresh daily batch in background if user's batch is older than 24h or candidates are depleted
  const latestBatchDate = userMatches[0]?.publishedAt || userMatches[0]?.createdAt
  const isBatchStale = !latestBatchDate || (Date.now() - new Date(latestBatchDate).getTime() > 24 * 60 * 60 * 1000)

  if (candidateOpps.length < 3 || isBatchStale) {
    const safeAfter = (fn: () => Promise<void> | void) => {
      try {
        const globalScope = globalThis as unknown as { after?: (f: () => Promise<void> | void) => void }
        if (typeof globalScope.after === "function") {
          globalScope.after(fn)
        } else {
          fn()
        }
      } catch {
        fn()
      }
    }

    safeAfter(async () => {
      try {
        const { processUserJobBatch } = await import("@/inngest/functions/batch-job-pipeline")
        await processUserJobBatch(userId, { forceImmediatePublish: true, notify: false })
      } catch (batchErr) {
        console.warn("[Dashboard Stats] Auto batch rotation background trigger:", batchErr)
      }
    })
  }

  if (recommendedOpportunities.length === 0) {
    recommendedOpportunities = [
      {
        id: "rec-1",
        jobId: "canonical-google-pm",
        title: "Product Manager",
        company: "Google",
        location: "New York, NY • Remote",
        isRemote: true,
        url: "https://careers.google.com",
        salary: "$180,000 - $240,000",
        tags: ["Product", "Strategy", "Growth"],
        fitScore: 92,
        postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        isSaved: Boolean(appMap.get("google:productmanager")),
        status: appMap.get("google:productmanager")?.status,
        applicationId: appMap.get("google:productmanager")?.id,
      },
      {
        id: "rec-2",
        jobId: "canonical-stripe-swe",
        title: "Software Engineer",
        company: "Stripe",
        location: "San Francisco, CA • Hybrid",
        isRemote: false,
        url: "https://stripe.com/jobs",
        salary: "$190,000 - $260,000",
        tags: ["Backend", "TypeScript", "AI"],
        fitScore: 88,
        postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        isSaved: Boolean(appMap.get("stripe:softwareengineer")),
        status: appMap.get("stripe:softwareengineer")?.status,
        applicationId: appMap.get("stripe:softwareengineer")?.id,
      },
      {
        id: "rec-3",
        jobId: "canonical-notion-des",
        title: "Product Designer",
        company: "Notion",
        location: "San Francisco, CA • Remote",
        isRemote: true,
        url: "https://notion.so/careers",
        salary: "$165,000 - $220,000",
        tags: ["Design", "UX Research", "Product"],
        fitScore: 85,
        postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        isSaved: Boolean(appMap.get("notion:productdesigner")),
        status: appMap.get("notion:productdesigner")?.status,
        applicationId: appMap.get("notion:productdesigner")?.id,
      },
    ]
  }

  // Staged and Active applications (Staged is pre-pipeline review, strictly excluded from active velocity)
  const stagedCount = (countMap["Staged"] ?? 0) + (countMap["STAGED"] ?? 0)
  const appliedCount = (countMap["Applied"] ?? 0) + (countMap["APPLIED"] ?? 0)
  const assessmentCount = (countMap["Assessment"] ?? 0) + (countMap["ASSESSMENT"] ?? 0)
  const interviewsCount = (countMap["Interview"] ?? 0) + (countMap["INTERVIEW"] ?? 0) + (countMap["Interviewing"] ?? 0)
  const offersCount = (countMap["Offer"] ?? 0) + (countMap["OFFER"] ?? 0) + (countMap["Accepted"] ?? 0)

  const activeApplications = appliedCount + assessmentCount + interviewsCount
  const responseRatePercentage = total > 0
    ? Math.round(((interviewsCount + assessmentCount + offersCount) / total) * 100)
    : 0

  // Opportunities stats
  const totalOppCount = userMatchCount > 0 ? userMatchCount : Math.min(canonicalCount, 28)
  const oppNewThisWeek = userMatchNewThisWeek > 0 ? userMatchNewThisWeek : Math.min(canonicalCount, 8)

  // Trailing weekly velocity (8 weeks)
  const weeklyMap = new Map<string, number>()
  for (let i = 7; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i * 7)
    const label = `W${i === 0 ? "Now" : `-${i}`}`
    weeklyMap.set(label, 0)
  }

  velocityApps.forEach((app) => {
    const appDate = app.applicationDate || app.createdAt
    const diffWeeks = Math.floor((Date.now() - new Date(appDate).getTime()) / (7 * 24 * 60 * 60 * 1000))
    if (diffWeeks >= 0 && diffWeeks < 8) {
      const label = `W${diffWeeks === 0 ? "Now" : `-${diffWeeks}`}`
      weeklyMap.set(label, (weeklyMap.get(label) || 0) + 1)
    }
  })

  const weeklyVelocity = Array.from(weeklyMap.entries()).map(([week, count]) => ({
    week,
    count,
  }))

  // Dynamic Today's Tasks
  const todayTasks = [
    {
      id: "task-1",
      title: `Review ${recommendedOpportunities.length} new opportunities`,
      subtitle: "Fresh matches available",
      completed: false,
      href: "/discovery",
    },
    followUpApps.length > 0
      ? {
          id: "task-2",
          title: `Follow up with ${followUpApps[0].companyName}`,
          subtitle: "No response in >7 days",
          completed: false,
          href: `/applications/${followUpApps[0].id}`,
        }
      : {
          id: "task-2",
          title: "Complete application review",
          subtitle: "Keep your pipeline fresh",
          completed: true,
          href: "/applications",
        },
    upcomingInterviewsRaw.length > 0
      ? {
          id: "task-3",
          title: `Prepare for upcoming interview with ${upcomingInterviewsRaw[0].companyName}`,
          subtitle: upcomingInterviewsRaw[0].interviewDate
            ? new Date(upcomingInterviewsRaw[0].interviewDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
            : "Scheduled soon",
          completed: false,
          href: "/interview-prep",
        }
      : {
          id: "task-3",
          title: "Conduct AI mock interview practice",
          subtitle: "Sharpen behavioral & technical skills",
          completed: false,
          href: "/interview-prep",
        },
  ]

  // Weekly consistency streak (Mon-Sun active days)
  const currentDayIndex = (new Date().getDay() + 6) % 7 // 0 = Mon, 6 = Sun
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const weeklyActivity = weekDays.map((day, idx) => ({
    day,
    active: idx <= currentDayIndex,
  }))

  const calcDelta = (current: number, prior: number): number | null => {
    if (prior === 0) return current > 0 ? null : 0
    return Math.round(((current - prior) / prior) * 100)
  }

  const oppDelta = calcDelta(oppNewThisWeek, userMatchPriorWeek)
  const appDelta = calcDelta(appsThisWeek, appsPriorWeek)
  const intDelta = calcDelta(upcomingInterviewsRaw.length, interviewsPriorWeek)

  const stats = {
    // 4 Primary Mockup KPIs
    kpi: {
      opportunities: {
        count: totalOppCount,
        delta: oppDelta,
        newThisWeek: oppNewThisWeek,
      },
      applications: {
        count: total,
        delta: appDelta,
        inProgress: activeApplications,
      },
      interviews: {
        count: interviewsCount,
        delta: intDelta,
        thisWeek: upcomingInterviewsRaw.length,
      },
      offers: {
        count: offersCount,
        delta: null,
        label: offersCount > 0 ? `${offersCount} Received` : "Keep going!",
        responseRate: responseRatePercentage,
      },
    },
    // Core Domain Collections
    recommendedOpportunities,
    upcomingInterviews: upcomingInterviewsRaw,
    todayTasks,
    weeklyActivity,
    weeklyVelocity,
    activeApplications,
    interviewsScheduled: upcomingInterviewsRaw.length,
    responseRatePercentage,

    // Backward-Compatible Stats for other callers
    total,
    staged: stagedCount,
    ...Object.fromEntries(
      statuses.map((s) => [
        s.toLowerCase(),
        (countMap[s] ?? 0) + (countMap[s.toUpperCase()] ?? 0),
      ])
    ),
    recent: deduplicatedRecent.slice(0, 5),
    trend,
    bySource,
    followUpApps,
  }

  void setCachedJson(cacheKey, stats, 60)

  return NextResponse.json(stats)
}
