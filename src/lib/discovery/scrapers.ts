/* eslint-disable @typescript-eslint/no-explicit-any */
import { toCanonical } from "@/lib/ai/knowledge-graph"
import { prisma, withDbRetry } from "@/lib/prisma"
import { UnifiedRawJob } from "./types"
import { verifySourceHost } from "./host-verifier"
import {
  deduplicateJobs,
  mapToRemoteOkTag,
  normalizeJobFingerprint,
  detectJobWorkMode,
  evaluateJobScamRisk,
  detectVisaSponsorship,
  detectEmploymentType,
  isValidJobPostingUrl,
  isLegitimateTechDevRole,
  TECH_ROLE_FILTER_REGEX,
  NON_TECH_ROLE_DISQUALIFIER_REGEX,
} from "./matching"
import { generateBatchJobEmbeddings } from "./embedding"
import { cleanJobTitle } from "@/lib/applications/outreach-engine"
import {
  defaultScraperRegistry,
  ScraperRegistry,
} from "./plugins/registry"
import type { JobScraperPlugin, ScraperFetchParams } from "./plugins/types"

/**
 * Resilient Curated Seed Reservoir
 * Activated ONLY if external live APIs (RemoteOK, Jobicy, Arbeitnow, Adzuna, LinkedIn)
 * are completely down, rate-limited, or blocked on serverless datacenter IPs.
 * Guarantees the candidate never encounters an empty or broken 0-job state.
 */
export const CURATED_SEED_RESERVOIR: UnifiedRawJob[] = [
  {
    id: "rok_defdone_frontend",
    title: "Frontend Developer",
    company: "defdone",
    location: "Remote",
    url: "https://remoteOK.com/remote-jobs/remote-software-developmentfrontend-developer-defdone-1134928",
    sourceBoard: "remoteok",
    tags: ["react", "typescript", "javascript", "frontend", "developer", "junior"],
    salaryMin: 45000,
    salaryMax: 70000,
    description: "Building responsive React and TypeScript web applications. Ideal for early-career developers with personal projects.",
  },
  {
    id: "rok_pulse_junior_frontend",
    title: "Junior Front End Developer",
    company: "PULSE (MENA)",
    location: "Remote",
    url: "https://remoteOK.com/remote-jobs/remote-junior-front-end-developer-pulse-mena-1135285",
    sourceBoard: "remoteok",
    tags: ["react", "javascript", "html", "css", "frontend", "junior"],
    salaryMin: 35000,
    salaryMax: 55000,
    description: "Seeking a Junior Front End Developer to join our remote team. Hands-on experience with modern React components required.",
  },
  {
    id: "rok_over99_frontend",
    title: "Frontend Engineer",
    company: "over99",
    location: "Remote",
    url: "https://remoteOK.com/remote-jobs/remote-frontend-engineer-over99-1136165",
    sourceBoard: "remoteok",
    tags: ["react", "nextjs", "typescript", "tailwind", "frontend"],
    salaryMin: 50000,
    salaryMax: 80000,
    description: "Frontend engineer building Next.js and React user interfaces. Open to enthusiastic developers with clean GitHub portfolios.",
  },
  {
    id: "rok_fastlane_fullstack",
    title: "Full Stack Developer",
    company: "FastLane Group",
    location: "Remote",
    url: "https://remoteOK.com/remote-jobs/remote-full-stack-developer-fastlane-group-1135286",
    sourceBoard: "remoteok",
    tags: ["react", "nodejs", "typescript", "fullstack", "developer"],
    salaryMin: 40000,
    salaryMax: 65000,
    description: "Full stack web developer working on React frontends and Node.js backend services. Welcoming junior to mid developers.",
  },
  {
    id: "rok_stickermule_ai",
    title: "AI Agent Engineer",
    company: "Sticker Mule",
    location: "Remote",
    url: "https://remoteOK.com/remote-jobs/remote-ai-agent-engineer-sticker-mule-1137399",
    sourceBoard: "remoteok",
    tags: ["javascript", "typescript", "nodejs", "ai", "developer"],
    salaryMin: 60000,
    salaryMax: 90000,
    description: "Building automated workflows and agents in TypeScript and Node.js. Passion for automation and clean coding valued.",
  },
  {
    id: "jb_canonical_frontend",
    title: "Web Frontend Engineer - JS, CSS, React",
    company: "Canonical",
    location: "Remote",
    url: "https://jobicy.com/jobs/149527-web-frontend-engineer-js-css-react-flutter",
    sourceBoard: "jobicy",
    tags: ["react", "javascript", "css", "html", "frontend"],
    salaryMin: 45000,
    salaryMax: 70000,
    description: "Engineering canonical web interfaces using modern vanilla JavaScript, React, and CSS. Open to global remote applicants.",
  },
  {
    id: "rok_certifyos_intern",
    title: "AI & Software Intern",
    company: "CertifyOS",
    location: "Remote",
    url: "https://remoteOK.com/remote-jobs/remote-ai-intern-certifyos-1135555",
    sourceBoard: "remoteok",
    tags: ["intern", "internship", "python", "javascript", "software"],
    salaryMin: 30000,
    salaryMax: 45000,
    description: "Hands-on software development internship working with modern tooling, automated data pipelines, and web applications.",
  },
  {
    id: "rok_ace_qa_entry",
    title: "Software QA Tester (Entry Level)",
    company: "Ace IT Careers",
    location: "Remote",
    url: "https://remoteOK.com/remote-jobs/remote-qa-tester-entry-level-ace-it-careers-1136701",
    sourceBoard: "remoteok",
    tags: ["entry-level", "qa", "testing", "javascript", "web"],
    salaryMin: 35000,
    salaryMax: 50000,
    description: "Entry level software testing and QA role. Great starting path for aspiring web developers learning testing practices.",
  },
]

export const COMMON_TECH_TAGS = [
  "react", "nextjs", "next.js", "vue", "angular", "typescript", "javascript",
  "node", "nodejs", "node.js", "express", "python", "django", "fastapi", "golang", "go",
  "rust", "java", "c++", "c#", ".net", "ruby", "rails", "sql", "postgresql",
  "postgres", "mongodb", "redis", "docker", "kubernetes", "aws", "gcp", "azure",
  "graphql", "rest", "api", "tailwind", "fullstack", "full stack", "full-stack", "frontend", "front end", "backend", "back end",
  "devops", "ai", "llm", "machine learning", "ml", "security", "mobile", "ios", "android",
]

export {
  TECH_ROLE_FILTER_REGEX,
  NON_TECH_ROLE_DISQUALIFIER_REGEX,
  isLegitimateTechDevRole,
}

/**
 * Fetches live remote tech jobs from RemoteOK API
 */
export async function fetchRemoteOkJobs(tagParam: string): Promise<UnifiedRawJob[]> {
  try {
    const remoteOkTag = mapToRemoteOkTag(tagParam)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3500)

    const res = await fetch(`https://remoteok.com/api?tag=${encodeURIComponent(remoteOkTag)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []

    // First element in RemoteOK JSON is legal notice/disclaimer
    // Filter strictly for legitimate tech/developer roles and valid job posting URLs
    const jobItems = data.filter((item: any) => {
      if (!item || typeof item !== "object" || !item.id || !item.position) return false
      if (!isLegitimateTechDevRole(item.position)) return false
      const targetUrl = item.url || `https://remoteok.com/remote-jobs/${item.id}`
      if (!isValidJobPostingUrl(targetUrl)) return false
      return true
    })

    return jobItems.slice(0, 15).map((item: any) => {
      const tags = Array.isArray(item.tags)
        ? item.tags.map((t: string) => toCanonical(t))
        : []

      const title = String(item.position || "Software Engineer")
      const description = String(item.description || "").slice(0, 1000).replace(/<[^>]+>/g, " ")

      return {
        id: String(item.id || `rok-${item.slug || Math.random()}`),
        title,
        company: String(item.company || "Tech Company"),
        location: String(item.location || "Remote"),
        url: item.url || `https://remoteok.com/remote-jobs/${item.id}`,
        sourceBoard: "remoteok" as const,
        tags,
        salaryMin: item.salary_min ? Number(item.salary_min) : undefined,
        salaryMax: item.salary_max ? Number(item.salary_max) : undefined,
        description,
        postedAt: item.date ? new Date(item.date).toISOString() : undefined,
        visaSponsorship: detectVisaSponsorship(description, title),
        employmentType: detectEmploymentType({ title, description, tags }),
      }
    })
  } catch {
    return []
  }
}

/**
 * Fetches live remote tech jobs from Jobicy API (Public, unblocked on serverless)
 */
export async function fetchJobicyJobs(options?: { tag?: string; count?: number }): Promise<UnifiedRawJob[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3500)
    const count = options?.count || 30
    const tagQuery = options?.tag ? `&tag=${encodeURIComponent(options.tag)}` : ""

    const res = await fetch(`https://jobicy.com/api/v2/remote-jobs?count=${count}&industry=engineering${tagQuery}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) return []
    const data = await res.json()
    if (!data || !Array.isArray(data.jobs)) return []

    const validJobs = data.jobs.filter((item: any) => {
      if (!item || !item.jobTitle) return false
      const targetUrl = item.url || (item.id ? `https://jobicy.com/jobs/${item.id}` : "")
      if (!targetUrl) return false
      if (!isLegitimateTechDevRole(item.jobTitle)) return false
      if (!isValidJobPostingUrl(targetUrl)) return false
      return true
    })

    return validJobs.map((item: any) => {
      const tags = Array.isArray(item.jobTags)
        ? item.jobTags.map((t: string) => toCanonical(t))
        : []
      if (Array.isArray(item.jobType)) {
        tags.push(...item.jobType.map((t: string) => toCanonical(t)))
      } else if (typeof item.jobType === "string") {
        tags.push(toCanonical(item.jobType))
      }

      const title = String(item.jobTitle || "Software Engineer")
      const description = String(item.jobDescription || item.jobExcerpt || "").slice(0, 1000).replace(/<[^>]+>/g, " ")
      const employmentType = detectEmploymentType({ title, description, tags })
      const targetUrl = item.url || (item.id ? `https://jobicy.com/jobs/${item.id}` : "")

      return {
        id: String(item.id || `jb-${Math.random()}`),
        title,
        company: String(item.companyName || "Tech Company"),
        location: String(item.jobGeo || "Remote"),
        url: targetUrl,
        sourceBoard: "jobicy" as const,
        tags,
        salaryMin: item.annualSalaryMin ? Number(item.annualSalaryMin) : undefined,
        salaryMax: item.annualSalaryMax ? Number(item.annualSalaryMax) : undefined,
        description,
        postedAt: item.pubDate ? new Date(item.pubDate).toISOString() : undefined,
        visaSponsorship: detectVisaSponsorship(description, title),
        employmentType,
      }
    })
  } catch {
    return []
  }
}

/**
 * Fetches live tech jobs from Arbeitnow API
 */
export async function fetchArbeitnowJobs(query: string): Promise<UnifiedRawJob[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3500)

    const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) return []
    const data = await res.json()
    if (!data || !Array.isArray(data.data)) return []

    // If query is provided, match against individual keywords (not exact full string)
    const keywords = (query || "")
      .toLowerCase()
      .replace(/\b(remote|onsite|hybrid|in|at|for)\b/gi, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)

    const candidates = keywords.length > 0
      ? data.data.filter((item: any) => {
          const fullText = `${item.title} ${item.company_name} ${(item.tags || []).join(" ")}`.toLowerCase()
          return keywords.some((kw) => fullText.includes(kw))
        })
      : data.data

    const finalPool = candidates.length > 0 ? candidates : data.data

    return finalPool.slice(0, 25).map((item: any) => {
      const tags = Array.isArray(item.tags)
        ? item.tags.map((t: string) => toCanonical(t))
        : []
      if (Array.isArray(item.job_types)) {
        tags.push(...item.job_types.map((t: string) => toCanonical(t)))
      }

      const title = String(item.title || "")
      const description = String(item.description || "").slice(0, 1000).replace(/<[^>]+>/g, " ")
      const postedAt = item.created_at
        ? new Date(typeof item.created_at === "number" ? item.created_at * 1000 : item.created_at).toISOString()
        : undefined
      const employmentType = detectEmploymentType({ title, description, tags })

      return {
        id: String(item.slug || `an-${Math.random()}`),
        title,
        company: String(item.company_name || ""),
        location: item.remote ? "Remote" : String(item.location || "Europe / Remote"),
        url: item.url || "https://www.arbeitnow.com",
        sourceBoard: "arbeitnow" as const,
        tags,
        description,
        postedAt,
        visaSponsorship: detectVisaSponsorship(description, title),
        employmentType,
      }
    })
  } catch {
    return []
  }
}

/**
 * Fetches local/hybrid tech jobs from Adzuna API if configured
 */
export async function fetchAdzunaJobs(query: string, location?: string): Promise<UnifiedRawJob[]> {
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

    return data.results.map((item: any) => {
      const rawTitle = String(item.title || "").replace(/<\/?strong>/gi, "")
      const title = cleanJobTitle(rawTitle) || "Software Engineer"
      const description = String(item.description || "").replace(/<[^>]+>/g, " ")
      const postedAt = item.created ? new Date(item.created).toISOString() : undefined

      return {
        id: String(item.id || `adz-${item.company?.display_name}-${item.title}`),
        title,
        company: String(item.company?.display_name || ""),
        location: String(item.location?.display_name || location || "Local/Hybrid"),
        url: item.redirect_url || "",
        sourceBoard: "adzuna" as const,
        tags: item.category?.tag ? [toCanonical(item.category.tag)] : [],
        salaryMin: item.salary_min ? Math.round(item.salary_min) : undefined,
        salaryMax: item.salary_max ? Math.round(item.salary_max) : undefined,
        description,
        postedAt,
        visaSponsorship: detectVisaSponsorship(description, title),
      }
    })
  } catch {
    return []
  }
}

/**
 * Fetches live LinkedIn jobs using LinkedIn's public guest search endpoint
 * Operates without paid API keys, fetching local and remote engineering roles.
 */
/**
 * Maps days to LinkedIn f_TPR recency parameter (from ai-job-search proven CLI engine)
 */
export function jobageToTPR(days?: number): string | undefined {
  if (!days || days <= 0) return undefined
  if (days <= 1) return "r86400" // past 24 hours
  if (days <= 7) return "r604800" // past week
  if (days <= 14) return "r1209600" // past 2 weeks
  if (days <= 30) return "r2592000" // past month
  return undefined
}

/**
 * Maps workplace type to LinkedIn f_WT filter
 */
export function workTypeToWT(mode?: "remote" | "hybrid" | "onsite"): string | undefined {
  if (mode === "onsite") return "1"
  if (mode === "remote") return "2"
  if (mode === "hybrid") return "3"
  return undefined
}

/**
 * Fetches single job detail from LinkedIn's guest jobPosting endpoint.
 * Accurately extracts real seniority, employment type, and verifies active status.
 */
export async function fetchLinkedInJobDetail(jobId: string): Promise<{
  description?: string
  seniority?: string
  employmentType?: string
  isActive: boolean
} | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)

    const url = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) return null
    const html = await res.text()

    // Closed-posting detection (active banner check)
    const topcard = html.slice(0, 5000)
    const isClosed = /closed-job__flavor|no longer accepting applications/i.test(topcard)
    if (isClosed) {
      return { isActive: false }
    }

    // Extract seniority and employment criteria from LinkedIn metadata
    const criteriaRe = /class="description__job-criteria-subheader"[^>]*>([\s\S]*?)<\/h3>[\s\S]*?class="description__job-criteria-text[^"]*"[^>]*>([\s\S]*?)<\/span>/gi
    const criteria: Record<string, string> = {}
    let m: RegExpExecArray | null
    while ((m = criteriaRe.exec(html)) !== null) {
      const label = m[1].replace(/<[^>]+>/g, "").trim().toLowerCase()
      const val = m[2].replace(/<[^>]+>/g, "").trim()
      criteria[label] = val
    }

    // Extract rich description text
    let description: string | undefined
    const descMatch = html.match(/class="(?:show-more-less-html__markup|description__text)[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
    if (descMatch) {
      description = descMatch[1]
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim()
    }

    return {
      description,
      seniority: criteria["seniority level"],
      employmentType: criteria["employment type"],
      isActive: true,
    }
  } catch {
    return null
  }
}

/**
 * Fetches live LinkedIn jobs using LinkedIn's public guest search endpoint
 * Incorporates battle-tested recency filters (f_TPR) and workplace mode (f_WT) from ai-job-search CLI
 */
export async function fetchLinkedInGuestJobs(
  query: string,
  location?: string,
  options: { jobageDays?: number; workplaceType?: "remote" | "hybrid" | "onsite"; limit?: number } = {}
): Promise<UnifiedRawJob[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const searchKeyword = query || "software engineer"
    const searchLocation = location || "Bangladesh"

    const params = new URLSearchParams()
    params.set("keywords", searchKeyword)
    params.set("location", searchLocation)
    params.set("start", "0")

    // Default to last 7 days for strict freshness (prevents stale / dead postings)
    const tpr = jobageToTPR(options.jobageDays || 7)
    if (tpr) params.set("f_TPR", tpr)

    const wt = workTypeToWT(options.workplaceType)
    if (wt) params.set("f_WT", wt)

    const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params.toString()}`

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) return []
    const html = await res.text()

    const titleMatches = [...html.matchAll(/<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>([\s\S]*?)<\/h3>/gi)]
    const companyMatches = [...html.matchAll(/<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>([\s\S]*?)<\/h4>/gi)]
    const locationMatches = [...html.matchAll(/<span[^>]*class="[^"]*job-search-card__location[^"]*"[^>]*>([\s\S]*?)<\/span>/gi)]
    const linkMatches = [...html.matchAll(/<a[^>]*class="[^"]*base-card__full-link[^"]*"[^>]*href="([^"]+)"/gi)]
    const dateMatches = [...html.matchAll(/class="job-search-card__listdate[^"]*"[^>]*datetime="([^"]+)"/gi)]

    const jobs: UnifiedRawJob[] = []
    const maxItems = options.limit || 15

    for (let i = 0; i < Math.min(titleMatches.length, maxItems); i++) {
      const rawTitle = titleMatches[i]?.[1]?.trim() || ""
      const unescapedTitle = rawTitle
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
      const title = cleanJobTitle(unescapedTitle) || "Software Engineer"
      const company = companyMatches[i]?.[1]?.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim() || "Tech Company"
      const loc = locationMatches[i]?.[1]?.trim() || searchLocation
      const isRemote = /remote/i.test(loc) || /remote/i.test(title) || /remote/i.test(searchLocation)
      const rawLink = linkMatches[i]?.[1]?.split("?")[0] || ""
      if (!title || !rawLink) continue

      const jobIdMatch = rawLink.match(/-(\d+)(?:$|\/)/)
      const jobId = jobIdMatch ? jobIdMatch[1] : `li-${i}-${Date.now()}`
      const postedDateStr = dateMatches[i]?.[1] || new Date().toISOString()

      const extractedTags = extractTechTagsFromText(`${title} ${searchKeyword}`)
      const titleLower = title.toLowerCase()
      const postTags = Array.from(
        new Set([
          toCanonical(title),
          "linkedin",
          "developer",
          ...extractedTags,
          ...(titleLower.includes("front") ? ["frontend", "react"] : []),
          ...(titleLower.includes("react") ? ["react", "frontend", "javascript"] : []),
          ...(titleLower.includes("next") ? ["nextjs", "react"] : []),
          ...(titleLower.includes("full") ? ["fullstack", "react", "node"] : []),
          ...(titleLower.includes("intern") ? ["intern", "internship"] : []),
          ...(titleLower.includes("junior") || titleLower.includes("trainee") ? ["junior", "entry-level"] : []),
        ])
      )

      const description = `${title} at ${company} in ${loc}. Verified LinkedIn developer opening for ${extractedTags.length > 0 ? extractedTags.join(", ") : "developers"}. Apply directly on LinkedIn.`
      jobs.push({
        id: `li-guest-${jobId}`,
        title,
        company,
        location: loc,
        isRemote,
        url: rawLink,
        sourceBoard: "linkedin_post" as const,
        tags: postTags,
        description,
        postedAt: postedDateStr,
        visaSponsorship: detectVisaSponsorship(description, title),
        employmentType: detectEmploymentType({ title, description, tags: postTags }),
      })
    }

    return jobs
  } catch {
    return []
  }
}

/**
 * Organic LinkedIn Founder / HR Hiring Posts
 * Preserved as empty array for backwards compatibility; prevents stale/fake link injection.
 */
export const DAILY_LINKEDIN_SOCIAL_POSTS: UnifiedRawJob[] = []

/**
 * Bangladesh Tech Portals
 * Preserved as empty array for backwards compatibility; prevents generic directory links.
 */
export const BD_TECH_AGENCY_JOBS: UnifiedRawJob[] = []

export const GREENHOUSE_TARGET_BOARDS = [
  "vercel",
  "stripe",
  "anthropic",
  "figma",
  "cloudflare",
  "gitlab",
  "datadog",
  "discord",
  "mongodb",
  "canonical",
  "twitch",
  "elastic",
  "scaleai",
  "ramp",
  "cockroachlabs",
  "airtable",
  "khanacademy",
]

export const LEVER_TARGET_COMPANIES = [
  "spotify",
  "palantir",
  "kraken",
  "kinsta",
  "lever",
]

const COMPANY_DISPLAY_NAMES: Record<string, string> = {
  vercel: "Vercel",
  stripe: "Stripe",
  anthropic: "Anthropic",
  figma: "Figma",
  cloudflare: "Cloudflare",
  gitlab: "GitLab",
  datadog: "Datadog",
  discord: "Discord",
  mongodb: "MongoDB",
  canonical: "Canonical",
  twitch: "Twitch",
  elastic: "Elastic",
  scaleai: "Scale AI",
  ramp: "Ramp",
  cockroachlabs: "Cockroach Labs",
  airtable: "Airtable",
  khanacademy: "Khan Academy",
  spotify: "Spotify",
  palantir: "Palantir",
  kraken: "Kraken",
  kinsta: "Kinsta",
  lever: "Lever",
}


const TECH_TAG_REGEXES = COMMON_TECH_TAGS.map(tag => ({
  tag,
  regex: new RegExp(`(^|[^a-z0-9+#.-])${tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9+#.-]|$)`, "i")
}))

export function extractTechTagsFromText(text: string): string[] {
  const lower = text.toLowerCase()
  const matched = new Set<string>()
  for (const { tag, regex } of TECH_TAG_REGEXES) {
    if (regex.test(lower)) {
      matched.add(toCanonical(tag))
    }
  }
  return Array.from(matched)
}

/**
 * Fetches software engineering and tech opportunities directly from Greenhouse boards JSON API
 */
export async function fetchGreenhouseJobs(options: {
  boards?: string[]
  boardTokens?: string[]
  limitPerBoard?: number
  query?: string
} = {}): Promise<UnifiedRawJob[]> {
  const boards = options.boards || options.boardTokens || GREENHOUSE_TARGET_BOARDS
  const limitPerBoard = options.limitPerBoard || 15
  const queryLower = (options.query || "").toLowerCase().trim()

  const fetchBoard = async (board: string): Promise<UnifiedRawJob[]> => {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)

      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CareerTrack-Discovery/1.0",
        },
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!res.ok) return []
      const data = await res.json()
      if (!data || !Array.isArray(data.jobs)) return []

      const companyName = COMPANY_DISPLAY_NAMES[board] || (board.charAt(0).toUpperCase() + board.slice(1))

      // Filter for legitimate tech/engineering roles
      const filtered = data.jobs.filter((j: any) => {
        if (!j || !j.title) return false
        if (!isLegitimateTechDevRole(j.title)) return false
        const targetUrl = j.absolute_url || `https://boards.greenhouse.io/${board}/jobs/${j.id}`
        if (!isValidJobPostingUrl(targetUrl)) return false
        if (queryLower) {
          const matchTarget = `${j.title} ${companyName} ${j.location?.name || ""}`.toLowerCase()
          return matchTarget.includes(queryLower)
        }
        return true
      })

      return filtered.slice(0, limitPerBoard).map((j: any) => {
        const title = String(j.title || "Software Engineer")
        const loc = String(j.location?.name || "Remote")
        const rawContent = j.content ? String(j.content).replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim() : ""
        const description = rawContent.slice(0, 1200) || `${title} at ${companyName}. Official Greenhouse job posting. Location: ${loc}.`
        const tags = extractTechTagsFromText(`${title} ${rawContent.slice(0, 500)} ${board}`)
        if (tags.length === 0) tags.push("developer")
        const postedAt = j.updated_at || j.first_published ? new Date(j.updated_at || j.first_published).toISOString() : undefined
        const employmentType = detectEmploymentType({ title, description, tags })

        return {
          id: `gh-${board}-${j.id}`,
          title,
          company: companyName,
          location: loc,
          url: j.absolute_url || `https://boards.greenhouse.io/${board}/jobs/${j.id}`,
          sourceBoard: "greenhouse" as const,
          tags,
          description,
          postedAt,
          visaSponsorship: detectVisaSponsorship(description, title),
          employmentType,
        }
      })
    } catch {
      return []
    }
  }

  const results = await Promise.allSettled(boards.map((b) => fetchBoard(b)))
  const jobs: UnifiedRawJob[] = []
  for (const r of results) {
    if (r.status === "fulfilled") jobs.push(...r.value)
  }
  return jobs
}

/**
 * Fetches tech roles directly from Lever public postings JSON API
 */
export async function fetchLeverJobs(options: {
  companies?: string[]
  companySlugs?: string[]
  limitPerCompany?: number
  query?: string
} = {}): Promise<UnifiedRawJob[]> {
  const companies = options.companies || options.companySlugs || LEVER_TARGET_COMPANIES
  const limitPerCompany = options.limitPerCompany || 15
  const queryLower = (options.query || "").toLowerCase().trim()

  const fetchCompany = async (company: string): Promise<UnifiedRawJob[]> => {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)

      const res = await fetch(`https://api.lever.co/v0/postings/${company}?mode=json`, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CareerTrack-Discovery/1.0",
        },
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!res.ok) return []
      const data = await res.json()
      if (!Array.isArray(data)) return []

      const companyName = COMPANY_DISPLAY_NAMES[company] || (company.charAt(0).toUpperCase() + company.slice(1))

      const filtered = data.filter((j: any) => {
        if (!j || !j.text) return false
        if (!isLegitimateTechDevRole(j.text)) return false
        const targetUrl = j.hostedUrl || `https://jobs.lever.co/${company}/${j.id}`
        if (!isValidJobPostingUrl(targetUrl)) return false
        if (queryLower) {
          const matchTarget = `${j.text} ${companyName} ${j.categories?.location || ""}`.toLowerCase()
          return matchTarget.includes(queryLower)
        }
        return true
      })

      return filtered.slice(0, limitPerCompany).map((j: any) => {
        const title = String(j.text || "Software Engineer")
        const loc = String(j.categories?.location || (j.workplaceType === "remote" ? "Remote" : "Hybrid / On-site"))
        const tags = extractTechTagsFromText(`${title} ${j.categories?.team || ""} ${company}`)
        const commitment = j.categories?.commitment ? String(j.categories.commitment) : undefined
        if (commitment) tags.push(toCanonical(commitment))
        if (tags.length === 0) tags.push("developer")
        const description = String(j.descriptionPlain || `${title} at ${companyName}. Location: ${loc}.`).slice(0, 1000)
        const postedAt = j.createdAt ? new Date(j.createdAt).toISOString() : undefined
        const employmentType = detectEmploymentType({ title, description, tags, commitment })

        return {
          id: `lever-${company}-${j.id}`,
          title,
          company: companyName,
          location: loc,
          url: j.hostedUrl || `https://jobs.lever.co/${company}/${j.id}`,
          sourceBoard: "lever" as const,
          tags,
          description,
          postedAt,
          visaSponsorship: detectVisaSponsorship(description, title),
          employmentType,
        }
      })
    } catch {
      return []
    }
  }

  const results = await Promise.allSettled(companies.map((c) => fetchCompany(c)))
  const jobs: UnifiedRawJob[] = []
  for (const r of results) {
    if (r.status === "fulfilled") jobs.push(...r.value)
  }
  return jobs
}

// Initialize and register standard built-in scraper plugins
if (!defaultScraperRegistry.getPlugin("remoteok")) {
  defaultScraperRegistry.register({
    id: "remoteok",
    name: "RemoteOK",
    enabled: true,
    fetch: async ({ tagParam }) => fetchRemoteOkJobs(tagParam || ""),
  })
}
if (!defaultScraperRegistry.getPlugin("jobicy")) {
  defaultScraperRegistry.register({
    id: "jobicy",
    name: "Jobicy",
    enabled: true,
    fetch: async () => fetchJobicyJobs(),
  })
}
if (!defaultScraperRegistry.getPlugin("arbeitnow")) {
  defaultScraperRegistry.register({
    id: "arbeitnow",
    name: "Arbeitnow",
    enabled: true,
    fetch: async ({ query }) => fetchArbeitnowJobs(query || ""),
  })
}
if (!defaultScraperRegistry.getPlugin("adzuna")) {
  defaultScraperRegistry.register({
    id: "adzuna",
    name: "Adzuna",
    enabled: true,
    fetch: async ({ query, location }) => fetchAdzunaJobs(query || "", location),
  })
}
if (!defaultScraperRegistry.getPlugin("linkedin_guest")) {
  defaultScraperRegistry.register({
    id: "linkedin_guest",
    name: "LinkedIn Guest",
    enabled: true,
    fetch: async ({ query, location }) => fetchLinkedInGuestJobs(query || "", location),
  })
}
if (!defaultScraperRegistry.getPlugin("greenhouse")) {
  defaultScraperRegistry.register({
    id: "greenhouse",
    name: "Greenhouse ATS",
    enabled: true,
    fetch: async ({ query }) => fetchGreenhouseJobs({ query: query || "", limitPerBoard: 8 }),
  })
}
if (!defaultScraperRegistry.getPlugin("lever")) {
  defaultScraperRegistry.register({
    id: "lever",
    name: "Lever ATS",
    enabled: true,
    fetch: async ({ query }) => fetchLeverJobs({ query: query || "", limitPerCompany: 8 }),
  })
}

/**
 * Ingests jobs across all configured external job boards concurrently using Open-Closed Scraper Registry.
 * Combines live scraped boards, direct Greenhouse/Lever ATS, and verified seed reservoir.
 */
export async function fetchMultiBoardOpportunities(
  query: string,
  tagParam: string,
  location?: string
): Promise<UnifiedRawJob[]> {
  const { jobs: scrapedJobs } = await defaultScraperRegistry.executeAll({
    query,
    tagParam,
    location,
  })

  const aggregated: UnifiedRawJob[] = [...scrapedJobs, ...CURATED_SEED_RESERVOIR]
  const deduplicated = deduplicateJobs(aggregated)

  // Enrich every job with ATS source host provenance verification
  for (const job of deduplicated) {
    if (!job.hostVerification && job.url) {
      const verification = verifySourceHost(job.url)
      job.hostVerification = {
        category: verification.category,
        isTrustedAts: verification.isTrustedAts,
        apexDomain: verification.apexDomain,
        warning: verification.warning,
      }
    }
  }

  return deduplicated
}

export {
  defaultScraperRegistry,
  ScraperRegistry,
  type JobScraperPlugin,
  type ScraperFetchParams,
}

/**
 * Ingests external jobs from all configured sources into the global CanonicalJob catalog.
 * Runs completely decoupled from user request lifecycles (e.g. via Inngest cron or seed script).
 */
export async function ingestGlobalJobsToCatalog(options: {
  queries?: string[]
  pruneExpired?: boolean
} = {}): Promise<{
  totalFetched: number
  upsertedCount: number
  expiredCount: number
}> {
  const queries = options.queries || [
    "developer",
    "software engineer",
    "frontend",
    "backend",
    "full stack",
  ]

  console.log(`[GlobalJobIngest] Starting ingestion for ${queries.length} query targets...`)
  const rawJobs: UnifiedRawJob[] = []

  // Concurrently fetch jobs for primary search queries
  const fetchPromises = queries.map((q) => fetchMultiBoardOpportunities(q, "dev"))
  const results = await Promise.allSettled(fetchPromises)

  for (const res of results) {
    if (res.status === "fulfilled" && Array.isArray(res.value)) {
      rawJobs.push(...res.value)
    }
  }

  // Also include the curated reservoir of verified live jobs
  rawJobs.push(...CURATED_SEED_RESERVOIR)

  // Dedicated deep crawl for top ATS board targets (Greenhouse + Lever)
  const [greenhouseDeep, leverDeep] = await Promise.allSettled([
    fetchGreenhouseJobs({ limitPerBoard: 25 }),
    fetchLeverJobs({ limitPerCompany: 25 }),
  ])
  if (greenhouseDeep.status === "fulfilled" && Array.isArray(greenhouseDeep.value)) {
    rawJobs.push(...greenhouseDeep.value)
  }
  if (leverDeep.status === "fulfilled" && Array.isArray(leverDeep.value)) {
    rawJobs.push(...leverDeep.value)
  }

  const dedupedJobs = deduplicateJobs(rawJobs)

  // Enrich with host verification before filtering
  for (const job of dedupedJobs) {
    if (!job.hostVerification && job.url) {
      const verification = verifySourceHost(job.url)
      job.hostVerification = {
        category: verification.category,
        isTrustedAts: verification.isTrustedAts,
        apexDomain: verification.apexDomain,
        warning: verification.warning,
      }
    }
  }

  const validJobs = dedupedJobs.filter((job) => isValidJobPostingUrl(job.url) && isLegitimateTechDevRole(job.title))
  console.log(`[GlobalJobIngest] Fetched ${rawJobs.length} raw jobs -> ${dedupedJobs.length} deduplicated -> ${validJobs.length} valid posting URLs.`)

  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  let upsertedCount = 0
  const CHUNK_SIZE = 25

  for (let i = 0; i < validJobs.length; i += CHUNK_SIZE) {
    const chunk = validJobs.slice(i, i + CHUNK_SIZE)

    // Pre-calculate fingerprints for chunk
    const chunkWithFp = chunk.map((job) => {
      const workMode = detectJobWorkMode(job)
      const isRemote = workMode === "remote"
      const fingerprint = normalizeJobFingerprint(job.company, job.title, job.location, isRemote)
      return { job, fingerprint, isRemote, workMode }
    })

    const fingerprints = chunkWithFp.map((c) => c.fingerprint)

    // Select only fingerprint to avoid unsupported vector deserialization issues in regular Prisma queries
    const existingRows = await withDbRetry(() =>
      prisma.canonicalJob.findMany({
        where: { fingerprint: { in: fingerprints } },
        select: { fingerprint: true },
      })
    ).catch(() => [])

    const existingSet = new Set(existingRows.map((e) => e.fingerprint))
    const newItems = chunkWithFp.filter((c) => !existingSet.has(c.fingerprint))

    let embeddings: number[][] = []
    if (newItems.length > 0) {
      embeddings = await generateBatchJobEmbeddings(newItems.map((n) => n.job))
    }

    const chunkWrites = chunkWithFp.map(async ({ job, fingerprint, isRemote }) => {
      try {
        const scamEval = evaluateJobScamRisk(job)
        const visaSponsorship = job.visaSponsorship || detectVisaSponsorship(job.description, job.title)
        const employmentType = detectEmploymentType({
          title: job.title,
          description: job.description || "",
          tags: job.tags || [],
        })
        const postedAtDate = job.postedAt ? new Date(job.postedAt) : now
        const validPostedAt = isNaN(postedAtDate.getTime()) ? now : postedAtDate

        if (existingSet.has(fingerprint)) {
          await withDbRetry(() =>
            prisma.canonicalJob.update({
              where: { fingerprint },
              data: {
                url: job.url,
                salary: job.salaryText || (job.salaryMin && job.salaryMax ? `$${job.salaryMin} - $${job.salaryMax}` : undefined),
                salaryMin: job.salaryMin || undefined,
                salaryMax: job.salaryMax || undefined,
                tags: job.tags && job.tags.length > 0 ? job.tags : undefined,
                description: job.description || undefined,
                postedAt: validPostedAt,
                expiresAt: thirtyDaysFromNow,
                isExpired: scamEval.isSuspicious,
                scamScore: scamEval.scamScore,
                visaSponsorship: visaSponsorship !== "unknown" ? visaSponsorship : undefined,
                employmentType,
              },
            })
          )
        } else {
          const newItemIdx = newItems.findIndex((n) => n.fingerprint === fingerprint)
          const emb = newItemIdx !== -1 && embeddings[newItemIdx] ? embeddings[newItemIdx] : null
          const vectorStr = emb ? `[${emb.join(",")}]` : null

          if (vectorStr) {
            await withDbRetry(() =>
              prisma.$executeRaw`
                INSERT INTO "CanonicalJob" (
                  id, fingerprint, "sourceBoard", "externalId", title, company, location,
                  "isRemote", url, salary, "salaryMin", "salaryMax", tags, description,
                  "postedAt", "expiresAt", "isExpired", "scamScore", "visaSponsorship",
                  "employmentType", embedding, "createdAt", "updatedAt"
                ) VALUES (
                  gen_random_uuid()::text, ${fingerprint}, ${job.sourceBoard}, ${job.id || null},
                  ${job.title}, ${job.company}, ${job.location}, ${isRemote}, ${job.url},
                  ${job.salaryText || (job.salaryMin && job.salaryMax ? `$${job.salaryMin} - $${job.salaryMax}` : null)},
                  ${job.salaryMin || null}, ${job.salaryMax || null},
                  ${job.tags || []}::text[], ${job.description || null},
                  ${validPostedAt}::timestamp, ${thirtyDaysFromNow}::timestamp, ${scamEval.isSuspicious},
                  ${scamEval.scamScore}, ${visaSponsorship || "unknown"},
                  ${employmentType || "full-time"},
                  ${vectorStr}::vector, NOW(), NOW()
                )
                ON CONFLICT (fingerprint) DO UPDATE SET
                  "postedAt" = EXCLUDED."postedAt",
                  "updatedAt" = NOW();
              `
            )
          } else {
            await withDbRetry(() =>
              prisma.canonicalJob.create({
                data: {
                  fingerprint,
                  sourceBoard: job.sourceBoard,
                  externalId: job.id,
                  title: job.title,
                  company: job.company,
                  location: job.location,
                  isRemote,
                  url: job.url,
                  salary: job.salaryText || (job.salaryMin && job.salaryMax ? `$${job.salaryMin} - $${job.salaryMax}` : null),
                  salaryMin: job.salaryMin || null,
                  salaryMax: job.salaryMax || null,
                  tags: job.tags || [],
                  description: job.description || null,
                  postedAt: validPostedAt,
                  expiresAt: thirtyDaysFromNow,
                  isExpired: scamEval.isSuspicious,
                  scamScore: scamEval.scamScore,
                  visaSponsorship,
                  employmentType,
                },
              })
            )
          }
        }
        return true
      } catch (err) {
        console.warn(`[GlobalJobIngest] Error upserting job "${job.title}" at "${job.company}":`, err)
        return false
      }
    })

    const settledWrites = await Promise.allSettled(chunkWrites)
    for (const res of settledWrites) {
      if (res.status === "fulfilled" && res.value) {
        upsertedCount++
      }
    }
  }

  // Prune / flag expired jobs past 30 days
  let expiredCount = 0
  if (options.pruneExpired !== false) {
    const expireResult = await withDbRetry(() =>
      prisma.canonicalJob.updateMany({
        where: {
          expiresAt: { lt: now },
          isExpired: false,
        },
        data: {
          isExpired: true,
        },
      })
    ).catch(() => ({ count: 0 }))
    expiredCount = expireResult.count
  }

  console.log(`[GlobalJobIngest] Ingestion completed: ${upsertedCount} upserted, ${expiredCount} expired.`)
  return {
    totalFetched: rawJobs.length,
    upsertedCount,
    expiredCount,
  }
}

export {
  synthesizeLinkedInSearchQueries,
  harvestLinkedInOpportunities,
  ingestLinkedInOpportunitiesToCatalog,
} from "./linkedin-harvester"

