/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma, withDbRetry } from "@/lib/prisma"
import { getCachedJson, setCachedJson } from "@/lib/redis"

export interface UserMacroOutcomes {
  totalApplications: number
  statusCounts: Record<string, number>
  interviewCount: number
  offerCount: number
  rejectedCount: number
  appliedCount: number
  conversionRate: number // Percentage 0 - 100
  winningRoles: string[]
  winningCompanies: string[]
  winningSkills: string[]
  penalizedSkills: string[]
  averageTimeToInterviewDays: number | null
}

export interface AdaptivePromptWeights {
  positiveBoosts: string[]
  negativePenalties: string[]
  topConvertingRoles: string[]
  overallConversionRate: number
  sampleSize: number
}

/**
 * Aggregates historical user application outcomes to derive performance signals and conversion metrics.
 */
export async function getUserMacroOutcomes(userId: string): Promise<UserMacroOutcomes> {
  const cacheKey = `user:macro-outcomes:${userId}`
  const cached = await getCachedJson<UserMacroOutcomes>(cacheKey)
  if (cached) return cached

  if (!prisma?.application?.findMany) {
    return {
      totalApplications: 0,
      statusCounts: { Saved: 0, Applied: 0, Interview: 0, Offer: 0, Rejected: 0 },
      interviewCount: 0,
      offerCount: 0,
      rejectedCount: 0,
      appliedCount: 0,
      conversionRate: 0,
      winningRoles: [],
      winningCompanies: [],
      winningSkills: [],
      penalizedSkills: [],
      averageTimeToInterviewDays: null,
    }
  }

  const applications = await withDbRetry<any[]>(() =>
    prisma.application.findMany({
      where: { userId },
      include: {
        statusChanges: {
          orderBy: { changedAt: "asc" },
        },
        analysis: true,
        company: true,
      },
    })
  )

  const statusCounts: Record<string, number> = {
    Saved: 0,
    Applied: 0,
    Interview: 0,
    Offer: 0,
    Rejected: 0,
  }

  const winningRolesMap: Record<string, number> = {}
  const winningCompaniesSet = new Set<string>()
  const winningSkillsSet = new Set<string>()
  const penalizedSkillsSet = new Set<string>()
  const timeToInterviewList: number[] = []

  for (const app of applications) {
    const status = app.status || "Saved"
    statusCounts[status] = (statusCounts[status] || 0) + 1

    const isSuccess = status === "Interview" || status === "Offer"
    const isRejected = status === "Rejected"

    if (isSuccess) {
      if (app.jobTitle) {
        winningRolesMap[app.jobTitle] = (winningRolesMap[app.jobTitle] || 0) + 1
      }
      if (app.companyName) {
        winningCompaniesSet.add(app.companyName)
      }

      // Extract winning skills from analysis
      if (app.analysis?.jdKeywords && Array.isArray(app.analysis.jdKeywords)) {
        app.analysis.jdKeywords.forEach((kw: string) => winningSkillsSet.add(kw))
      }

      // Compute time to first interview
      const appDate = new Date(app.applicationDate || app.createdAt)
      const interviewChange = app.statusChanges?.find(
        (sc: any) => sc.toStatus === "Interview"
      )
      if (interviewChange) {
        const interviewDate = new Date(interviewChange.changedAt)
        const diffDays = Math.max(
          1,
          Math.round((interviewDate.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24))
        )
        timeToInterviewList.push(diffDays)
      }
    } else if (isRejected) {
      if (app.analysis?.gapAnalysis && Array.isArray(app.analysis.gapAnalysis)) {
        app.analysis.gapAnalysis.forEach((gap: string) => penalizedSkillsSet.add(gap))
      }
    }
  }

  const totalApplications = applications.length
  const interviewCount = statusCounts.Interview || 0
  const offerCount = statusCounts.Offer || 0
  const rejectedCount = statusCounts.Rejected || 0
  const appliedCount = statusCounts.Applied || 0

  const resolvedTotal = interviewCount + offerCount + rejectedCount
  const conversionRate =
    resolvedTotal > 0 ? Number((((interviewCount + offerCount) / resolvedTotal) * 100).toFixed(1)) : 0

  const sortedWinningRoles = Object.entries(winningRolesMap)
    .sort((a, b) => b[1] - a[1])
    .map(([role]) => role)

  const avgTimeToInterview =
    timeToInterviewList.length > 0
      ? Math.round(timeToInterviewList.reduce((a, b) => a + b, 0) / timeToInterviewList.length)
      : null

  const outcomes: UserMacroOutcomes = {
    totalApplications,
    statusCounts,
    interviewCount,
    offerCount,
    rejectedCount,
    appliedCount,
    conversionRate,
    winningRoles: sortedWinningRoles.slice(0, 5),
    winningCompanies: Array.from(winningCompaniesSet).slice(0, 5),
    winningSkills: Array.from(winningSkillsSet).slice(0, 8),
    penalizedSkills: Array.from(penalizedSkillsSet).slice(0, 8),
    averageTimeToInterviewDays: avgTimeToInterview,
  }

  void setCachedJson(cacheKey, outcomes, 3600)
  return outcomes
}

/**
 * Generates dynamic prompt weights and constraints based on real-world application outcomes.
 */
export async function generateAdaptivePromptWeights(userId: string): Promise<AdaptivePromptWeights> {
  const outcomes = await getUserMacroOutcomes(userId)
  const positiveBoosts: string[] = []
  const negativePenalties: string[] = []

  // If cold-start (less than 3 completed applications), use baseline best practice heuristics
  if (outcomes.totalApplications < 3) {
    positiveBoosts.push("Structure resume achievements with quantifiable STAR impact metrics (e.g., % latency reduction, throughput).")
    positiveBoosts.push("Directly align top technical competencies with requirements in the primary job description.")
    return {
      positiveBoosts,
      negativePenalties,
      topConvertingRoles: outcomes.winningRoles,
      overallConversionRate: outcomes.conversionRate,
      sampleSize: outcomes.totalApplications,
    }
  }

  // 1. Positive Signal Boosts
  if (outcomes.winningRoles.length > 0) {
    positiveBoosts.push(`Prioritize architectural and technical vocabulary aligned with proven successful roles: ${outcomes.winningRoles.join(", ")}.`)
  }

  if (outcomes.winningSkills.length > 0) {
    positiveBoosts.push(`Highlight proven high-conversion skill alignments: ${outcomes.winningSkills.join(", ")}.`)
  }

  if (outcomes.conversionRate >= 20) {
    positiveBoosts.push(`Maintain high-converting resume narrative style (Historical Interview/Offer rate: ${outcomes.conversionRate}%).`)
  } else {
    positiveBoosts.push("Emphasize deep technical depth and system architecture proof over broad generic lists to increase interview conversion.")
  }

  // 2. Negative Feedback Penalties
  if (outcomes.penalizedSkills.length > 0) {
    negativePenalties.push(`Avoid unproven claims in identified gap areas: ${outcomes.penalizedSkills.slice(0, 4).join(", ")}. Provide concrete evidence if mentioned.`)
  }

  if (outcomes.rejectedCount > outcomes.interviewCount * 2) {
    negativePenalties.push("Eliminate passive descriptions without verifiable business metrics.")
    negativePenalties.push("Do not dilute ATS keywords with generic filler text.")
  }

  return {
    positiveBoosts,
    negativePenalties,
    topConvertingRoles: outcomes.winningRoles,
    overallConversionRate: outcomes.conversionRate,
    sampleSize: outcomes.totalApplications,
  }
}

/**
 * Injects adaptive learning weights into a base system or agent prompt.
 */
export function injectLearningWeightsIntoPrompt(basePrompt: string, weights: AdaptivePromptWeights): string {
  if (weights.positiveBoosts.length === 0 && weights.negativePenalties.length === 0) {
    return basePrompt
  }

  const sections: string[] = [basePrompt]

  sections.push("\n### [Macro-Learning Engine Directives & Constraints]")

  if (weights.positiveBoosts.length > 0) {
    sections.push(`- **Positive Signal Boosts (High-Conversion Patterns):**\n  • ${weights.positiveBoosts.join("\n  • ")}`)
  }

  if (weights.negativePenalties.length > 0) {
    sections.push(`- **Negative Feedback Constraints (Rejection Avoidance):**\n  • ${weights.negativePenalties.join("\n  • ")}`)
  }

  if (weights.sampleSize >= 3) {
    sections.push(`- **Historical Conversion Baseline:** ${weights.overallConversionRate}% across ${weights.sampleSize} tracked applications.`)
  }

  return sections.join("\n")
}

/**
 * Compact summary string for inclusion in buildFullContext
 */
export async function getMacroLearningContext(userId: string): Promise<string> {
  try {
    const outcomes = await getUserMacroOutcomes(userId)
    if (outcomes.totalApplications === 0) return ""

    const parts: string[] = [
      `Pipeline: ${outcomes.totalApplications} total | ${outcomes.interviewCount} interviews | ${outcomes.offerCount} offers | ${outcomes.rejectedCount} rejected (${outcomes.conversionRate}% conversion)`,
    ]

    if (outcomes.winningRoles.length > 0) {
      parts.push(`Top Converting Roles: ${outcomes.winningRoles.slice(0, 3).join(", ")}`)
    }
    if (outcomes.winningSkills.length > 0) {
      parts.push(`Top Performing Skills: ${outcomes.winningSkills.slice(0, 5).join(", ")}`)
    }

    return parts.join("\n")
  } catch (err) {
    console.warn("[Macro Learning Context Warning]:", err)
    return ""
  }
}
