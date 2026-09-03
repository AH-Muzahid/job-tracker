/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma, withDbRetry } from "@/lib/prisma"
import { executeCreateApplication } from "./job-tools"
import { toCanonical } from "@/lib/ai/knowledge-graph"
import { getUserMacroOutcomes } from "@/lib/ai/learning-engine"

// Re-export all sub-modules for seamless backward-compatibility across the application
export * from "@/lib/discovery/types"
export * from "@/lib/discovery/matching"
export * from "@/lib/discovery/scrapers"

import { ExternalJobOpportunity } from "@/lib/discovery/types"
import {
  normalizeCompany,
  extractSearchTokens,
  detectJobWorkMode,
  checkLocationMatch,
  isNationalTechHubMatch,
  isGeoDisqualified,
} from "@/lib/discovery/matching"
import { fetchMultiBoardOpportunities } from "@/lib/discovery/scrapers"

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
      const description = String(job.description || "")
      const tags = Array.isArray(job.tags) ? job.tags : []

      // If user performed an explicit keyword/tag search, require at least one token match
      if (isExplicitSearch && searchTokens.length > 0) {
        const targetText = `${position} ${company} ${jobLocation} ${tags.join(" ")}`.toLowerCase()
        const hasMatch = searchTokens.some((token) => targetText.includes(token))
        if (!hasMatch) {
          continue
        }
      }

      // =========================================================================
      // STAGE 1: HARD DISQUALIFICATION GATE (Strict Elimination)
      // Eliminates non-viable jobs before scoring so the feed contains zero junk
      // =========================================================================

      const jobWorkMode = detectJobWorkMode({ location: jobLocation, title: position, description, sourceBoard: job.sourceBoard })
      const isLocationMatch = userLocation ? checkLocationMatch(jobLocation, userLocation) : false
      const isStrictCityMatch = userLocation
        ? checkLocationMatch(jobLocation, userLocation, { strictCity: true })
        : false
      const isNationalHub = isNationalTechHubMatch(jobLocation, userLocation)
      const isViableLocalMatch = isStrictCityMatch || isNationalHub

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

        // Gate 1B: On-site candidate in city X will NEVER see on-site or hybrid jobs in distant foreign locations
        // Allows local city match OR national tech hub like Dhaka for Bangladesh candidates
        if (userWorkPreference === "onsite" && (jobWorkMode === "onsite" || jobWorkMode === "hybrid") && !isViableLocalMatch && userLocation) {
          continue
        }

        // Gate 1C: Hybrid candidate in city X will NEVER see hybrid or on-site jobs in distant foreign locations
        if (userWorkPreference === "hybrid" && (jobWorkMode === "hybrid" || jobWorkMode === "onsite") && !isViableLocalMatch && userLocation) {
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
        if (isStrictCityMatch && jobWorkMode === "onsite") {
          locationScore = 30
          locationRationale = `Direct Local On-site match in ${userLocation}`
        } else if (isStrictCityMatch && jobWorkMode === "hybrid") {
          locationScore = 26
          locationRationale = `Local Hybrid match in ${userLocation}`
        } else if (isNationalHub && (jobWorkMode === "onsite" || jobWorkMode === "hybrid")) {
          locationScore = 25
          locationRationale = `Dhaka Tech Hub: Primary tech opening in Bangladesh (Accessible from ${userLocation})`
        } else if (jobWorkMode === "remote") {
          locationScore = 15
          locationRationale = "Remote work option (flexible alternative)"
        }
      } else if (userWorkPreference === "hybrid") {
        if (isStrictCityMatch && jobWorkMode === "hybrid") {
          locationScore = 30
          locationRationale = `Direct Local Hybrid match in ${userLocation}`
        } else if (isStrictCityMatch && jobWorkMode === "onsite") {
          locationScore = 26
          locationRationale = `Local On-site in ${userLocation}`
        } else if (isNationalHub && (jobWorkMode === "hybrid" || jobWorkMode === "onsite")) {
          locationScore = 24
          locationRationale = `Dhaka Tech Hub: Primary tech opening in Bangladesh (Accessible from ${userLocation})`
        } else if (jobWorkMode === "remote") {
          locationScore = 20
          locationRationale = "Remote flexibility (alternative to Hybrid)"
        }
      } else {
        // "open" or unspecified
        if (isStrictCityMatch) {
          locationScore = 30
          locationRationale = `Local opportunity in ${userLocation}`
        } else if (isNationalHub) {
          locationScore = 28
          locationRationale = "Dhaka Tech Hub opportunity in Bangladesh"
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
        if (penalizedSkills.has(tag)) {
          winningBoost -= 8
        }
      })

      const baseSkillScore = Math.min(32, matchedSkillCount * 8)
      const skillScore = Math.max(0, Math.min(40, baseSkillScore + winningBoost))

      // Factor 3: Target Role Alignment (up to 20 pts)
      let roleScore = 0
      const posLower = position.toLowerCase()
      if (primaryTargetRole && posLower.includes(primaryTargetRole.toLowerCase())) {
        roleScore = 20
      } else if (
        Array.from(userSkills).some(
          (s) => posLower.includes(s) && ["frontend", "backend", "fullstack", "devops", "engineer", "developer", "lead"].includes(s)
        )
      ) {
        roleScore = 14
      } else {
        roleScore = 6
      }

      // Historical role bonus: if candidate historically won interviews in this role
      if (winningRoles.some((wr) => posLower.includes(wr))) {
        roleScore = Math.min(20, roleScore + 6)
      }

      // Factor 4: Compensation & Trust (up to 10 pts)
      let trustScore = 4
      if (job.salaryMin || job.salaryMax) trustScore += 4
      if (winningCompanies.has(normalizeCompany(company))) trustScore += 2

      // Compute Adaptive Fit Score (Baseline 50 to guaranteed ceiling 99)
      const rawFitScore = 50 + Math.round((locationScore + skillScore + roleScore + trustScore) * 0.49)
      const finalFitScore = Math.max(50, Math.min(99, rawFitScore))

      // Compose human-readable, intelligent Match Rationale
      const rationaleParts: string[] = []
      if (locationRationale) rationaleParts.push(locationRationale)

      if (matchedWinningSkills.length > 0) {
        rationaleParts.push(`Boosted by proven interview strengths: ${matchedWinningSkills.join(", ")}`)
      } else if (matchedSkillNames.length > 0) {
        rationaleParts.push(`Matches skills: ${matchedSkillNames.slice(0, 3).join(", ")}`)
      }

      if (winningCompanies.has(normalizeCompany(company))) {
        rationaleParts.push(`Prior interview success with ${company}`)
      }

      const matchRationale = rationaleParts.length > 0
        ? rationaleParts.join(" • ")
        : `Strong ${position} opportunity aligned with your experience profile.`

      let salaryDisplay: string | undefined = job.salaryText
      if (!salaryDisplay && (job.salaryMin || job.salaryMax)) {
        if (job.salaryMin && job.salaryMax) {
          salaryDisplay = `$${Math.round(job.salaryMin / 1000)}k - $${Math.round(job.salaryMax / 1000)}k`
        } else if (job.salaryMin) {
          salaryDisplay = `From $${Math.round(job.salaryMin / 1000)}k`
        }
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

    // Graceful Recovery: If strict local filter yielded 0 results, unlock high-fit Remote roles
    if (scoredOpportunities.length === 0 && (userWorkPreference === "onsite" || userWorkPreference === "hybrid")) {
      for (const job of rawJobs) {
        const jobLocation = job.location || "Remote"
        const position = job.title || "Software Engineer"
        const company = job.company || "Innovative Tech"
        const description = job.description || ""
        const tags = job.tags || []
        const jobWorkMode = detectJobWorkMode({ location: jobLocation, title: position, description, sourceBoard: job.sourceBoard })

        // Only include Remote roles that are not geo-disqualified for the candidate
        if (jobWorkMode === "remote" && !isGeoDisqualified({ location: jobLocation, title: position, description }, userLocation)) {
          let matchedCount = 0
          tags.forEach((t: string) => {
            if (userSkills.has(t)) matchedCount++
          })
          const fallbackFitScore = Math.min(84, Math.max(62, 60 + matchedCount * 6))

          scoredOpportunities.push({
            id: job.id,
            title: position,
            company,
            location: jobLocation,
            url: job.url || `https://www.google.com/search?q=${encodeURIComponent(`${company} ${position}`)}`,
            sourceBoard: job.sourceBoard,
            tags,
            salary: job.salaryText || undefined,
            fitScore: fallbackFitScore,
            matchRationale: `Remote Backup: No direct local ${userWorkPreference} roles currently found in ${userLocation || "your area"}. Matched on ${matchedCount > 0 ? "your core skills" : "relevant tech stack"}.`,
            descriptionSnippet: description.slice(0, 220) + "...",
          })
        }
      }
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
