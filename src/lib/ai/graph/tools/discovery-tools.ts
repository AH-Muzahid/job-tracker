/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma, withDbRetry } from "@/lib/prisma"
import { executeCreateApplication } from "./job-tools"
import { toCanonical, CANONICAL_ALIASES } from "@/lib/ai/knowledge-graph"
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
 * Accurately detects required seniority level from job title and description
 */
export function detectJobSeniority(title: string, description?: string): "entry" | "junior" | "mid" | "senior" | "lead" {
  const t = title.toLowerCase()
  const d = (description || "").toLowerCase()

  if (/\b(intern|internship|trainee|fresher)\b/i.test(t)) return "entry"
  if (/\b(junior|jr\.?|jr\b|associate|entry-level|entry level|graduate)\b/i.test(t)) return "junior"
  if (/\b(staff|principal|director|head of|vp|vp of|fellow)\b/i.test(t)) return "lead"
  if (/\b(lead|team lead|tech lead|architect)\b/i.test(t)) return "lead"
  if (/\b(senior|sr\.?|sr\b|lead engineer|expert|specialist)\b/i.test(t)) return "senior"

  if (/\b([0-1]|one)\+?\s*years?\s*(of\s*)?experience\b/i.test(d)) return "junior"
  if (/\b([2-4]|two|three|four)\+?\s*years?\s*(of\s*)?experience\b/i.test(d)) return "mid"
  if (/\b([5-9]|1[0-9]|five|six|seven|eight|ten)\+?\s*years?\s*(of\s*)?experience\b/i.test(d)) return "senior"

  return "mid"
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
    const projectProvenSkills = new Set<string>()

    if (profile?.bestProjects && Array.isArray(profile.bestProjects)) {
      profile.bestProjects.forEach((p: any) => {
        if (p.stack) {
          p.stack.split(/[,/|\n]+/).forEach((s: string) => {
            const canonical = toCanonical(s.trim())
            if (canonical.length > 1) {
              userSkills.add(canonical)
              projectProvenSkills.add(canonical)
            }
          })
        }
      })
    }

    if (profile?.strengths) {
      profile.strengths.split(/[,/|\n]+/).forEach((s: string) => {
        const canonical = toCanonical(s.trim())
        if (canonical.length > 1) userSkills.add(canonical)
      })
    }
    if (resume?.textContent) {
      const canonicalTokens = resume.textContent.toLowerCase().match(/[a-z0-9+#.-]+/g) || []
      canonicalTokens.forEach((tok: string) => {
        if (CANONICAL_ALIASES[tok]) {
          userSkills.add(CANONICAL_ALIASES[tok])
        }
      })
    }

    // Set of winning skills and roles from historical interview/offer outcomes
    const winningSkills = new Set((macroOutcomes?.winningSkills || []).map((s) => toCanonical(s)))
    const winningRoles = (macroOutcomes?.winningRoles || []).map((r) => r.toLowerCase())
    const winningCompanies = new Set((macroOutcomes?.winningCompanies || []).map((c) => normalizeCompany(c)))
    void winningCompanies
    const penalizedSkills = new Set((macroOutcomes?.penalizedSkills || []).map((s) => toCanonical(s)))

    // 2. Derive targeted query, tags, and location dynamically from User Profile & Resume
    // HIGHEST PRIORITY: User's location & work mode preference (remote / onsite / hybrid)
    const userWorkPreference = (profile?.workPreference || "open").toLowerCase() // "remote" | "hybrid" | "onsite" | "open"
    const userLocation = profile?.location?.trim() || ""
    const userExperienceLevel = (profile?.experienceLevel || "mid").toLowerCase() // "entry" | "junior" | "mid" | "senior" | "lead"
    const userStatus = (profile?.currentStatus || "").toLowerCase()
    const bestProjects = Array.isArray(profile?.bestProjects) ? profile.bestProjects : []

    // SECOND PRIORITY: Targeted role & core skill tokens
    const primaryTargetRole = profile?.targetRoles?.[0] || ""
    const targetRolesLower = (profile?.targetRoles || []).map((r: string) => r.toLowerCase())
    const primarySkill = Array.from(userSkills)[0] || "developer"

    let query = input.query || ""
    const tagParam = input.tags?.[0] || primarySkill || "dev"
    let location = input.location || userLocation

    if (!input.query) {
      const isEarlyCareer = userExperienceLevel === "junior" || userExperienceLevel === "entry" || userStatus.includes("studying")
      const rolePrefix = isEarlyCareer ? "junior " : ""
      if (userWorkPreference === "remote") {
        query = primaryTargetRole ? `${rolePrefix}${primaryTargetRole} remote` : `${rolePrefix}${primarySkill} remote`
        location = "Remote"
      } else if (userWorkPreference === "onsite" && userLocation) {
        query = primaryTargetRole ? `${rolePrefix}${primaryTargetRole} in ${userLocation}` : `${rolePrefix}${primarySkill} in ${userLocation}`
        location = userLocation
      } else if (userWorkPreference === "hybrid" && userLocation) {
        query = primaryTargetRole ? `${rolePrefix}${primaryTargetRole} hybrid in ${userLocation}` : `${rolePrefix}${primarySkill} hybrid in ${userLocation}`
        location = userLocation
      } else {
        query = primaryTargetRole ? `${rolePrefix}${primaryTargetRole}` : primarySkill
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
        if (userWorkPreference === "remote" && jobWorkMode !== "remote") {
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

        // Gate 1E: Candidate targeting tech/software roles will NEVER see non-tech positions (e.g. janitor, clerk, merchandiser)
        const isTechCandidate =
          targetRolesLower.some((r: string) =>
            /developer|engineer|programmer|designer|fullstack|frontend|backend|devops|data|ai|software|tech|architect|analyst|qa/.test(r)
          ) || userSkills.size > 0

        if (isTechCandidate) {
          const techRegex =
            /\b(software|developer|engineer|programmer|frontend|front-end|backend|back-end|fullstack|full-stack|devops|web|ui|ux|react|next\.?js|node|typescript|javascript|python|golang|go|rust|java|c\+\+|aws|cloud|architect|data|qa|sre|mobile|android|ios|tech|lead)\b/i
          const isTechTitle =
            techRegex.test(position) ||
            targetRolesLower.some((role: string) => position.toLowerCase().includes(role))

          if (!isTechTitle) {
            continue
          }

          // Gate 1E-2: Specific Domain Disqualifications
          const wantsQA = targetRolesLower.some((r: string) => /qa|test|tester|quality/.test(r)) || userSkills.has("qa")
          if (!wantsQA && /\b(qa|tester|test engineer|quality assurance|sdet)\b/i.test(position)) {
            continue
          }

          const wantsLegacy = targetRolesLower.some((r: string) => /rpg|as400|mainframe|sap|cobol|erp/.test(r)) || userSkills.has("rpg") || userSkills.has("as400") || userSkills.has("sap")
          if (!wantsLegacy && /\b(rpg|as400|as\/400|jd edwards|cobol|sap|abap|mainframe)\b/i.test(position)) {
            continue
          }
        }
      }

      // Extract candidate skills present across title, description, and tags
      const jobSearchText = `${position} ${description} ${tags.join(" ")}`.toLowerCase()
      const jobTokens = new Set<string>()
      tags.forEach((t) => jobTokens.add(toCanonical(t)))
      const matchedSkillNamesSet = new Set<string>()

      userSkills.forEach((skill) => {
        if (!skill || skill.length < 2) return
        const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const regex = new RegExp(`(^|[^a-z0-9+#.-])${escaped}([^a-z0-9+#.-]|$)`, "i")
        if (regex.test(jobSearchText) || jobTokens.has(skill)) {
          matchedSkillNamesSet.add(skill)
        }
      })

      const matchedSkillNames = Array.from(matchedSkillNamesSet)

      // Gate 1F: Two-Stage Elimination - Candidate Profile Relevance Gate
      // A job MUST have at least 1 verified skill match OR direct target role match
      if (!isExplicitSearch && (targetRolesLower.length > 0 || userSkills.size > 0)) {
        const posLower = position.toLowerCase()
        const hasTargetRoleMatch =
          (primaryTargetRole && posLower.includes(primaryTargetRole.toLowerCase())) ||
          targetRolesLower.some((r: string) => posLower.includes(r))
        const hasSkillMatch = matchedSkillNames.length > 0
        const isSalesforceOrArchitect = /\b(salesforce|crm|solutions architect|enterprise architect)\b/i.test(position)

        if (!hasTargetRoleMatch && !hasSkillMatch && !isSalesforceOrArchitect) {
          continue // Strictly eliminated in Stage 1!
        }
      }

      // =========================================================================
      // STAGE 2: MULTI-FACTOR FIT SCORING & IN-DEPTH PERSONALIZATION (Scale: 50% - 99%)
      // 1. Location & Work Arrangement (up to 20 pts)
      // 2. Skill Alignment & Macro-Learning (up to 35 pts)
      // 3. Targeted Role & Domain Alignment (up to 20 pts)
      // 4. Seniority & Experience Level Fit (up to 25 pts)
      // =========================================================================

      // Factor 1: Location & Work Mode Fit (up to 20 pts)
      let locationScore = 0
      let locationRationale = ""

      if (userWorkPreference === "remote") {
        if (jobWorkMode === "remote") {
          locationScore = 20
          locationRationale = "100% Global Remote (Bangladesh compatible)"
        } else if (isLocationMatch) {
          locationScore = 15
          locationRationale = `Local Hybrid in ${userLocation}`
        }
      } else if (userWorkPreference === "onsite") {
        if (isStrictCityMatch && jobWorkMode === "onsite") {
          locationScore = 20
          locationRationale = `Direct Local On-site match in ${userLocation}`
        } else if (isStrictCityMatch && jobWorkMode === "hybrid") {
          locationScore = 18
          locationRationale = `Local Hybrid match in ${userLocation}`
        } else if (isNationalHub && (jobWorkMode === "onsite" || jobWorkMode === "hybrid")) {
          locationScore = 17
          locationRationale = `Dhaka Tech Hub opening (Accessible from ${userLocation})`
        } else if (jobWorkMode === "remote") {
          locationScore = 12
          locationRationale = "Remote work option (flexible alternative)"
        }
      } else if (userWorkPreference === "hybrid") {
        if (isStrictCityMatch && jobWorkMode === "hybrid") {
          locationScore = 20
          locationRationale = `Direct Local Hybrid match in ${userLocation}`
        } else if (isStrictCityMatch && jobWorkMode === "onsite") {
          locationScore = 18
          locationRationale = `Local On-site in ${userLocation}`
        } else if (isNationalHub && (jobWorkMode === "hybrid" || jobWorkMode === "onsite")) {
          locationScore = 17
          locationRationale = `Dhaka Tech Hub opening (Accessible from ${userLocation})`
        } else if (jobWorkMode === "remote") {
          locationScore = 14
          locationRationale = "Remote flexibility (alternative to Hybrid)"
        }
      } else {
        if (isStrictCityMatch) {
          locationScore = 20
          locationRationale = `Local opportunity in ${userLocation}`
        } else if (isNationalHub) {
          locationScore = 18
          locationRationale = "Dhaka Tech Hub opportunity in Bangladesh"
        } else if (jobWorkMode === "remote") {
          locationScore = 18
          locationRationale = "Global Remote opportunity"
        } else {
          locationScore = 10
          locationRationale = `Location: ${jobLocation}`
        }
      }

      // Factor 2: Skill Match & Demonstrated Project Proof (up to 35 pts)
      // Skills demonstrated in actual projects (bestProjects) get 3x the weight of flat declared skills!
      let winningBoost = 0
      const matchedWinningSkills: string[] = []
      let projectProvenCount = 0
      let declaredOnlyCount = 0

      matchedSkillNames.forEach((skill) => {
        if (projectProvenSkills.has(skill)) {
          projectProvenCount++
        } else {
          declaredOnlyCount++
        }
        if (winningSkills.has(skill)) {
          winningBoost += 6
          matchedWinningSkills.push(skill)
        }
        if (penalizedSkills.has(skill)) {
          winningBoost -= 6
        }
      })

      // Project-demonstrated skills carry heavy weight (6.5 pts each), flat declared skills carry 2.5 pts each
      const rawSkillPoints = (projectProvenCount * 6.5) + (declaredOnlyCount * 2.5)
      const skillScore = Math.max(0, Math.min(35, rawSkillPoints + winningBoost))

      // Factor 3: Target Role Alignment (up to 20 pts)
      let roleScore = 0
      let roleRationale = ""
      const posLower = position.toLowerCase()
      if (primaryTargetRole && posLower.includes(primaryTargetRole.toLowerCase())) {
        roleScore = 20
        roleRationale = `Target match for "${primaryTargetRole}"`
      } else {
        const matchedTargetRole = targetRolesLower.find((r: string) => posLower.includes(r))
        if (matchedTargetRole) {
          roleScore = 18
          roleRationale = `Target match for "${matchedTargetRole}"`
        } else if (
          Array.from(userSkills).some(
            (s) => posLower.includes(s) && ["frontend", "backend", "fullstack", "devops", "engineer", "developer", "lead"].includes(s)
          )
        ) {
          roleScore = 14
          roleRationale = "Software engineering profile alignment"
        } else if (/\b(salesforce|crm)\b/i.test(posLower)) {
          roleScore = 14
          roleRationale = "Salesforce & CRM enterprise engineering"
        } else if (/\b(solutions architect|cloud architect)\b/i.test(posLower)) {
          roleScore = 14
          roleRationale = "Solutions & Cloud systems architecture"
        } else {
          roleScore = 8
        }
      }

      if (winningRoles.some((wr) => posLower.includes(wr))) {
        roleScore = Math.min(20, roleScore + 4)
      }

      // Factor 4: Seniority & Experience Level Alignment (up to 25 pts)
      const jobSeniority = detectJobSeniority(position, description)

      // Target Audience Focus: Junior / Early-Career and Junior-to-Mid (0-3 yrs).
      // Disqualify extreme Senior/Staff/Lead roles (6+ years) for Junior/Student candidates
      if ((userExperienceLevel === "junior" || userExperienceLevel === "entry" || userStatus.includes("studying")) && jobSeniority === "lead") {
        continue // Filter out Staff/Lead/Architect clutter for early-career developers
      }

      let experienceScore = 15
      let experienceRationale = ""

      if (userExperienceLevel === "junior" || userExperienceLevel === "entry" || userStatus.includes("studying")) {
        if (jobSeniority === "junior" || jobSeniority === "entry") {
          experienceScore = 25
          experienceRationale = "Junior / Early-career: Ideal seniority match for your current academic & portfolio stage"
        } else if (jobSeniority === "mid") {
          experienceScore = 20
          experienceRationale = "Mid-level growth role: Attainable progression matching your verified full-stack projects"
        } else if (jobSeniority === "senior") {
          experienceScore = 8
          experienceRationale = "Senior position: High seniority requirement; your stack aligns well, but role demands seasoned autonomy"
        } else {
          experienceScore = 3
          experienceRationale = "Staff/Lead position: Demands multi-year enterprise leadership beyond early-career scope"
        }
      } else if (userExperienceLevel === "mid") {
        if (jobSeniority === "mid") {
          experienceScore = 25
          experienceRationale = "Mid-level alignment: Well-suited for your intermediate experience"
        } else if (jobSeniority === "senior") {
          experienceScore = 20
          experienceRationale = "Senior stretch: Great next-step career opportunity"
        } else if (jobSeniority === "junior") {
          experienceScore = 12
          experienceRationale = "Junior role: You may be overqualified for this position"
        } else {
          experienceScore = 10
          experienceRationale = "Leadership position: Requires substantial team lead experience"
        }
      } else {
        if (jobSeniority === "senior" || jobSeniority === "lead") {
          experienceScore = 25
          experienceRationale = "Senior/Lead alignment: Tailored for your experienced leadership profile"
        } else if (jobSeniority === "mid") {
          experienceScore = 15
          experienceRationale = "Mid-level role: Lower seniority than your senior profile"
        } else {
          experienceScore = 6
          experienceRationale = "Junior role: Significantly below your senior experience level"
        }
      }

      // Compute Realistic Calibrated Hiring & Interview Probability (Scale: 50% - 88%)
      // High Interview Odds: 78% - 86% (Requires verified project proof + matching seniority)
      // Solid Match: 68% - 77%
      // Stretch Match: 52% - 66%
      // Compute Realistic Calibrated Hiring & Interview Probability (Scale: 50% - 88%)
      // High Interview Odds: 78% - 86% (Requires verified project proof + matching seniority)
      // Solid Match: 68% - 77%
      // Stretch Match: 52% - 66%
      const rawPoints = locationScore + skillScore + roleScore + experienceScore
      const finalFitScore = Math.max(50, Math.min(88, 48 + Math.round(rawPoints * 0.40)))

      // Realistic ATS Keyword Matching Simulation (Comparing JD requirements vs Candidate verified skills)
      const ATS_TECH_VOCAB = [
        "react", "next.js", "nextjs", "vue", "angular", "typescript", "javascript", "node", "nodejs",
        "express", "nest", "nestjs", "python", "django", "fastapi", "tailwind", "tailwind css", "css",
        "html", "redux", "zustand", "postgresql", "postgres", "mongodb", "mysql", "prisma", "docker",
        "kubernetes", "aws", "gcp", "azure", "git", "github", "graphql", "rest", "api", "redis",
        "websockets", "websocket", "socket.io", "ci/cd", "jest", "playwright", "cypress", "linux"
      ]

      const jdTechSkills = new Set<string>()
      tags.forEach((t) => {
        const canonical = toCanonical(t)
        if (ATS_TECH_VOCAB.includes(canonical) || ATS_TECH_VOCAB.includes(t.toLowerCase())) {
          jdTechSkills.add(canonical)
        }
      })
      ATS_TECH_VOCAB.forEach((vocab) => {
        const escaped = vocab.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const regex = new RegExp(`(^|[^a-z0-9+#.-])${escaped}([^a-z0-9+#.-]|$)`, "i")
        if (regex.test(jobSearchText)) {
          jdTechSkills.add(toCanonical(vocab))
        }
      })

      const matchedAtsSkills: string[] = []
      const missingAtsSkills: string[] = []

      jdTechSkills.forEach((tech) => {
        if (userSkills.has(tech) || projectProvenSkills.has(tech)) {
          matchedAtsSkills.push(tech)
        } else {
          missingAtsSkills.push(tech)
        }
      })

      let atsScore = 72
      if (jdTechSkills.size > 0) {
        const matchRatio = matchedAtsSkills.length / jdTechSkills.size
        atsScore = Math.round(48 + matchRatio * 44) // Realistic ATS Scale: 48% - 92%
      } else if (matchedSkillNames.length > 0) {
        atsScore = Math.min(86, 62 + matchedSkillNames.length * 6)
      }

      // Personalization: Matching candidate's bestProjects to the job
      let projectRecommendation = ""
      const fullJobText = `${position} ${description}`.toLowerCase()
      if (bestProjects.length > 0) {
        if (fullJobText.includes("docker") || fullJobText.includes("websocket") || fullJobText.includes("realtime") || fullJobText.includes("real-time") || fullJobText.includes("competitive")) {
          const codeArena = bestProjects.find((p: any) => p.name?.toLowerCase().includes("codearena"))
          if (codeArena) {
            projectRecommendation = "Highlight your 'CodeArena' platform to demonstrate production Docker code execution and real-time WebSocket capabilities."
          }
        } else if (fullJobText.includes("stripe") || fullJobText.includes("payment") || fullJobText.includes("fintech") || fullJobText.includes("loan")) {
          const loanLink = bestProjects.find((p: any) => p.name?.toLowerCase().includes("loanlink") || p.name?.toLowerCase().includes("finease"))
          if (loanLink) {
            projectRecommendation = `Feature your '${loanLink.name}' application to prove experience with financial workflows, Stripe payments, and secure state handling.`
          }
        } else {
          const firstProject = bestProjects[0]
          if (firstProject?.name) {
            projectRecommendation = `Showcase your '${firstProject.name}' project in your application to validate hands-on ${firstProject.stack?.split(",").slice(0, 3).join(", ")} mastery.`
          }
        }
      }

      // Generate Actionable Author Outreach Pitch for LinkedIn Founder/HR posts or Company Portals
      let outreachPitch: string | undefined = undefined
      if (job.authorName || job.sourceBoard === "linkedin_post" || job.sourceBoard === "company_portal") {
        const authorFirstName = (job.authorName || "Hiring Lead").split(" ")[0].replace(/[^a-zA-Z]/g, "")
        const topProject = bestProjects[0]
        const topProjName = topProject?.name || "CodeArena"
        const matchedTechString = matchedSkillNames.slice(0, 3).join(", ") || "React, Next.js"

        outreachPitch = `Hi ${authorFirstName}, I saw your opening for ${position} at ${company}. I've recently built ${topProjName} with ${matchedTechString}. Would love to share my GitHub and discuss how my hands-on build experience aligns with your team!`
      }

      // Compose detailed, multi-dimensional AI Match Rationale
      const rationaleParts: string[] = []

      if (roleRationale) {
        rationaleParts.push(`🎯 Role Match: ${roleRationale}`)
      }

      if (matchedWinningSkills.length > 0) {
        rationaleParts.push(`⚡ Proven Strengths: ${matchedWinningSkills.slice(0, 3).join(", ")}`)
      } else if (matchedSkillNames.length > 0) {
        const provenTag = projectProvenCount > 0 ? " (Project Proven)" : ""
        rationaleParts.push(`⚡ Tech Stack: ${matchedSkillNames.slice(0, 5).join(", ")}${provenTag}`)
      }

      if (experienceRationale) {
        rationaleParts.push(`🎓 Experience Fit: ${experienceRationale}`)
      }

      if (locationRationale) {
        rationaleParts.push(`🌍 Location: ${locationRationale}`)
      }

      // Explicit ATS Match in Rationale
      const atsDetail = matchedAtsSkills.length > 0 ? `Matched: ${matchedAtsSkills.slice(0, 4).join(", ")}` : "Baseline keyword alignment"
      const missingDetail = missingAtsSkills.length > 0 ? ` | Missing: ${missingAtsSkills.slice(0, 3).join(", ")}` : ""
      rationaleParts.push(`📋 ATS Compatibility: ${atsScore}% (${atsDetail}${missingDetail})`)

      if (projectRecommendation) {
        rationaleParts.push(`💡 Strategy Tip: ${projectRecommendation}`)
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
        authorName: job.authorName,
        authorUrl: job.authorUrl,
        outreachPitch,
        atsScore,
        missingKeywords: missingAtsSkills.slice(0, 5),
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
