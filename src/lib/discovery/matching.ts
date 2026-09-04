import { UnifiedRawJob } from "./types"

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
export function detectJobWorkMode(job: { location?: string; title?: string; description?: string; sourceBoard?: string }): "remote" | "hybrid" | "onsite" {
  const locTitle = `${job.location || ""} ${job.title || ""}`.toLowerCase()
  if (locTitle.includes("hybrid")) return "hybrid"
  if (
    locTitle.includes("remote") ||
    locTitle.includes("work from anywhere") ||
    locTitle.includes("telecommute") ||
    locTitle.includes("anywhere") ||
    locTitle.includes("worldwide") ||
    locTitle.includes("global")
  ) {
    return "remote"
  }

  // Check description with strict boundary keywords
  const desc = (job.description || "").toLowerCase()
  if (desc.includes("hybrid work") || desc.includes("hybrid schedule") || desc.includes("hybrid role")) return "hybrid"
  if (
    desc.includes("100% remote") ||
    desc.includes("fully remote") ||
    desc.includes("work from home") ||
    desc.includes("remote-first") ||
    desc.includes("remote eligible") ||
    desc.includes("work remotely")
  ) {
    return "remote"
  }

  if (job.sourceBoard === "remoteok") {
    // If remoteok job specifies an actual city/country and doesn't mention remote, treat as onsite/local
    if (job.location && job.location.toLowerCase() !== "remote" && !desc.includes("remote")) {
      return "onsite"
    }
    return "remote"
  }

  return "onsite"
}

/**
 * Checks if a job's location matches the user's preferred location (city or country)
 */
export function checkLocationMatch(
  jobLocation?: string,
  userLocation?: string,
  options?: { strictCity?: boolean }
): boolean {
  if (!userLocation || !jobLocation) return false
  const jobLower = jobLocation.toLowerCase()
  const userParts = userLocation.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)

  if (options?.strictCity && userParts.length > 1) {
    // City is the first part (e.g. "Sylhet" in "Sylhet, Bangladesh")
    const userCity = userParts[0]
    return jobLower.includes(userCity)
  }

  const userTokens = userLocation.toLowerCase().split(/[,/|\s-]+/).filter((t) => t.length > 2)
  return userTokens.some((token) => jobLower.includes(token))
}

/**
 * Detects if an on-site or hybrid job is located in the country's primary tech capital
 * which is relevant and accessible to nationwide candidates (e.g. Dhaka for any candidate in Bangladesh).
 */
export function isNationalTechHubMatch(jobLocation?: string, userLocation?: string): boolean {
  if (!jobLocation || !userLocation) return false
  const userLower = userLocation.toLowerCase()
  const jobLower = jobLocation.toLowerCase()

  // Bangladesh Tech Capital: Dhaka (primary tech hub for candidates anywhere across Bangladesh)
  const isCandidateInBD =
    userLower.includes("bangladesh") ||
    userLower.includes("bd") ||
    userLower.includes("dhaka") ||
    userLower.includes("chittagong") ||
    userLower.includes("chattogram") ||
    userLower.includes("sylhet") ||
    userLower.includes("rajshahi") ||
    userLower.includes("khulna") ||
    userLower.includes("barishal") ||
    userLower.includes("rangpur") ||
    userLower.includes("mymensingh") ||
    userLower.includes("comilla") ||
    userLower.includes("cumilla")

  if (isCandidateInBD && jobLower.includes("dhaka")) {
    return true
  }

  return false
}

/**
 * Checks if a remote job has restrictive geographic constraints (e.g. US Only, UK Only)
 * that disqualify a candidate living in a different country/region
 */
export function isGeoDisqualified(job: { location?: string; title?: string; description?: string }, userLocation?: string): boolean {
  if (!userLocation) return false
  const userLocLower = userLocation.toLowerCase()
  const loc = (job.location || "").toLowerCase().trim()
  const text = `${job.location || ""} ${job.title || ""} ${job.description || ""}`.toLowerCase()

  // Detect if candidate is in Bangladesh / South Asia
  const isCandidateInBD =
    userLocLower.includes("bangladesh") ||
    userLocLower.includes("bd") ||
    userLocLower.includes("dhaka") ||
    userLocLower.includes("sylhet") ||
    userLocLower.includes("chittagong") ||
    userLocLower.includes("rajshahi") ||
    userLocLower.includes("khulna")

  if (isCandidateInBD) {
    const isGlobal =
      loc.includes("worldwide") ||
      loc.includes("anywhere") ||
      loc.includes("global") ||
      loc === "remote" ||
      loc === ""

    if (!isGlobal) {
      // Disqualify jobs explicitly restricted to distant continents/regions
      const nonApacRegions = [
        "latam",
        "latin america",
        "south america",
        "brazil",
        "mexico",
        "argentina",
        "colombia",
        "chile",
        "emea",
        "europe",
        "germany",
        "uk",
        "united kingdom",
        "london",
        "france",
        "spain",
        "poland",
        "netherlands",
        "canada",
        "usa",
        "us",
        "united states",
        "north america",
      ]

      const isRestricted = nonApacRegions.some((reg) => {
        const regex = new RegExp(`(^|[^a-z])${reg}([^a-z]|$)`, "i")
        return regex.test(loc)
      })

      if (isRestricted) {
        return true
      }
    }
  }

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
