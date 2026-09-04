/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma, withDbRetry } from "@/lib/prisma"
import { getCachedJson, setCachedJson, invalidateCache } from "@/lib/redis"
import { toCanonical } from "@/lib/ai/knowledge-graph"

export interface UserImplicitPreferences {
  userId: string
  updatedAt: string

  // Positive learned affinities (derived from saved & applied opportunities)
  favoredSkills: Record<string, number> // canonical skill -> weighted count
  favoredRoles: Record<string, number> // role token -> weighted count
  favoredCompanies: Record<string, number> // company -> count
  favoredWorkModes: Record<string, number> // remote | hybrid | onsite -> count

  // Negative learned aversions (derived from dismissed opportunities with reasons)
  dislikedRoles: Record<string, number> // role token -> weighted count
  dislikedSkills: Record<string, number> // canonical skill -> weighted count
  dislikedCompanies: Record<string, number> // company -> count
  dislikedLocations: Record<string, number> // location / city -> count
  averseToOnsite: boolean

  // Volume & breakdown stats
  totalSaved: number
  totalDismissed: number
  totalApplied: number
  dismissReasons: Record<string, number>
}

export interface ImplicitScoreAdjustment {
  scoreDelta: number
  boostPoints: number
  penaltyPoints: number
  reasons: string[]
}

const COMMON_ROLE_TOKENS = [
  "frontend", "front-end", "backend", "back-end", "fullstack", "full-stack",
  "devops", "sre", "cloud", "data", "ai", "machine learning", "ml",
  "salesforce", "mobile", "ios", "android", "qa", "security", "sysadmin", "systems",
]

function extractRoleTokens(title: string): string[] {
  const lower = title.toLowerCase()
  const tokens = new Set<string>()
  for (const rt of COMMON_ROLE_TOKENS) {
    if (lower.includes(rt)) {
      tokens.add(toCanonical(rt))
    }
  }
  return Array.from(tokens)
}

/**
 * Calculates time-decay weight for interactions.
 * Interactions within the last 14 days have full weight (1.0).
 * Interactions between 15 and 45 days decay to 0.6.
 */
function getDecayWeight(createdAt: Date, now: Date): number {
  const ageDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  if (ageDays <= 14) return 1.0
  if (ageDays <= 45) return 0.6
  return 0.2 // Older than 45 days decays heavily
}

/**
 * Derives dynamic user implicit preferences by analyzing recent UserJobMatch
 * and DiscoveryEvent interactions across a 45-day rolling window.
 */
export async function getUserImplicitPreferences(userId: string): Promise<UserImplicitPreferences> {
  const cacheKey = `user:implicit-pref:${userId}`
  const cached = await getCachedJson<UserImplicitPreferences>(cacheKey)
  if (cached) return cached

  const emptyPreferences: UserImplicitPreferences = {
    userId,
    updatedAt: new Date().toISOString(),
    favoredSkills: {},
    favoredRoles: {},
    favoredCompanies: {},
    favoredWorkModes: {},
    dislikedRoles: {},
    dislikedSkills: {},
    dislikedCompanies: {},
    dislikedLocations: {},
    averseToOnsite: false,
    totalSaved: 0,
    totalDismissed: 0,
    totalApplied: 0,
    dismissReasons: {},
  }

  if (!prisma?.userJobMatch) {
    return emptyPreferences
  }

  const now = new Date()
  const windowStart = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000)

  // 1. Fetch UserJobMatch interactions within rolling window with linked CanonicalJob
  const matches = await withDbRetry<any[]>(() =>
    prisma.userJobMatch.findMany({
      where: {
        userId,
        updatedAt: { gte: windowStart },
      },
      include: {
        job: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 150,
    })
  ).catch((err) => {
    console.warn(`[ImplicitPrefs] Failed to fetch UserJobMatches for user ${userId}:`, err)
    return []
  })

  // 2. Fetch DiscoveryEvents to capture application clicks and undismissed flows
  const events = await withDbRetry<any[]>(() =>
    prisma.discoveryEvent.findMany({
      where: {
        userId,
        createdAt: { gte: windowStart },
        eventType: { in: ["JOB_SAVED", "JOB_DISMISSED", "JOB_APPLIED", "JOB_CLICK_EXTERNAL"] },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    })
  ).catch((err) => {
    console.warn(`[ImplicitPrefs] Failed to fetch DiscoveryEvents for user ${userId}:`, err)
    return []
  })

  const favoredSkills: Record<string, number> = {}
  const favoredRoles: Record<string, number> = {}
  const favoredCompanies: Record<string, number> = {}
  const favoredWorkModes: Record<string, number> = {}

  const dislikedRoles: Record<string, number> = {}
  const dislikedSkills: Record<string, number> = {}
  const dislikedCompanies: Record<string, number> = {}
  const dislikedLocations: Record<string, number> = {}
  const dismissReasons: Record<string, number> = {}

  let totalSaved = 0
  let totalDismissed = 0
  let totalApplied = 0
  let wrongLocationOnsiteCount = 0

  // Process UserJobMatch entries
  for (const m of matches) {
    const job = m.job
    if (!job) continue

    const weight = getDecayWeight(new Date(m.updatedAt || m.createdAt), now)
    const roleTokens = extractRoleTokens(job.title)
    const company = (job.company || "").trim().toLowerCase()

    if (m.isSaved || m.status === "SAVED") {
      totalSaved++
      if (company) favoredCompanies[company] = (favoredCompanies[company] || 0) + weight

      for (const token of roleTokens) {
        favoredRoles[token] = (favoredRoles[token] || 0) + weight
      }

      if (Array.isArray(job.tags)) {
        for (const t of job.tags) {
          const canonical = toCanonical(String(t))
          if (canonical.length > 1) {
            favoredSkills[canonical] = (favoredSkills[canonical] || 0) + weight
          }
        }
      }

      const workMode = job.isRemote ? "remote" : "onsite"
      favoredWorkModes[workMode] = (favoredWorkModes[workMode] || 0) + weight
    }

    if (m.status === "DISMISSED") {
      totalDismissed++
      const reason = m.dismissReason || "user_hidden"
      dismissReasons[reason] = (dismissReasons[reason] || 0) + 1

      if (reason === "wrong_role") {
        for (const token of roleTokens) {
          dislikedRoles[token] = (dislikedRoles[token] || 0) + weight
        }
        if (Array.isArray(job.tags)) {
          for (const t of job.tags) {
            const canonical = toCanonical(String(t))
            if (canonical.length > 1) {
              dislikedSkills[canonical] = (dislikedSkills[canonical] || 0) + weight
            }
          }
        }
      } else if (reason === "bad_company") {
        if (company) {
          dislikedCompanies[company] = (dislikedCompanies[company] || 0) + weight
        }
      } else if (reason === "wrong_location") {
        if (!job.isRemote) {
          wrongLocationOnsiteCount += weight
        }
        if (job.location) {
          const loc = job.location.toLowerCase().trim()
          dislikedLocations[loc] = (dislikedLocations[loc] || 0) + weight
        }
      }
    }
  }

  // Process DiscoveryEvents to capture real-time external clicks and direct applies
  for (const ev of events) {
    const meta = (ev.metadata || {}) as Record<string, any>
    const comp = String(meta.companyName || "").toLowerCase().trim()
    const title = String(meta.jobTitle || "")
    const weight = getDecayWeight(new Date(ev.createdAt), now)

    if (ev.eventType === "JOB_APPLIED" || (ev.eventType === "JOB_CLICK_EXTERNAL" && meta.clickType === "apply")) {
      totalApplied++
      if (comp) favoredCompanies[comp] = (favoredCompanies[comp] || 0) + (weight * 1.5)
      for (const token of extractRoleTokens(title)) {
        favoredRoles[token] = (favoredRoles[token] || 0) + (weight * 1.5)
      }
    }
  }

  const preferences: UserImplicitPreferences = {
    userId,
    updatedAt: now.toISOString(),
    favoredSkills,
    favoredRoles,
    favoredCompanies,
    favoredWorkModes,
    dislikedRoles,
    dislikedSkills,
    dislikedCompanies,
    dislikedLocations,
    averseToOnsite: wrongLocationOnsiteCount >= 2.0,
    totalSaved,
    totalDismissed,
    totalApplied,
    dismissReasons,
  }

  // Cache in Redis for 15 minutes (900 seconds)
  void setCachedJson(cacheKey, preferences, 900)
  return preferences
}

/**
 * Invalidates the cached implicit preferences for a user whenever
 * a new save, dismiss, or undismiss action occurs.
 */
export async function invalidateUserImplicitPreferences(userId: string): Promise<boolean> {
  const cacheKey = `user:implicit-pref:${userId}`
  return invalidateCache(cacheKey)
}

/**
 * Evaluates a job candidate against the user's implicit learned preferences.
 * Implements Threshold Defense (requires >= 2.0 weighted dismissals to penalize).
 * Caps negative adjustments to -25 and positive boosts to +10.
 */
export function calculateImplicitPreferenceAdjustment(
  job: {
    title: string
    company: string
    location: string
    isRemote?: boolean
    tags?: string[]
  },
  prefs: UserImplicitPreferences | null | undefined
): ImplicitScoreAdjustment {
  if (!prefs) {
    return { scoreDelta: 0, boostPoints: 0, penaltyPoints: 0, reasons: [] }
  }

  let boost = 0
  let penalty = 0
  const reasons: string[] = []

  const jobCompany = (job.company || "").toLowerCase().trim()
  const jobRoleTokens = extractRoleTokens(job.title)
  const jobTags = (job.tags || []).map((t) => toCanonical(t))

  // =========================================================================
  // 1. POSITIVE AFFINITY BOOSTS (Cap: +10 pts)
  // =========================================================================
  let matchedAffinityCompany = false
  if (jobCompany && (prefs.favoredCompanies[jobCompany] || 0) >= 1.0) {
    boost += 4
    matchedAffinityCompany = true
  }

  let matchedAffinityRole = ""
  for (const token of jobRoleTokens) {
    if ((prefs.favoredRoles[token] || 0) >= 1.5) {
      boost += 4
      matchedAffinityRole = token
      break
    }
  }

  const matchedAffinitySkills: string[] = []
  for (const tag of jobTags) {
    if ((prefs.favoredSkills[tag] || 0) >= 1.5) {
      boost += 2
      matchedAffinitySkills.push(tag)
      if (matchedAffinitySkills.length >= 2) break
    }
  }

  const totalBoost = Math.min(10, boost)
  if (totalBoost > 0) {
    const boostDetails: string[] = []
    if (matchedAffinityCompany) boostDetails.push(`company preference (${job.company})`)
    if (matchedAffinityRole) boostDetails.push(`target role (${matchedAffinityRole})`)
    if (matchedAffinitySkills.length > 0) boostDetails.push(`frequently saved stack (${matchedAffinitySkills.join(", ")})`)
    reasons.push(`Learned Preference: +${totalBoost} pts (Matches ${boostDetails.join(" & ")})`)
  }

  // =========================================================================
  // 2. NEGATIVE AVERSION PENALTIES (Cap: -25 pts)
  // Threshold Defense: Requires >= 2.0 weighted dismissals to activate penalty
  // =========================================================================

  // Aversion A: Disliked Companies (dismissed with 'bad_company')
  if (jobCompany && (prefs.dislikedCompanies[jobCompany] || 0) >= 1.5) {
    penalty += 15
    reasons.push(`Learned Aversion: -15 pts (Previously dismissed roles at ${job.company})`)
  }

  // Aversion B: Disliked Roles (dismissed with 'wrong_role')
  let penalizedRole = ""
  for (const token of jobRoleTokens) {
    if ((prefs.dislikedRoles[token] || 0) >= 2.0) {
      penalty += 12
      penalizedRole = token
      break
    }
  }
  if (penalizedRole) {
    reasons.push(`Learned Aversion: -12 pts (Repeatedly dismissed similar '${penalizedRole}' roles as wrong role)`)
  }

  // Aversion C: Disliked Skills / Stacks (dismissed with 'wrong_role')
  const penalizedSkillsList: string[] = []
  for (const tag of jobTags) {
    if ((prefs.dislikedSkills[tag] || 0) >= 2.0) {
      penalty += 5
      penalizedSkillsList.push(tag)
      if (penalizedSkillsList.length >= 2) break
    }
  }
  if (penalizedSkillsList.length > 0 && !penalizedRole) {
    reasons.push(`Learned Aversion: -${Math.min(10, penalizedSkillsList.length * 5)} pts (Avoided tech stack: ${penalizedSkillsList.join(", ")})`)
  }

  // Aversion D: Onsite Aversion when user repeatedly marks onsite jobs as 'wrong_location'
  if (prefs.averseToOnsite && !job.isRemote) {
    penalty += 8
    reasons.push("Learned Aversion: -8 pts (Repeatedly dismissed on-site roles for location mismatch)")
  }

  const totalPenalty = Math.min(25, penalty)
  const scoreDelta = totalBoost - totalPenalty

  return {
    scoreDelta,
    boostPoints: totalBoost,
    penaltyPoints: totalPenalty,
    reasons,
  }
}
