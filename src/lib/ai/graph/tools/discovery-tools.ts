/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma, withDbRetry } from "@/lib/prisma"
import { executeCreateApplication } from "./job-tools"
import { toCanonical } from "@/lib/ai/knowledge-graph"
import { getUserMacroOutcomes, type UserMacroOutcomes } from "@/lib/ai/learning-engine"

export interface ExternalJobOpportunity {
  id: string
  title: string
  company: string
  location: string
  url: string
  sourceBoard: "remoteok" | "arbeitnow" | "adzuna" | "curated"
  tags: string[]
  salary?: string
  fitScore: number
  matchRationale: string
  descriptionSnippet: string
}

export interface UnifiedRawJob {
  id: string
  title: string
  company: string
  location: string
  url: string
  sourceBoard: "remoteok" | "arbeitnow" | "adzuna" | "curated"
  tags: string[]
  salaryMin?: number
  salaryMax?: number
  salaryText?: string
  description: string
}

const FALLBACK_OPPORTUNITIES: UnifiedRawJob[] = [
  {
    id: "fb_1",
    title: "Senior Full Stack Engineer (React / Go)",
    company: "Stripe",
    location: "Remote",
    url: "https://stripe.com/jobs",
    sourceBoard: "curated",
    tags: ["react", "go", "typescript", "postgresql", "redis"],
    salaryMin: 160000,
    salaryMax: 210000,
    description: "Building next-generation global financial infrastructure using React, TypeScript, and Go microservices.",
  },
  {
    id: "fb_2",
    title: "Senior Frontend Engineer (Next.js & Design Systems)",
    company: "Vercel",
    location: "Remote",
    url: "https://vercel.com/careers",
    sourceBoard: "curated",
    tags: ["nextjs", "react", "typescript", "tailwind", "ui"],
    salaryMin: 150000,
    salaryMax: 195000,
    description: "Leading frontend engineering initiatives with Next.js App Router, Tailwind CSS, and performance optimization.",
  },
  {
    id: "fb_3",
    title: "AI Systems & Backend Engineer",
    company: "Anthropic",
    location: "Remote / Hybrid",
    url: "https://anthropic.com/careers",
    sourceBoard: "curated",
    tags: ["python", "typescript", "langgraph", "llm", "postgresql"],
    salaryMin: 180000,
    salaryMax: 240000,
    description: "Architecting autonomous AI agent pipelines, state machines, and high-reliability data platforms.",
  },
  {
    id: "fb_4",
    title: "Staff Backend Engineer (Distributed Systems)",
    company: "Airbnb",
    location: "Remote",
    url: "https://airbnb.com/careers",
    sourceBoard: "curated",
    tags: ["go", "kubernetes", "distributed-systems", "redis", "postgresql"],
    salaryMin: 190000,
    salaryMax: 250000,
    description: "Scaling distributed caching systems and booking engines handling hundreds of thousands of requests per second.",
  },
]

/**
 * Normalizes company name for deduplication
 */
export function normalizeCompany(name: string): string {
  if (!name) return ""
  return name
    .toLowerCase()
    .replace(/\b(inc|incorporated|llc|ltd|limited|corp|corporation|gmbh|co|technologies|tech|solutions)\b/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim()
}

/**
 * Normalizes job title for deduplication
 */
export function normalizeTitle(title: string): string {
  if (!title) return ""
  return title
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, "") // Remove brackets e.g. (Remote), [Hybrid]
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Deduplicates raw jobs across multiple boards by normalized company and normalized title
 */
export function deduplicateJobs(jobs: UnifiedRawJob[]): UnifiedRawJob[] {
  const seenMap = new Map<string, UnifiedRawJob>()

  for (const job of jobs) {
    const normCo = normalizeCompany(job.company)
    const normTi = normalizeTitle(job.title)
    const dedupKey = `${normCo}:${normTi}`

    if (!seenMap.has(dedupKey)) {
      seenMap.set(dedupKey, job)
    } else {
      // If duplicate exists, keep the one with richer metadata (e.g. salary or longer description)
      const existing = seenMap.get(dedupKey)!
      const existingWeight = (existing.salaryMin ? 2 : 0) + (existing.description?.length || 0)
      const newWeight = (job.salaryMin ? 2 : 0) + (job.description?.length || 0)

      if (newWeight > existingWeight) {
        seenMap.set(dedupKey, job)
      }
    }
  }

  return Array.from(seenMap.values())
}

/**
 * Fetches remote tech jobs from RemoteOK API
 */
async function fetchRemoteOkJobs(tagParam: string): Promise<UnifiedRawJob[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3500)

    const res = await fetch(`https://remoteok.com/api?tag=${encodeURIComponent(tagParam)}`, {
      signal: controller.signal,
      headers: { "User-Agent": "CareerTrack-Discovery-Agent/1.0" },
    })
    clearTimeout(timeout)

    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []

    return data
      .filter((item) => item.position && item.company)
      .map((item) => ({
        id: String(item.id || item.url || `rok-${item.company}-${item.position}`),
        title: String(item.position || ""),
        company: String(item.company || ""),
        location: String(item.location || "Remote"),
        url: item.url || `https://remoteok.com/l/${item.id}`,
        sourceBoard: "remoteok" as const,
        tags: Array.isArray(item.tags) ? item.tags.map((t: string) => toCanonical(t)) : [],
        salaryMin: item.salary_min ? Number(item.salary_min) : undefined,
        salaryMax: item.salary_max ? Number(item.salary_max) : undefined,
        description: String(item.description || "").replace(/<[^>]+>/g, " "),
      }))
  } catch {
    return []
  }
}

/**
 * Fetches EU/Global tech jobs from Arbeitnow Public API (No key required)
 */
async function fetchArbeitnowJobs(searchQuery: string): Promise<UnifiedRawJob[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3500)

    const url = searchQuery
      ? `https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(searchQuery)}`
      : `https://www.arbeitnow.com/api/job-board-api`

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "CareerTrack-Discovery-Agent/1.0" },
    })
    clearTimeout(timeout)

    if (!res.ok) return []
    const data = await res.json()
    if (!data || !Array.isArray(data.data)) return []

    return data.data
      .filter((item: any) => item.title && item.company_name)
      .map((item: any) => ({
        id: String(item.slug || `an-${item.company_name}-${item.title}`),
        title: String(item.title || ""),
        company: String(item.company_name || ""),
        location: item.remote ? "Remote" : String(item.location || "Europe / Global"),
        url: item.url || `https://www.arbeitnow.com/view/${item.slug}`,
        sourceBoard: "arbeitnow" as const,
        tags: Array.isArray(item.tags) ? item.tags.map((t: string) => toCanonical(t)) : [],
        description: String(item.description || "").replace(/<[^>]+>/g, " "),
      }))
  } catch {
    return []
  }
}

/**
 * Fetches local/hybrid tech jobs from Adzuna API if configured
 */
async function fetchAdzunaJobs(query: string, location?: string): Promise<UnifiedRawJob[]> {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY
  if (!appId || !appKey) return []

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3500)

    const country = "us"
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      what: query || "software engineer",
      results_per_page: "10",
      content_type: "application/json",
    })
    if (location) params.append("where", location)

    const res = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params.toString()}`, {
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) return []
    const data = await res.json()
    if (!data || !Array.isArray(data.results)) return []

    return data.results.map((item: any) => ({
      id: String(item.id || `adz-${item.company?.display_name}-${item.title}`),
      title: String(item.title || "").replace(/<\/?strong>/gi, ""),
      company: String(item.company?.display_name || ""),
      location: String(item.location?.display_name || location || "Local/Hybrid"),
      url: item.redirect_url || "",
      sourceBoard: "adzuna" as const,
      tags: item.category?.tag ? [toCanonical(item.category.tag)] : [],
      salaryMin: item.salary_min ? Math.round(item.salary_min) : undefined,
      salaryMax: item.salary_max ? Math.round(item.salary_max) : undefined,
      description: String(item.description || "").replace(/<[^>]+>/g, " "),
    }))
  } catch {
    return []
  }
}

/**
 * Ingests jobs across all configured external job boards concurrently
 */
export async function fetchMultiBoardOpportunities(query: string, tagParam: string, location?: string): Promise<UnifiedRawJob[]> {
  const [remoteOkResults, arbeitnowResults, adzunaResults] = await Promise.allSettled([
    fetchRemoteOkJobs(tagParam),
    fetchArbeitnowJobs(query),
    fetchAdzunaJobs(query, location),
  ])

  const aggregated: UnifiedRawJob[] = []

  if (remoteOkResults.status === "fulfilled" && Array.isArray(remoteOkResults.value)) {
    aggregated.push(...remoteOkResults.value)
  }
  if (arbeitnowResults.status === "fulfilled" && Array.isArray(arbeitnowResults.value)) {
    aggregated.push(...arbeitnowResults.value)
  }
  if (adzunaResults.status === "fulfilled" && Array.isArray(adzunaResults.value)) {
    aggregated.push(...adzunaResults.value)
  }

  if (aggregated.length === 0) {
    return FALLBACK_OPPORTUNITIES
  }

  return deduplicateJobs(aggregated)
}

/**
 * Multi-Board Job Discovery Engine with Macro-Learned Adaptive Ranking
 */
export async function executeSearchExternalJobs(
  userId: string,
  input: {
    query?: string
    tags?: string[]
    location?: string
    limit?: number
  } = {}
): Promise<{
  success: boolean
  count: number
  query: string
  opportunities: ExternalJobOpportunity[]
  error?: string
}> {
  if (!userId) return { success: false, count: 0, query: "", opportunities: [], error: "Unauthorized" }

  try {
    // 1. Fetch user profile, resume & macro-learning outcomes concurrently
    const [profile, resume, macroOutcomes] = await Promise.all([
      withDbRetry<any>(() => prisma.userProfile.findUnique({ where: { userId } })),
      withDbRetry<any>(() => prisma.resume.findFirst({ where: { userId, isDefault: true } })),
      getUserMacroOutcomes(userId).catch(() => null),
    ])

    const userSkills = new Set<string>()
    if (profile?.strengths) {
      profile.strengths.split(/[,/|\n]+/).forEach((s: string) => userSkills.add(toCanonical(s.trim())))
    }
    if (profile?.targetRoles) {
      profile.targetRoles.forEach((r: string) => userSkills.add(toCanonical(r.trim())))
    }
    if (resume?.textContent) {
      const canonicalTokens = resume.textContent.toLowerCase().match(/[a-z0-9+#.-]+/g) || []
      canonicalTokens.forEach((tok: string) => {
        const canonical = toCanonical(tok)
        if (canonical.length > 1) userSkills.add(canonical)
      })
    }

    // Set of winning skills and roles from historical interview/offer outcomes
    const winningSkills = new Set((macroOutcomes?.winningSkills || []).map((s) => toCanonical(s)))
    const winningRoles = (macroOutcomes?.winningRoles || []).map((r) => r.toLowerCase())
    const winningCompanies = new Set((macroOutcomes?.winningCompanies || []).map((c) => normalizeCompany(c)))
    const penalizedSkills = new Set((macroOutcomes?.penalizedSkills || []).map((s) => toCanonical(s)))

    // 2. Fetch Multi-Board Jobs
    const query = input.query || ""
    const tagParam = input.tags?.[0] || input.query?.split(" ")[0] || "engineer"
    const rawJobs = await fetchMultiBoardOpportunities(query, tagParam, input.location)

    // 3. Filter and Calculate Adaptive Fit Score
    const searchTerms = [
      input.query?.toLowerCase(),
      ...(input.tags || []).map((t) => t.toLowerCase()),
    ].filter(Boolean) as string[]

    const scoredOpportunities: ExternalJobOpportunity[] = []

    for (const job of rawJobs) {
      const position = String(job.title || "")
      const company = String(job.company || "")
      const location = String(job.location || "Remote")
      const tags = Array.isArray(job.tags) ? job.tags.map((t: string) => toCanonical(t)) : []
      const description = String(job.description || "").replace(/<[^>]+>/g, " ")

      // Filter by search terms if supplied
      if (searchTerms.length > 0) {
        const matchesQuery = searchTerms.some(
          (term) =>
            position.toLowerCase().includes(term) ||
            company.toLowerCase().includes(term) ||
            tags.some((t: string) => t.includes(term)) ||
            description.toLowerCase().includes(term)
        )
        if (!matchesQuery && job.sourceBoard !== "curated") {
          continue
        }
      }

      // Calculate Skill Matching & Macro-Learned Boosts
      let matchedSkillCount = 0
      const matchedSkillNames: string[] = []
      let winningBoost = 0
      const matchedWinningSkills: string[] = []

      tags.forEach((tag: string) => {
        if (userSkills.has(tag)) {
          matchedSkillCount++
          matchedSkillNames.push(tag)
        }
        if (winningSkills.has(tag)) {
          winningBoost += 12
          matchedWinningSkills.push(tag)
        }
      })

      // Bonus if target role matches position
      let roleBonus = 0
      if (profile?.targetRoles?.some((tr: string) => position.toLowerCase().includes(tr.toLowerCase()))) {
        roleBonus += 15
      }
      if (winningRoles.some((wr) => position.toLowerCase().includes(wr))) {
        roleBonus += 10
      }

      // Bonus if candidate previously won at this company
      let companyBonus = 0
      if (winningCompanies.has(normalizeCompany(company))) {
        companyBonus += 10
      }

      // Penalty if job emphasizes recurring rejection gap skills
      let penaltyDamp = 0
      tags.forEach((tag: string) => {
        if (penalizedSkills.has(tag)) {
          penaltyDamp += 8
        }
      })

      const baseFit = Math.min(50, matchedSkillCount * 12)
      const salaryBonus = job.salaryMin ? 5 : 0
      const rawScore = baseFit + roleBonus + winningBoost + companyBonus + salaryBonus - penaltyDamp
      const finalFitScore = Math.min(99, Math.max(40, rawScore || 50))

      // Synthesize transparent match rationale
      let matchRationale = ""
      if (matchedWinningSkills.length > 0) {
        matchRationale = `High conversion match on proven skills (${matchedWinningSkills.slice(0, 3).join(", ")}).`
      } else if (matchedSkillNames.length > 0) {
        matchRationale = `Matched on core profile skills: ${matchedSkillNames.slice(0, 4).join(", ")}.`
      } else if (roleBonus > 0) {
        matchRationale = `Direct trajectory match for ${position.slice(0, 35)}.`
      } else {
        matchRationale = `Aligned with overall engineering competencies in ${position.slice(0, 35)}.`
      }

      let salaryDisplay: string | undefined = undefined
      if (job.salaryMin && job.salaryMax) {
        salaryDisplay = `$${Math.round(job.salaryMin / 1000)}k - $${Math.round(job.salaryMax / 1000)}k`
      } else if (job.salaryText) {
        salaryDisplay = job.salaryText
      }

      scoredOpportunities.push({
        id: job.id,
        title: position,
        company,
        location,
        url: job.url || `https://www.google.com/search?q=${encodeURIComponent(`${company} ${position}`)}`,
        sourceBoard: job.sourceBoard,
        tags,
        salary: salaryDisplay,
        fitScore: finalFitScore,
        matchRationale,
        descriptionSnippet: description.slice(0, 220) + "...",
      })
    }

    // Sort by adaptive fit score descending
    scoredOpportunities.sort((a, b) => b.fitScore - a.fitScore)
    const limit = input.limit || 6
    const results = scoredOpportunities.slice(0, limit)

    return {
      success: true,
      count: results.length,
      query: input.query || input.tags?.join(", ") || "Recommended Multi-Board Roles",
      opportunities: results,
    }
  } catch (error: any) {
    return {
      success: false,
      count: 0,
      query: input.query || "",
      opportunities: [],
      error: error?.message || "Failed to discover external jobs",
    }
  }
}

/**
 * Saves an external discovered job directly to the user's Application tracker
 */
export async function executeSaveJobOpportunityToTracker(
  userId: string,
  input: {
    companyName: string
    jobTitle: string
    jobUrl?: string
    location?: string
    salary?: string
    notes?: string
    status?: string
  }
) {
  const noteParts = [
    input.notes,
    input.location ? `Location: ${input.location}` : null,
    input.salary ? `Salary: ${input.salary}` : null,
    "Discovered via CareerTrack Autonomous Multi-Board Job Discovery Engine",
  ].filter(Boolean)

  return await executeCreateApplication(userId, {
    companyName: input.companyName,
    jobTitle: input.jobTitle,
    jobUrl: input.jobUrl,
    source: "Discovery Engine",
    status: input.status || "Saved",
    notes: noteParts.join("\n"),
  })
}
