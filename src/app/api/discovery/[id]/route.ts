/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = "force-dynamic"

import { NextRequest } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { ResponseUtil } from "@/lib/api-response"
import { checkDistributedRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { parseMatchRationale, getEmploymentType, formatSalaryClean } from "@/components/discovery/types"
import { getCompanyEnrichment } from "@/lib/discovery/company-enrichment"
import { normalizeCompany, normalizeTitle } from "@/lib/discovery/matching"
import { getCachedJson } from "@/lib/redis"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getInternalUserId()
  if (!userId) {
    return ResponseUtil.unauthorized()
  }

  // Rate limit: 60 reads/min per user
  const rateLimit = await checkDistributedRateLimit(`discovery:detail:${userId}`, 60, 60)
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit)
  }

  const { id } = await params
  if (!id) {
    return ResponseUtil.error("Opportunity ID is required", 400)
  }

  try {
    // 1. Resolve Opportunity via UserJobMatch or CanonicalJob
    const match = await withDbRetry(() =>
      prisma.userJobMatch.findFirst({
        where: {
          userId,
          OR: [{ id }, { jobId: id }],
        },
        include: { job: true },
      })
    )

    let canonical = null
    if (!match) {
      canonical = await withDbRetry(() =>
        prisma.canonicalJob.findUnique({
          where: { id },
        })
      )
    }

    const job = match?.job || canonical
    if (!job) {
      return ResponseUtil.error("Opportunity not found", 404)
    }

    // 2. Resolve existing Application record in Tracker if already staged or applied
    const normKey = `${normalizeCompany(job.company)}:${normalizeTitle(job.title)}`
    const userApplications = await withDbRetry(() =>
      prisma.application.findMany({
        where: { userId },
        select: { id: true, companyName: true, jobTitle: true, status: true },
      })
    )

    const existingApp = userApplications.find(
      (app) => `${normalizeCompany(app.companyName)}:${normalizeTitle(app.jobTitle)}` === normKey
    )

    // 3. Check user's Redis discovery feed cache for authentic score & metadata
    const cachedFeed = await getCachedJson<{ opportunities?: any[] }>(`discovery:feed:v1:${userId}`).catch(() => null)
    const cachedOpp = cachedFeed?.opportunities?.find(
      (o: any) =>
        o.id === id ||
        o.jobId === id ||
        o.id === job.id ||
        o.jobId === job.id ||
        (o.url && job.url && o.url === job.url) ||
        (`${normalizeCompany(o.company)}:${normalizeTitle(o.title)}` === normKey)
    )

    // 4. Resolve authentic fitScore, matchRationale, and scoreBreakdown
    let fitScore = match?.fitScore ?? cachedOpp?.fitScore ?? null
    let matchRationale = match?.matchRationale || cachedOpp?.matchRationale || null
    let scoreBreakdown: { skills?: number; role?: number; location?: number; seniority?: number } | null =
      cachedOpp?.scoreBreakdown ?? null

    if (fitScore == null) {
      // Dynamic fallback scoring against candidate profile if neither DB nor Redis has the match
      const profile = await withDbRetry(() => prisma.userProfile.findUnique({ where: { userId } }))
      const userSkills = ((profile as any)?.skills as string[]) || []
      const targetRoles = profile?.targetRoles || ["Software Engineer"]
      const titleMatch = targetRoles.some((r) => job.title.toLowerCase().includes(r.toLowerCase())) ? 22 : 16
      const tagMatches = (job.tags || []).filter((t: string) =>
        userSkills.some((s) => s.toLowerCase() === t.toLowerCase())
      ).length
      const skillPts = Math.min(38, 18 + tagMatches * 4)
      const locPts = job.isRemote ? 18 : 14
      const expPts = 10
      fitScore = Math.min(98, Math.max(45, titleMatch + skillPts + locPts + expPts))
      scoreBreakdown = { skills: skillPts, role: titleMatch, location: locPts, seniority: expPts }
      matchRationale = `📊 Fit Breakdown: ${fitScore}% (Skills: ${skillPts}/40 • Role: ${titleMatch}/25 • Location: ${locPts}/20 • Seniority: ${expPts}/15)`
    }

    const parsedRationale = parseMatchRationale(matchRationale || "")

    // Calculate sub-scores (0-100 scale)
    const extractNum = (fractionStr?: string): number | null => {
      if (!fractionStr) return null
      const parts = fractionStr.split("/")
      if (parts.length === 2) {
        const num = parseFloat(parts[0])
        const den = parseFloat(parts[1])
        if (!isNaN(num) && !isNaN(den) && den > 0) {
          return Math.round((num / den) * 100)
        }
      }
      return null
    }

    let skillsScore: number
    let experienceScore: number
    let roleScore: number
    let companyScore: number

    if (scoreBreakdown) {
      skillsScore = Math.min(100, Math.round(((scoreBreakdown.skills ?? 25) / 40) * 100))
      roleScore = Math.min(100, Math.round(((scoreBreakdown.role ?? 20) / 25) * 100))
      experienceScore = Math.min(100, Math.round(((scoreBreakdown.seniority ?? 10) / 15) * 100))
      companyScore = Math.min(100, Math.round(((scoreBreakdown.location ?? 15) / 20) * 100))
    } else if (parsedRationale.skillsScore || parsedRationale.seniorityScore || parsedRationale.roleScore) {
      skillsScore = extractNum(parsedRationale.skillsScore) ?? fitScore
      roleScore = extractNum(parsedRationale.roleScore) ?? fitScore
      experienceScore = extractNum(parsedRationale.seniorityScore) ?? fitScore
      companyScore = extractNum(parsedRationale.locationScore) ?? fitScore
    } else {
      skillsScore = fitScore
      roleScore = fitScore
      experienceScore = fitScore
      companyScore = fitScore
    }

    // 5. Company Enrichment
    const companyEnrichment = getCompanyEnrichment(job.company, {
      description: job.description || undefined,
      location: job.location,
      url: job.url,
      tags: job.tags || [],
    })

    // 6. Query 3 Similar Opportunities
    const similarJobsRaw = await withDbRetry(() =>
      prisma.canonicalJob.findMany({
        where: {
          id: { not: job.id },
          isExpired: false,
          OR: [
            { tags: { hasSome: job.tags.length > 0 ? job.tags.slice(0, 3) : ["React", "Product"] } },
            { isRemote: job.isRemote },
          ],
        },
        take: 3,
        orderBy: { createdAt: "desc" },
      })
    )

    // Check saved status & authentic scores for similar jobs
    const similarIds = similarJobsRaw.map((j) => j.id)
    const similarMatches = await withDbRetry(() =>
      prisma.userJobMatch.findMany({
        where: {
          userId,
          jobId: { in: similarIds },
        },
        select: { jobId: true, fitScore: true, isSaved: true },
      })
    )
    const similarMatchMap = new Map(similarMatches.map((m) => [m.jobId, m]))

    const similarOpportunities = similarJobsRaw.map((simJob, idx) => {
      const simMatch = similarMatchMap.get(simJob.id)
      const simCached = cachedFeed?.opportunities?.find(
        (o: any) =>
          o.id === simJob.id ||
          o.jobId === simJob.id ||
          (`${normalizeCompany(o.company)}:${normalizeTitle(o.title)}` ===
            `${normalizeCompany(simJob.company)}:${normalizeTitle(simJob.title)}`)
      )
      const simScore =
        simMatch?.fitScore ?? simCached?.fitScore ?? Math.min(88, Math.max(50, fitScore - (idx + 1) * 3))
      return {
        id: simJob.id,
        jobId: simJob.id,
        title: simJob.title,
        company: simJob.company,
        location: simJob.location,
        isRemote: simJob.isRemote,
        url: simJob.url,
        fitScore: simScore,
        tags: simJob.tags.slice(0, 3),
        isSaved: simMatch?.isSaved ?? false,
      }
    })

    const employmentTypeInfo = getEmploymentType({
      title: job.title,
      tags: job.tags,
      descriptionSnippet: job.description || "",
      employmentType: (job.employmentType as any) || "full-time",
    })

    const rawSalary =
      job.salary ||
      cachedOpp?.salary ||
      (job.salaryMin && job.salaryMax ? `$${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}` : null)
    const cleanSalary =
      formatSalaryClean(rawSalary) ||
      (job.salaryMin && job.salaryMax ? `$${Math.round(job.salaryMin / 1000)}K - $${Math.round(job.salaryMax / 1000)}K` : null)

    return ResponseUtil.success({
      opportunity: {
        id: job.id,
        matchId: match?.id ?? null,
        title: job.title,
        company: job.company,
        location: job.location,
        isRemote: job.isRemote,
        url: job.url,
        sourceBoard: job.sourceBoard,
        tags: job.tags || [],
        salary: rawSalary || "Competitive / Not disclosed",
        cleanSalary: cleanSalary || "Competitive",
        description: job.description || "",
        postedAt: (job.postedAt || job.createdAt).toISOString(),
        visaSponsorship: job.visaSponsorship,
        employmentType: employmentTypeInfo.label,
        fitScore,
        matchRationale,
        isSaved: match?.isSaved ?? false,
        isStaged: existingApp?.status === "Staged" || match?.status === "STAGED",
        appliedStatus: existingApp?.status || null,
        applicationId: existingApp?.id || null,
        scores: {
          overall: fitScore,
          skillsMatch: skillsScore,
          experienceMatch: experienceScore,
          roleFit: roleScore,
          companyFit: companyScore,
        },
        rationaleParsed: parsedRationale,
        companyEnrichment,
      },
      similarOpportunities,
    })
  } catch (error: any) {
    console.error("[Discovery Detail API] GET Error:", error)
    return ResponseUtil.error(error?.message || "Internal server error", 500)
  }
}
