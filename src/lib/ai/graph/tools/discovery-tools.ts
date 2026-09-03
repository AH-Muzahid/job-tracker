/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma, withDbRetry } from "@/lib/prisma"
import { executeCreateApplication } from "./job-tools"
import { toCanonical } from "@/lib/ai/knowledge-graph"
import { getUserMacroOutcomes } from "@/lib/ai/learning-engine"

export interface ExternalJobOpportunity {
  id: string
  title: string
  company: string
  location: string
  url: string
  sourceBoard: "remoteok" | "arbeitnow" | "adzuna" | "curated" | "linkedin"
  tags: string[]
  salary?: string
  fitScore: number
  matchRationale: string
  descriptionSnippet: string
  batchSlot?: "just-in" | "earlier-today" | "yesterday"
  batchLabel?: string
  batchId?: string
  publishedAt?: string
  isSaved?: boolean
  appliedStatus?: string | null
  applicationId?: string | null
}

export interface UnifiedRawJob {
  id: string
  title: string
  company: string
  location: string
  url: string
  sourceBoard: "remoteok" | "arbeitnow" | "adzuna" | "curated" | "linkedin"
  tags: string[]
  salaryMin?: number
  salaryMax?: number
  salaryText?: string
  description: string
}

export const FALLBACK_OPPORTUNITIES: UnifiedRawJob[] = [
  {
    id: "fb_1",
    title: "Senior Full Stack Engineer (React / Go)",
    company: "Stripe",
    location: "Remote",
    url: "https://stripe.com/jobs",
    sourceBoard: "curated",
    tags: ["react", "go", "typescript", "postgresql", "redis", "fullstack", "developer"],
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
    tags: ["nextjs", "react", "typescript", "tailwind", "ui", "frontend", "developer"],
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
    tags: ["python", "typescript", "langgraph", "llm", "postgresql", "backend", "ai", "engineer"],
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
    tags: ["go", "kubernetes", "distributed-systems", "redis", "postgresql", "backend", "engineer"],
    salaryMin: 190000,
    salaryMax: 250000,
    description: "Scaling distributed caching systems and booking engines handling hundreds of thousands of requests per second.",
  },
  {
    id: "fb_5",
    title: "Full Stack Developer (Next.js & Node.js)",
    company: "Supabase",
    location: "Remote (Global)",
    url: "https://supabase.com/careers",
    sourceBoard: "curated",
    tags: ["typescript", "react", "nextjs", "postgresql", "fullstack", "developer"],
    salaryMin: 145000,
    salaryMax: 190000,
    description: "Building open source Firebase alternative tools, realtime Postgres sync, and cloud developer dashboards.",
  },
  {
    id: "fb_6",
    title: "Full Stack Product Engineer",
    company: "Linear",
    location: "Remote",
    url: "https://linear.app/careers",
    sourceBoard: "curated",
    tags: ["react", "typescript", "graphql", "node", "fullstack", "engineer"],
    salaryMin: 165000,
    salaryMax: 215000,
    description: "Crafting world-class, ultra-fast issue tracking and project management software with high attention to UI details.",
  },
  {
    id: "fb_7",
    title: "Senior Python & ML Infrastructure Engineer",
    company: "OpenAI",
    location: "Remote / San Francisco",
    url: "https://openai.com/careers",
    sourceBoard: "curated",
    tags: ["python", "pytorch", "kubernetes", "ai", "backend", "engineer"],
    salaryMin: 200000,
    salaryMax: 290000,
    description: "Developing scalable distributed training and inference platforms powering modern generative AI models.",
  },
  {
    id: "fb_8",
    title: "Lead Frontend Engineer (React / TypeScript)",
    company: "Figma",
    location: "Remote",
    url: "https://figma.com/careers",
    sourceBoard: "curated",
    tags: ["react", "typescript", "webgl", "wasm", "frontend", "ui"],
    salaryMin: 175000,
    salaryMax: 230000,
    description: "Pushing the boundaries of web capabilities with high performance collaborative design canvas and web tooling.",
  },
  {
    id: "fb_li_1",
    title: "Senior Full Stack Software Engineer (React / Node.js)",
    company: "Brain Station 23",
    location: "Dhaka, Bangladesh / Hybrid",
    url: "https://www.linkedin.com/jobs/view/brain-station-23",
    sourceBoard: "linkedin",
    tags: ["react", "node", "typescript", "postgresql", "docker", "fullstack", "developer"],
    salaryMin: 35000,
    salaryMax: 60000,
    description: "Leading enterprise web application development with React, Node.js, and cloud architectures for global fintech and telecom clients.",
  },
  {
    id: "fb_li_2",
    title: "Lead Frontend Engineer (Next.js & TypeScript)",
    company: "ShopUp",
    location: "Dhaka, Bangladesh / Remote",
    url: "https://www.linkedin.com/jobs/view/shopup-frontend",
    sourceBoard: "linkedin",
    tags: ["react", "nextjs", "typescript", "tailwind", "frontend", "engineer"],
    salaryMin: 35000,
    salaryMax: 55000,
    description: "Architecting high-scale B2B commerce platforms, micro-frontends, and responsive merchant dashboards.",
  },
  {
    id: "fb_li_3",
    title: "Backend Engineer (Go & Distributed Systems)",
    company: "bKash",
    location: "Dhaka, Bangladesh",
    url: "https://www.linkedin.com/jobs/view/bkash-backend-engineer",
    sourceBoard: "linkedin",
    tags: ["go", "kubernetes", "kafka", "postgresql", "redis", "backend", "engineer"],
    salaryMin: 40000,
    salaryMax: 65000,
    description: "Building high-throughput mobile financial services infrastructure, real-time ledger settlement, and microservices.",
  },
  {
    id: "fb_li_4",
    title: "Staff Software Engineer (React, Python, Cloud)",
    company: "Optimizely",
    location: "Dhaka, Bangladesh / Hybrid",
    url: "https://www.linkedin.com/jobs/view/optimizely-staff-engineer",
    sourceBoard: "linkedin",
    tags: ["react", "python", "aws", "docker", "microservices", "fullstack", "engineer"],
    salaryMin: 50000,
    salaryMax: 80000,
    description: "Engineering experimentation and digital experience platform features used by Fortune 500 enterprises globally.",
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
 * Detects whether a job is Remote, Hybrid, or On-site from its metadata
 */
export function detectJobWorkMode(job: { location?: string; title?: string; description?: string }): "remote" | "hybrid" | "onsite" {
  const locTitle = `${job.location || ""} ${job.title || ""}`.toLowerCase()
  if (locTitle.includes("hybrid")) return "hybrid"
  if (locTitle.includes("remote") || locTitle.includes("work from anywhere") || locTitle.includes("telecommute") || locTitle.includes("anywhere")) {
    return "remote"
  }

  // Check description with strict boundary keywords
  const desc = (job.description || "").toLowerCase()
  if (desc.includes("hybrid work") || desc.includes("hybrid schedule") || desc.includes("hybrid role")) return "hybrid"
  if (desc.includes("100% remote") || desc.includes("fully remote") || desc.includes("work from home") || desc.includes("remote-first") || desc.includes("remote eligible")) {
    return "remote"
  }
  return "onsite"
}

/**
 * Checks if a job's location matches the user's preferred location (city or country)
 */
export function checkLocationMatch(jobLocation?: string, userLocation?: string): boolean {
  if (!userLocation || !jobLocation) return false
  const userTokens = userLocation.toLowerCase().split(/[,/|\s-]+/).filter((t) => t.length > 2)
  const jobLower = jobLocation.toLowerCase()
  return userTokens.some((token) => jobLower.includes(token))
}

/**
 * Checks if a remote job has restrictive geographic constraints (e.g. US Only, UK Only)
 * that disqualify a candidate living in a different country/region
 */
export function isGeoDisqualified(job: { location?: string; title?: string; description?: string }, userLocation?: string): boolean {
  if (!userLocation) return false
  const userLocLower = userLocation.toLowerCase()
  const text = `${job.location || ""} ${job.title || ""} ${job.description || ""}`.toLowerCase()

  // If candidate is outside US / North America
  const isCandidateOutsideUS = !userLocLower.includes("united states") && !userLocLower.includes("usa") && !userLocLower.includes("us")
  if (isCandidateOutsideUS) {
    if (
      text.includes("us only") ||
      text.includes("u.s. only") ||
      text.includes("must be based in the us") ||
      text.includes("must reside in the us") ||
      text.includes("us citizenship required") ||
      text.includes("us work authorization required") ||
      text.includes("us residents only")
    ) {
      return true
    }
  }

  // If candidate is outside UK / Europe
  const isCandidateOutsideUK = !userLocLower.includes("uk") && !userLocLower.includes("united kingdom") && !userLocLower.includes("london")
  if (isCandidateOutsideUK) {
    if (
      text.includes("uk only") ||
      text.includes("must reside in the uk") ||
      text.includes("right to work in the uk")
    ) {
      return true
    }
  }

  return false
}

/**
 * Maps arbitrary search terms or tags to RemoteOK compatible tag slugs
 */
export function mapToRemoteOkTag(tagOrQuery: string): string {
  const clean = (tagOrQuery || "").toLowerCase().trim()
  if (clean.includes("react")) return "react"
  if (clean.includes("front")) return "frontend"
  if (clean.includes("back")) return "backend"
  if (clean.includes("full") || clean.includes("stack")) return "fullstack"
  if (clean.includes("python")) return "python"
  if (clean.includes("go") || clean.includes("golang")) return "golang"
  if (clean.includes("type") || clean.includes("script") || clean.includes("js")) return "javascript"
  if (clean.includes("next")) return "nextjs"
  if (clean.includes("ai") || clean.includes("ml") || clean.includes("machine")) return "ai"
  if (clean.includes("node")) return "nodejs"
  if (clean.includes("remote")) return "remote"
  if (clean.includes("devops") || clean.includes("cloud")) return "devops"
  return "dev"
}

/**
 * Extracts and expands search tokens including synonyms
 */
export function extractSearchTokens(query?: string, tags?: string[]): string[] {
  const tokens = new Set<string>()
  const rawTerms = [query || "", ...(tags || [])]

  for (const raw of rawTerms) {
    if (!raw.trim()) continue
    const words = raw
      .toLowerCase()
      .replace(/[^a-z0-9+#.-]/g, " ")
      .split(/\s+/)

    for (const w of words) {
      if (w.length <= 1 && w !== "c") continue
      if (["and", "the", "for", "with", "all", "job", "jobs", "in", "of"].includes(w)) continue
      tokens.add(w)

      // Common developer synonyms & variants
      if (w === "developer" || w === "dev") {
        tokens.add("engineer")
        tokens.add("developer")
      }
      if (w === "engineer") {
        tokens.add("developer")
        tokens.add("engineer")
      }
      if (w === "fullstack" || w === "full-stack") {
        tokens.add("full")
        tokens.add("stack")
        tokens.add("fullstack")
      }
      if (w === "full" || w === "stack") {
        tokens.add("fullstack")
        tokens.add("full")
        tokens.add("stack")
      }
      if (w === "frontend" || w === "front-end") {
        tokens.add("frontend")
        tokens.add("react")
        tokens.add("ui")
      }
      if (w === "backend" || w === "back-end") {
        tokens.add("backend")
        tokens.add("node")
        tokens.add("api")
      }
      if (w === "ai" || w === "ml") {
        tokens.add("ai")
        tokens.add("ml")
        tokens.add("llm")
      }
    }
  }

  return Array.from(tokens)
}

/**
 * Fetches remote tech jobs from RemoteOK API
 */
async function fetchRemoteOkJobs(tagParam: string): Promise<UnifiedRawJob[]> {
  try {
    const remoteOkTag = mapToRemoteOkTag(tagParam)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3500)

    const res = await fetch(`https://remoteok.com/api?tag=${encodeURIComponent(remoteOkTag)}`, {
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
 * Fetches live LinkedIn, Indeed & Local/Regional jobs using JSearch API (RapidAPI Aggregator)
 * If RAPIDAPI_KEY is configured, scrapes LinkedIn jobs for local countries (e.g. Bangladesh, US, UK, Remote)
 */
async function fetchLinkedInAndLocalJobs(query: string, location?: string): Promise<UnifiedRawJob[]> {
  const rapidApiKey = process.env.RAPIDAPI_KEY || process.env.JSEARCH_API_KEY
  if (!rapidApiKey) return []

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)

    const searchTarget = location
      ? `${query || "software engineer"} in ${location}`
      : query || "software engineer"

    const params = new URLSearchParams({
      query: searchTarget,
      page: "1",
      num_pages: "1",
    })

    const res = await fetch(`https://jsearch.p.rapidapi.com/search?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        "X-RapidAPI-Key": rapidApiKey,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
    })
    clearTimeout(timeout)

    if (!res.ok) return []
    const data = await res.json()
    if (!data || !Array.isArray(data.data)) return []

    return data.data.map((item: any) => {
      const isRemote = Boolean(item.job_is_remote)
      const city = item.job_city ? String(item.job_city) : ""
      const country = item.job_country ? String(item.job_country) : ""
      const loc = isRemote ? "Remote" : [city, country].filter(Boolean).join(", ") || (location || "Local")

      return {
        id: String(item.job_id || `li-${item.employer_name}-${item.job_title}`),
        title: String(item.job_title || ""),
        company: String(item.employer_name || ""),
        location: loc,
        url: item.job_apply_link || item.job_google_link || "https://www.linkedin.com/jobs",
        sourceBoard: "linkedin" as const,
        tags: Array.isArray(item.job_required_skills)
          ? item.job_required_skills.map((s: string) => toCanonical(s))
          : [],
        salaryMin: item.job_min_salary ? Math.round(item.job_min_salary) : undefined,
        salaryMax: item.job_max_salary ? Math.round(item.job_max_salary) : undefined,
        description: String(item.job_description || "").slice(0, 1000).replace(/<[^>]+>/g, " "),
      }
    })
  } catch {
    return []
  }
}

/**
 * Ingests jobs across all configured external job boards concurrently and merges with curated opportunities
 */
export async function fetchMultiBoardOpportunities(query: string, tagParam: string, location?: string): Promise<UnifiedRawJob[]> {
  const [remoteOkResults, arbeitnowResults, adzunaResults, linkedInResults] = await Promise.allSettled([
    fetchRemoteOkJobs(tagParam),
    fetchArbeitnowJobs(query),
    fetchAdzunaJobs(query, location),
    fetchLinkedInAndLocalJobs(query, location),
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
  if (linkedInResults.status === "fulfilled" && Array.isArray(linkedInResults.value)) {
    aggregated.push(...linkedInResults.value)
  }

  // Always blend with curated fallback opportunities to guarantee rich results
  aggregated.push(...FALLBACK_OPPORTUNITIES)

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

    // 2. Derive targeted query, tags, and location dynamically from User Profile & Resume
    // HIGHEST PRIORITY: User's location & work mode preference (remote / onsite / hybrid)
    const userWorkPreference = (profile?.workPreference || "open").toLowerCase() // "remote" | "hybrid" | "onsite" | "open"
    const userLocation = profile?.location?.trim() || ""

    // SECOND PRIORITY: Targeted role & core skill tokens
    const primaryTargetRole = profile?.targetRoles?.[0] || ""
    const primarySkill = Array.from(userSkills)[0] || "developer"

    let query = input.query || ""
    const tagParam = input.tags?.[0] || primarySkill || "dev"
    let location = input.location || userLocation

    if (!input.query) {
      if (userWorkPreference === "remote") {
        query = primaryTargetRole ? `${primaryTargetRole} remote` : `${primarySkill} remote`
        location = "Remote"
      } else if (userWorkPreference === "onsite" && userLocation) {
        query = primaryTargetRole ? `${primaryTargetRole} in ${userLocation}` : `${primarySkill} in ${userLocation}`
        location = userLocation
      } else if (userWorkPreference === "hybrid" && userLocation) {
        query = primaryTargetRole ? `${primaryTargetRole} hybrid in ${userLocation}` : `${primarySkill} hybrid in ${userLocation}`
        location = userLocation
      } else {
        query = primaryTargetRole || primarySkill
        location = userLocation || "Remote"
      }
    }

    // Fetch multi-board opportunities matching the user's specific target role & location
    const rawJobs = await fetchMultiBoardOpportunities(query, tagParam, location)

    // 3. Extract search tokens for query matching (applied strictly only if user explicitly searched)
    const isExplicitSearch = Boolean(input.query || (input.tags && input.tags.length > 0))
    const searchTokens = isExplicitSearch ? extractSearchTokens(input.query, input.tags) : []

    const scoredOpportunities: ExternalJobOpportunity[] = []

    for (const job of rawJobs) {
      const position = String(job.title || "")
      const company = String(job.company || "")
      const jobLocation = String(job.location || "Remote")
      const tags = Array.isArray(job.tags) ? job.tags.map((t: string) => toCanonical(t)) : []
      const description = String(job.description || "").replace(/<[^>]+>/g, " ")

      // Filter by search tokens if explicit query/tags supplied
      if (searchTokens.length > 0) {
        const targetText = `${position} ${company} ${tags.join(" ")} ${description}`.toLowerCase()
        const hasMatch = searchTokens.some((token) => targetText.includes(token))
        if (!hasMatch) {
          continue
        }
      }

      // =========================================================================
      // STAGE 1: HARD DISQUALIFICATION GATE (Strict Elimination)
      // Eliminates non-viable jobs before scoring so the feed contains zero junk
      // =========================================================================

      const jobWorkMode = detectJobWorkMode({ location: jobLocation, title: position, description })
      const isLocationMatch = userLocation ? checkLocationMatch(jobLocation, userLocation) : false

      if (!isExplicitSearch) {
        // Gate 1A: Remote-only candidate will NEVER see on-site or hybrid jobs
        const locTitle = `${jobLocation} ${position}`.toLowerCase()
        const isLocOrTitleRemote =
          locTitle.includes("remote") ||
          locTitle.includes("anywhere") ||
          locTitle.includes("telecommute") ||
          locTitle.includes("distributed")
        if (userWorkPreference === "remote" && (!isLocOrTitleRemote || jobWorkMode !== "remote")) {
          continue
        }

        // Gate 1B: On-site candidate in city X will NEVER see on-site jobs in city Y
        if (userWorkPreference === "onsite" && jobWorkMode === "onsite" && !isLocationMatch && userLocation) {
          continue
        }

        // Gate 1C: Hybrid candidate in city X will NEVER see hybrid/on-site jobs in city Y
        if (userWorkPreference === "hybrid" && jobWorkMode === "hybrid" && !isLocationMatch && userLocation) {
          continue
        }

        // Gate 1D: International candidates will NEVER see US-only or UK-only restricted remote jobs
        if (jobWorkMode === "remote" && isGeoDisqualified({ location: jobLocation, title: position, description }, userLocation)) {
          continue
        }
      }

      // =========================================================================
      // STAGE 2: MULTI-FACTOR FIT SCORING (Scale: 50% - 99%)
      // 1. Location & Work Arrangement (up to 30 pts)
      // 2. Skill Alignment & Macro-Learning (up to 40 pts)
      // 3. Targeted Role & Career Trajectory (up to 20 pts)
      // 4. Compensation & Trust Signal (up to 10 pts)
      // =========================================================================

      // Factor 1: Location & Work Mode Fit (up to 30 pts)
      let locationScore = 0
      let locationRationale = ""

      if (userWorkPreference === "remote") {
        if (jobWorkMode === "remote") {
          locationScore = 30
          locationRationale = "100% Remote match for your Remote preference"
        } else if (isLocationMatch) {
          locationScore = 20
          locationRationale = `Local Hybrid in ${userLocation}`
        }
      } else if (userWorkPreference === "onsite") {
        if (isLocationMatch && jobWorkMode === "onsite") {
          locationScore = 30
          locationRationale = `Direct Local On-site match in ${userLocation}`
        } else if (isLocationMatch && jobWorkMode === "hybrid") {
          locationScore = 26
          locationRationale = `Local Hybrid match in ${userLocation}`
        } else if (jobWorkMode === "remote") {
          locationScore = 15
          locationRationale = "Remote work option (flexible alternative)"
        }
      } else if (userWorkPreference === "hybrid") {
        if (isLocationMatch && jobWorkMode === "hybrid") {
          locationScore = 30
          locationRationale = `Direct Local Hybrid match in ${userLocation}`
        } else if (isLocationMatch && jobWorkMode === "onsite") {
          locationScore = 26
          locationRationale = `Local On-site in ${userLocation}`
        } else if (jobWorkMode === "remote") {
          locationScore = 20
          locationRationale = "Remote flexibility (alternative to Hybrid)"
        }
      } else {
        // "open" or unspecified
        if (isLocationMatch) {
          locationScore = 30
          locationRationale = `Local opportunity in ${userLocation}`
        } else if (jobWorkMode === "remote") {
          locationScore = 28
          locationRationale = "Global Remote opportunity"
        } else {
          locationScore = 15
          locationRationale = `Location: ${jobLocation}`
        }
      }

      // Factor 2: Skill Match & Macro-Learned Boosts (up to 40 pts)
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

      const baseSkillScore = Math.min(28, matchedSkillCount * 8)
      const skillScore = baseSkillScore + Math.min(12, winningBoost)

      // Factor 3: Targeted Role & Trajectory (up to 20 pts)
      let roleScore = 0
      let roleRationale = ""
      if (profile?.targetRoles?.some((tr: string) => position.toLowerCase().includes(tr.toLowerCase()))) {
        roleScore += 15
        roleRationale = `Direct match for ${position}`
      } else if (winningRoles.some((wr) => position.toLowerCase().includes(wr))) {
        roleScore += 10
        roleRationale = `Proven career trajectory in ${position}`
      }

      if (winningCompanies.has(normalizeCompany(company))) {
        roleScore += 5
      }

      // Factor 4: Compensation & Trust (up to 10 pts)
      const salaryBonus = job.salaryMin ? 5 : 0
      const sourceBonus = job.sourceBoard === "linkedin" || job.sourceBoard === "curated" ? 5 : 0

      // Recurring Rejection Penalties
      let penaltyDamp = 0
      tags.forEach((tag: string) => {
        if (penalizedSkills.has(tag)) {
          penaltyDamp += 8
        }
      })

      const rawScore = locationScore + skillScore + roleScore + salaryBonus + sourceBonus - penaltyDamp
      const finalFitScore = Math.min(99, Math.max(50, rawScore || 55))

      // Transparent Match Rationale
      const rationaleSegments: string[] = []
      if (locationRationale) {
        rationaleSegments.push(locationRationale)
      }
      if (matchedWinningSkills.length > 0) {
        rationaleSegments.push(`High conversion skills: ${matchedWinningSkills.slice(0, 3).join(", ")}`)
      } else if (matchedSkillNames.length > 0) {
        rationaleSegments.push(`Skills: ${matchedSkillNames.slice(0, 4).join(", ")}`)
      }
      if (roleRationale) {
        rationaleSegments.push(roleRationale)
      }

      const matchRationale = rationaleSegments.join(" • ")

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
        location: jobLocation,
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
    const limit = input.limit || 12
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
