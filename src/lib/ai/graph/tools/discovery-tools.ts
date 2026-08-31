/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma, withDbRetry } from "@/lib/prisma"
import { executeCreateApplication } from "./job-tools"
import { toCanonical } from "@/lib/ai/knowledge-graph"

export interface ExternalJobOpportunity {
  id: string
  title: string
  company: string
  location: string
  url: string
  tags: string[]
  salary?: string
  fitScore: number
  matchRationale: string
  descriptionSnippet: string
}

const FALLBACK_OPPORTUNITIES = [
  {
    id: "fb_1",
    position: "Senior Full Stack Engineer (React / Go)",
    company: "Stripe",
    location: "Remote",
    url: "https://stripe.com/jobs",
    tags: ["react", "go", "typescript", "postgresql", "redis"],
    salary_min: 160000,
    salary_max: 210000,
    description: "Building next-generation global financial infrastructure using React, TypeScript, and Go microservices.",
  },
  {
    id: "fb_2",
    position: "Senior Frontend Engineer (Next.js & Design Systems)",
    company: "Vercel",
    location: "Remote",
    url: "https://vercel.com/careers",
    tags: ["nextjs", "react", "typescript", "tailwind", "ui"],
    salary_min: 150000,
    salary_max: 195000,
    description: "Leading frontend engineering initiatives with Next.js App Router, Tailwind CSS, and performance optimization.",
  },
  {
    id: "fb_3",
    position: "AI Systems & Backend Engineer",
    company: "Anthropic",
    location: "Remote / Hybrid",
    url: "https://anthropic.com/careers",
    tags: ["python", "typescript", "langgraph", "llm", "postgresql"],
    salary_min: 180000,
    salary_max: 240000,
    description: "Architecting autonomous AI agent pipelines, state machines, and high-reliability data platforms.",
  },
  {
    id: "fb_4",
    position: "Staff Backend Engineer (Distributed Systems)",
    company: "Airbnb",
    location: "Remote",
    url: "https://airbnb.com/careers",
    tags: ["go", "kubernetes", "distributed-systems", "redis", "postgresql"],
    salary_min: 190000,
    salary_max: 250000,
    description: "Scaling distributed caching systems and booking engines handling hundreds of thousands of requests per second.",
  },
]

/**
 * Searches external job opportunities and computes tailored Fit Scores against user profile & resume
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
    // 1. Fetch user profile & resume for deterministic skill matching
    const [profile, resume] = await Promise.all([
      withDbRetry<any>(() => prisma.userProfile.findUnique({ where: { userId } })),
      withDbRetry<any>(() => prisma.resume.findFirst({ where: { userId, isDefault: true } })),
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

    // 2. Fetch live jobs from RemoteOK (or fallback)
    let rawJobs: any[] = []
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)

      const tagParam = input.tags?.[0] || input.query?.split(" ")[0] || "engineer"
      const res = await fetch(`https://remoteok.com/api?tag=${encodeURIComponent(tagParam)}`, {
        signal: controller.signal,
        headers: { "User-Agent": "CareerTrack-Discovery-Agent/1.0" },
      })
      clearTimeout(timeout)

      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          // Remove legal disclaimer object at index 0 if present
          rawJobs = data.filter((item) => item.position && item.company)
        }
      }
    } catch {
      // Fallback
    }

    if (!rawJobs || rawJobs.length === 0) {
      rawJobs = FALLBACK_OPPORTUNITIES
    }

    // 3. Filter and Calculate Fit Score
    const searchTerms = [
      input.query?.toLowerCase(),
      ...(input.tags || []).map((t) => t.toLowerCase()),
    ].filter(Boolean) as string[]

    const scoredOpportunities: ExternalJobOpportunity[] = []

    for (const job of rawJobs) {
      const position = String(job.position || "")
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
            tags.some((t: string) => t.includes(term))
        )
        if (!matchesQuery && rawJobs !== FALLBACK_OPPORTUNITIES) {
          continue
        }
      }

      // Calculate Match Score
      let matchedSkillCount = 0
      const matchedSkillNames: string[] = []

      tags.forEach((tag: string) => {
        if (userSkills.has(tag)) {
          matchedSkillCount++
          matchedSkillNames.push(tag)
        }
      })

      // Bonus if target role matches position
      let roleBonus = 0
      if (profile?.targetRoles?.some((tr: string) => position.toLowerCase().includes(tr.toLowerCase()))) {
        roleBonus = 20
      }

      const baseFit = Math.min(60, matchedSkillCount * 15)
      const finalFitScore = Math.min(98, Math.max(45, baseFit + roleBonus + (job.salary_min ? 10 : 0)))

      let matchRationale = ""
      if (matchedSkillNames.length > 0) {
        matchRationale = `Matched on core skills: ${matchedSkillNames.slice(0, 4).join(", ")}.`
      } else {
        matchRationale = `Matches target career trajectory in ${position.slice(0, 35)}.`
      }

      let salaryDisplay: string | undefined = undefined
      if (job.salary_min && job.salary_max) {
        salaryDisplay = `$${Math.round(job.salary_min / 1000)}k - $${Math.round(job.salary_max / 1000)}k`
      }

      scoredOpportunities.push({
        id: String(job.id || job.url || `${company}-${position}`),
        title: position,
        company,
        location,
        url: job.url || `https://www.google.com/search?q=${encodeURIComponent(`${company} ${position}`)}`,
        tags,
        salary: salaryDisplay,
        fitScore: finalFitScore,
        matchRationale,
        descriptionSnippet: description.slice(0, 220) + "...",
      })
    }

    // Sort by fit score descending
    scoredOpportunities.sort((a, b) => b.fitScore - a.fitScore)
    const limit = input.limit || 5
    const results = scoredOpportunities.slice(0, limit)

    return {
      success: true,
      count: results.length,
      query: input.query || input.tags?.join(", ") || "Recommended Roles",
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
    "Discovered via CareerTrack Autonomous Job Discovery Engine",
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
