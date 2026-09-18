import { prisma, withDbRetry } from "@/lib/prisma"
import { UnifiedRawJob } from "./types"
import { fetchLinkedInGuestJobs } from "./scrapers"
import {
  isValidJobPostingUrl,
  isLegitimateTechDevRole,
  isSeniorOrLeadRole,
  normalizeJobFingerprint,
  detectJobWorkMode,
} from "./matching"
import { generateBatchJobEmbeddings } from "./embedding"

export interface CandidateSearchProfile {
  skills?: string[]
  targetRoles?: string[]
  experienceLevel?: string
  location?: string
  workPreference?: string
}

export interface LinkedInQueryTarget {
  query: string
  location: string
}

/**
 * Automatically synthesizes targeted LinkedIn search queries derived from candidate profile
 * Operates autonomously without requiring the user to type manual search strings.
 */
export function synthesizeLinkedInSearchQueries(profile: CandidateSearchProfile): LinkedInQueryTarget[] {
  const isJunior =
    profile.experienceLevel === "junior" ||
    profile.experienceLevel === "entry" ||
    profile.experienceLevel === "fresher"

  const userLocation = profile.location || "Bangladesh"
  const isCandidateInBD =
    /bangladesh|bd|dhaka|rajshahi|sylhet|chittagong|chattogram/i.test(userLocation)

  // Primary skill tokens (focus on top web frameworks)
  const candidateSkills = (profile.skills || []).map((s) => s.toLowerCase())
  const topFramework = candidateSkills.find((s) => s.includes("react")) ? "react" : "frontend"
  const hasNextJs = candidateSkills.some((s) => s.includes("next"))
  const hasNode = candidateSkills.some((s) => s.includes("node"))

  const targets: LinkedInQueryTarget[] = []

  // 1. Regional Bangladesh targets (if candidate is in BD)
  if (isCandidateInBD) {
    if (isJunior) {
      targets.push({ query: `junior ${topFramework} developer`, location: "Bangladesh" })
      targets.push({ query: `intern software engineer`, location: "Bangladesh" })
      targets.push({ query: `trainee software engineer`, location: "Bangladesh" })
    }
    targets.push({ query: `frontend developer`, location: "Bangladesh" })
    if (hasNextJs) {
      targets.push({ query: `next.js developer`, location: "Bangladesh" })
    }
    if (hasNode) {
      targets.push({ query: `full stack developer`, location: "Bangladesh" })
    }
  }

  // 2. Global Remote targets (for remote-first or flexible candidates)
  if (isJunior) {
    targets.push({ query: `junior ${topFramework} developer`, location: "Remote" })
    targets.push({ query: `junior frontend developer`, location: "Remote" })
    targets.push({ query: `software engineer intern`, location: "Remote" })
  } else {
    targets.push({ query: `${topFramework} developer`, location: "Remote" })
    targets.push({ query: `frontend engineer`, location: "Remote" })
  }

  // Deduplicate query pairs
  const seen = new Set<string>()
  return targets.filter((t) => {
    const key = `${t.query.toLowerCase()}|${t.location.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Harvests authentic LinkedIn developer opportunities using system-generated queries
 */
export async function harvestLinkedInOpportunities(
  profile: CandidateSearchProfile,
  options: { maxQueries?: number } = {}
): Promise<UnifiedRawJob[]> {
  const queryTargets = synthesizeLinkedInSearchQueries(profile)
  const targetsToExecute = queryTargets.slice(0, options.maxQueries || 5)

  const fetchResults = await Promise.allSettled(
    targetsToExecute.map((t) => fetchLinkedInGuestJobs(t.query, t.location))
  )

  const rawJobs: UnifiedRawJob[] = []
  for (const res of fetchResults) {
    if (res.status === "fulfilled" && Array.isArray(res.value)) {
      rawJobs.push(...res.value)
    }
  }

  const isJunior =
    profile.experienceLevel === "junior" ||
    profile.experienceLevel === "entry" ||
    profile.experienceLevel === "fresher"

  const uniqueJobsMap = new Map<string, UnifiedRawJob>()

  for (const job of rawJobs) {
    if (!job || !job.url || !job.title) continue
    if (!isValidJobPostingUrl(job.url)) continue
    if (!isLegitimateTechDevRole(job.title)) continue

    // Strict junior disqualifier
    if (isJunior && isSeniorOrLeadRole(job.title, job.description)) {
      continue
    }

    if (!uniqueJobsMap.has(job.url)) {
      uniqueJobsMap.set(job.url, {
        ...job,
        sourceBoard: "linkedin_post",
      })
    }
  }

  return Array.from(uniqueJobsMap.values())
}

/**
 * Ingests harvested LinkedIn developer jobs directly into CanonicalJob catalog
 * with Google Gemini 1536-dim vector embeddings
 */
export async function ingestLinkedInOpportunitiesToCatalog(
  jobs: UnifiedRawJob[]
): Promise<{ total: number; upserted: number }> {
  if (!jobs || jobs.length === 0) return { total: 0, upserted: 0 }

  let upserted = 0
  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  // Batch-generate 1536-dim vector embeddings for all harvested jobs in a single API roundtrip
  const embeddings = await generateBatchJobEmbeddings(
    jobs.map((j) => ({
      title: j.title,
      company: j.company,
      description: j.description || "",
      tags: j.tags,
    }))
  )

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i]
    const embedding = embeddings[i]

    try {
      const workMode = detectJobWorkMode(job)
      const isRemote = workMode === "remote"
      const fingerprint = normalizeJobFingerprint(job.company, job.title, job.location, isRemote)

      const upsertedJob = await withDbRetry(() =>
        prisma.canonicalJob.upsert({
          where: { fingerprint },
          create: {
            fingerprint,
            sourceBoard: "linkedin_post",
            title: job.title,
            company: job.company,
            location: job.location,
            isRemote,
            url: job.url,
            salary: job.salaryText || null,
            salaryMin: job.salaryMin || null,
            salaryMax: job.salaryMax || null,
            tags: job.tags || [],
            description: job.description || null,
            postedAt: job.postedAt ? new Date(job.postedAt) : now,
            expiresAt: thirtyDaysFromNow,
            isExpired: false,
            visaSponsorship: job.visaSponsorship || "unknown",
            employmentType: job.employmentType || "full-time",
          },
          update: {
            title: job.title,
            company: job.company,
            location: job.location,
            url: job.url,
            tags: job.tags || [],
            isExpired: false,
            updatedAt: now,
          },
        })
      )

      if (upsertedJob && embedding && embedding.length === 1536) {
        await prisma.$executeRawUnsafe(
          `UPDATE "CanonicalJob" SET embedding = $1::vector WHERE id = $2`,
          `[${embedding.join(",")}]`,
          upsertedJob.id
        )
      }

      upserted++
    } catch (err) {
      console.warn(`[LinkedInHarvester] Failed to upsert job ${job.title} (${job.company}):`, err)
    }
  }

  return { total: jobs.length, upserted }
}
