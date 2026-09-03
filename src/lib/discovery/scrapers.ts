/* eslint-disable @typescript-eslint/no-explicit-any */
import { toCanonical } from "@/lib/ai/knowledge-graph"
import { UnifiedRawJob } from "./types"
import { deduplicateJobs, mapToRemoteOkTag } from "./matching"

/**
 * Fetches remote tech jobs from RemoteOK API
 */
export async function fetchRemoteOkJobs(tagParam: string): Promise<UnifiedRawJob[]> {
  try {
    const remoteOkTag = mapToRemoteOkTag(tagParam)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3500)

    const res = await fetch(`https://remoteok.com/api?tag=${encodeURIComponent(remoteOkTag)}`, {
      headers: { "User-Agent": "CareerTrack-Discovery-Engine/1.0" },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []

    // First element in RemoteOK JSON is legal notice/disclaimer
    const jobItems = data.filter((item: any) => item && typeof item === "object" && item.id && item.position)

    return jobItems.slice(0, 15).map((item: any) => {
      const tags = Array.isArray(item.tags)
        ? item.tags.map((t: string) => toCanonical(t))
        : []

      return {
        id: String(item.id || `rok-${item.slug || Math.random()}`),
        title: String(item.position || "Software Engineer"),
        company: String(item.company || "Tech Company"),
        location: String(item.location || "Remote"),
        url: item.url || `https://remoteok.com/remote-jobs/${item.id}`,
        sourceBoard: "remoteok" as const,
        tags,
        salaryMin: item.salary_min ? Number(item.salary_min) : undefined,
        salaryMax: item.salary_max ? Number(item.salary_max) : undefined,
        description: String(item.description || "").slice(0, 1000).replace(/<[^>]+>/g, " "),
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
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) return []
    const data = await res.json()
    if (!data || !Array.isArray(data.data)) return []

    const q = (query || "").toLowerCase()
    const matching = data.data.filter((item: any) => {
      if (!q) return true
      const fullText = `${item.title} ${item.company_name} ${(item.tags || []).join(" ")}`.toLowerCase()
      return fullText.includes(q)
    })

    return matching.slice(0, 15).map((item: any) => {
      const tags = Array.isArray(item.tags)
        ? item.tags.map((t: string) => toCanonical(t))
        : []

      return {
        id: String(item.slug || `an-${Math.random()}`),
        title: String(item.title || ""),
        company: String(item.company_name || ""),
        location: item.remote ? "Remote" : String(item.location || "Europe / Remote"),
        url: item.url || "https://www.arbeitnow.com",
        sourceBoard: "arbeitnow" as const,
        tags,
        description: String(item.description || "").slice(0, 1000).replace(/<[^>]+>/g, " "),
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
export async function fetchLinkedInAndLocalJobs(query: string, location?: string): Promise<UnifiedRawJob[]> {
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
 * Ingests jobs across all configured external job boards concurrently.
 * Strictly live jobs only — no hardcoded mock data.
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

  return deduplicateJobs(aggregated)
}
