export type CompanyTierType =
  | "Tier 1 (Big Tech)"
  | "Tier 2 (Scaleup / Enterprise)"
  | "Tier 3 (Startup / Mid-Market)"

export interface CompanyTierBenchmark {
  tier: CompanyTierType
  tierShort: "Tier 1" | "Tier 2" | "Tier 3"
  benchmarkTarget: number
  description: string
  sessionCount: number
  averageScore: number
  readiness: "Ready" | "Competitive" | "Borderline" | "Gap Identified" | "Not Evaluated"
  companies: string[]
}

export interface RoundArchetypeStats {
  roundType: string
  sessionCount: number
  averageScore: number
  highestScore: number
  status: "Mastered" | "Proficient" | "Developing" | "Needs Practice"
}

export interface RecurringWeakness {
  topic: string
  type: "technical" | "behavioral"
  occurrences: number
  highestSeverity: "high" | "medium" | "low"
  lastEncountered: string
  companies: string[]
}

export interface ScoreProgressionPoint {
  id: string
  date: string
  timestamp: number
  score: number
  verdict: string | null
  targetCompany: string
  targetRole: string
  interviewType: string
  companyTier: CompanyTierType
}

export interface LongitudinalMasteryAnalytics {
  totalSessions: number
  scoredSessionsCount: number
  averageScore: number
  highestScore: number
  lowestScore: number
  passRate: number // 0-100 percentage
  trajectoryChange: number // points diff between recent and early sessions
  estimatedPracticeMinutes: number
  scoreProgression: ScoreProgressionPoint[]
  roundArchetypes: Record<string, RoundArchetypeStats>
  companyTierBenchmarks: Record<CompanyTierType, CompanyTierBenchmark>
  recurringWeaknesses: RecurringWeakness[]
  verdictDistribution: {
    strongHire: number
    hire: number
    leanHire: number
    noHire: number
    unspecified: number
  }
}

export interface RawInterviewSessionInput {
  id: string
  targetCompany: string
  targetRole: string
  interviewType: string
  score?: number | null
  verdict?: string | null
  dialogue?: Array<{ role: string; text: string; timestamp?: string }> | unknown
  report?: {
    overallScore?: number
    technicalScore?: number
    clarityScore?: number
    verdict?: string
    executiveSummary?: string
    strengths?: string[]
    improvementAreas?: string[]
    knowledgeGaps?: Array<{
      topic: string
      type?: "technical" | "behavioral"
      severity?: "high" | "medium" | "low"
    }>
  } | null | unknown
  createdAt: Date | string
}

const TIER_1_KEYWORDS = [
  "google",
  "meta",
  "facebook",
  "apple",
  "amazon",
  "aws",
  "netflix",
  "microsoft",
  "stripe",
  "uber",
  "airbnb",
  "openai",
  "anthropic",
  "databricks",
  "snowflake",
  "palantir",
  "nvidia",
  "bytedance",
  "tiktok",
  "coinbase",
  "deepmind",
  "scale ai",
  "figma",
  "faang",
  "big tech",
]

const TIER_2_KEYWORDS = [
  "spotify",
  "shopify",
  "twilio",
  "atlassian",
  "hubspot",
  "salesforce",
  "adobe",
  "square",
  "block",
  "linkedin",
  "doordash",
  "pinterest",
  "lyft",
  "dropbox",
  "github",
  "gitlab",
  "docker",
  "cloudflare",
  "mongodb",
  "elastic",
  "datadog",
  "pagerduty",
  "snap",
  "reddit",
  "slack",
  "zoom",
  "canva",
  "instacart",
  "scaleup",
  "enterprise",
]

/**
 * Classifies a company into competitive hiring tiers
 */
export function classifyCompanyTier(companyName: string): {
  tier: CompanyTierType
  tierShort: "Tier 1" | "Tier 2" | "Tier 3"
  benchmarkTarget: number
  description: string
} {
  const normalized = (companyName || "").toLowerCase().trim()

  for (const kw of TIER_1_KEYWORDS) {
    if (normalized.includes(kw)) {
      return {
        tier: "Tier 1 (Big Tech)",
        tierShort: "Tier 1",
        benchmarkTarget: 85,
        description: "Elite standard: Rigorous system design, algorithmic edge cases, and high-ownership STAR metrics.",
      }
    }
  }

  for (const kw of TIER_2_KEYWORDS) {
    if (normalized.includes(kw)) {
      return {
        tier: "Tier 2 (Scaleup / Enterprise)",
        tierShort: "Tier 2",
        benchmarkTarget: 75,
        description: "High velocity bar: Pragmatic architecture, production triage, cross-functional collaboration.",
      }
    }
  }

  return {
    tier: "Tier 3 (Startup / Mid-Market)",
    tierShort: "Tier 3",
    benchmarkTarget: 70,
    description: "Execution & adaptability: Direct business impact, full-lifecycle delivery, rapid problem solving.",
  }
}

/**
 * Computes readiness rating against benchmark target
 */
export function calculateReadiness(
  averageScore: number,
  benchmarkTarget: number,
  sessionCount: number
): "Ready" | "Competitive" | "Borderline" | "Gap Identified" | "Not Evaluated" {
  if (sessionCount === 0) return "Not Evaluated"
  if (averageScore >= benchmarkTarget) return "Ready"
  if (averageScore >= benchmarkTarget - 7) return "Competitive"
  if (averageScore >= benchmarkTarget - 15) return "Borderline"
  return "Gap Identified"
}

/**
 * Computes round archetype proficiency status
 */
export function calculateRoundProficiency(
  averageScore: number
): "Mastered" | "Proficient" | "Developing" | "Needs Practice" {
  if (averageScore >= 85) return "Mastered"
  if (averageScore >= 75) return "Proficient"
  if (averageScore >= 60) return "Developing"
  return "Needs Practice"
}

/**
 * Ingests raw interview sessions and computes comprehensive longitudinal analytics
 */
export function computeLongitudinalMasteryAnalytics(
  sessions: RawInterviewSessionInput[]
): LongitudinalMasteryAnalytics {
  if (!sessions || sessions.length === 0) {
    return {
      totalSessions: 0,
      scoredSessionsCount: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      passRate: 0,
      trajectoryChange: 0,
      estimatedPracticeMinutes: 0,
      scoreProgression: [],
      roundArchetypes: {},
      companyTierBenchmarks: {
        "Tier 1 (Big Tech)": {
          tier: "Tier 1 (Big Tech)",
          tierShort: "Tier 1",
          benchmarkTarget: 85,
          description: "Elite standard: Rigorous system design, algorithmic edge cases, and high-ownership STAR metrics.",
          sessionCount: 0,
          averageScore: 0,
          readiness: "Not Evaluated",
          companies: [],
        },
        "Tier 2 (Scaleup / Enterprise)": {
          tier: "Tier 2 (Scaleup / Enterprise)",
          tierShort: "Tier 2",
          benchmarkTarget: 75,
          description: "High velocity bar: Pragmatic architecture, production triage, cross-functional collaboration.",
          sessionCount: 0,
          averageScore: 0,
          readiness: "Not Evaluated",
          companies: [],
        },
        "Tier 3 (Startup / Mid-Market)": {
          tier: "Tier 3 (Startup / Mid-Market)",
          tierShort: "Tier 3",
          benchmarkTarget: 70,
          description: "Execution & adaptability: Direct business impact, full-lifecycle delivery, rapid problem solving.",
          sessionCount: 0,
          averageScore: 0,
          readiness: "Not Evaluated",
          companies: [],
        },
      },
      recurringWeaknesses: [],
      verdictDistribution: {
        strongHire: 0,
        hire: 0,
        leanHire: 0,
        noHire: 0,
        unspecified: 0,
      },
    }
  }

  // Sort chronologically ascending for progression & trajectory tracking
  const sortedSessions = [...sessions].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime()
    const timeB = new Date(b.createdAt).getTime()
    return timeA - timeB
  })

  let totalScoreSum = 0
  let scoredCount = 0
  let highestScore = 0
  let lowestScore = 100
  let passCount = 0
  let totalEstimatedMinutes = 0

  const progression: ScoreProgressionPoint[] = []
  const roundMap: Record<string, { scores: number[]; roundType: string }> = {}
  const tierMap: Record<CompanyTierType, { scores: number[]; companies: Set<string> }> = {
    "Tier 1 (Big Tech)": { scores: [], companies: new Set() },
    "Tier 2 (Scaleup / Enterprise)": { scores: [], companies: new Set() },
    "Tier 3 (Startup / Mid-Market)": { scores: [], companies: new Set() },
  }

  const weaknessMap: Record<
    string,
    {
      topic: string
      type: "technical" | "behavioral"
      occurrences: number
      severities: string[]
      lastEncountered: string
      companies: Set<string>
    }
  > = {}

  const verdictDistribution = {
    strongHire: 0,
    hire: 0,
    leanHire: 0,
    noHire: 0,
    unspecified: 0,
  }

  for (const session of sortedSessions) {
    // Resolve score: prioritize session.score, fallback to report.overallScore
    const reportObj = session.report && typeof session.report === "object" ? (session.report as any) : null
    let effectiveScore: number | null = null

    if (typeof session.score === "number" && !isNaN(session.score)) {
      effectiveScore = session.score
    } else if (reportObj && typeof reportObj.overallScore === "number" && !isNaN(reportObj.overallScore)) {
      effectiveScore = reportObj.overallScore
    }

    // Estimate practice duration: dialogue turns * 1.5m, min 10m
    const dialogueArr = Array.isArray(session.dialogue) ? session.dialogue : []
    const duration = dialogueArr.length > 0 ? Math.max(Math.round(dialogueArr.length * 1.5), 5) : 15
    totalEstimatedMinutes += duration

    // Classification
    const tierInfo = classifyCompanyTier(session.targetCompany)
    const company = (session.targetCompany || "Unknown").trim()
    const role = (session.targetRole || "Software Engineer").trim()
    const roundType = (session.interviewType || "General").trim()
    const rawVerdict = session.verdict || reportObj?.verdict || null

    // Verdict counting
    if (rawVerdict) {
      const vLower = rawVerdict.toLowerCase()
      if (vLower.includes("strong")) verdictDistribution.strongHire++
      else if (vLower.includes("lean")) verdictDistribution.leanHire++
      else if (vLower.includes("no hire")) verdictDistribution.noHire++
      else if (vLower.includes("hire")) verdictDistribution.hire++
      else verdictDistribution.unspecified++
    } else {
      verdictDistribution.unspecified++
    }

    if (effectiveScore !== null) {
      totalScoreSum += effectiveScore
      scoredCount++
      if (effectiveScore > highestScore) highestScore = effectiveScore
      if (effectiveScore < lowestScore) lowestScore = effectiveScore

      // Pass check: score >= 70 or verdict has hire
      const isPass =
        effectiveScore >= 70 ||
        (rawVerdict && (rawVerdict.toLowerCase().includes("strong") || rawVerdict.toLowerCase().includes("hire")))
      if (isPass) passCount++

      // Progression point
      const createdDate = new Date(session.createdAt)
      progression.push({
        id: session.id,
        date: createdDate.toISOString(),
        timestamp: createdDate.getTime(),
        score: effectiveScore,
        verdict: rawVerdict,
        targetCompany: company,
        targetRole: role,
        interviewType: roundType,
        companyTier: tierInfo.tier,
      })

      // Round archetype stats
      if (!roundMap[roundType]) {
        roundMap[roundType] = { scores: [], roundType }
      }
      roundMap[roundType].scores.push(effectiveScore)

      // Tier stats
      tierMap[tierInfo.tier].scores.push(effectiveScore)
    }

    tierMap[tierInfo.tier].companies.add(company)

    // Knowledge gaps extraction
    const gaps: any[] = reportObj && Array.isArray(reportObj.knowledgeGaps) ? reportObj.knowledgeGaps : []
    for (const gap of gaps) {
      if (!gap || !gap.topic) continue
      const rawTopic = String(gap.topic).trim()
      const normalizedKey = rawTopic.toLowerCase()

      if (!weaknessMap[normalizedKey]) {
        weaknessMap[normalizedKey] = {
          topic: rawTopic,
          type: gap.type === "behavioral" ? "behavioral" : "technical",
          occurrences: 0,
          severities: [],
          lastEncountered: new Date(session.createdAt).toISOString(),
          companies: new Set(),
        }
      }

      weaknessMap[normalizedKey].occurrences++
      if (gap.severity) weaknessMap[normalizedKey].severities.push(gap.severity)
      weaknessMap[normalizedKey].companies.add(company)
      weaknessMap[normalizedKey].lastEncountered = new Date(session.createdAt).toISOString()
    }
  }

  // Averages & Trajectory
  const averageScore = scoredCount > 0 ? Math.round((totalScoreSum / scoredCount) * 10) / 10 : 0
  const passRate = scoredCount > 0 ? Math.round((passCount / scoredCount) * 100) : 0

  let trajectoryChange = 0
  if (progression.length >= 2) {
    // Compare average of recent half vs early half
    const half = Math.floor(progression.length / 2)
    const earlyScores = progression.slice(0, half).map((p) => p.score)
    const recentScores = progression.slice(half).map((p) => p.score)

    const earlyAvg = earlyScores.reduce((a, b) => a + b, 0) / earlyScores.length
    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length
    trajectoryChange = Math.round((recentAvg - earlyAvg) * 10) / 10
  }

  // Build Round Archetype Stats
  const roundArchetypes: Record<string, RoundArchetypeStats> = {}
  for (const [roundType, data] of Object.entries(roundMap)) {
    const rScores = data.scores
    const rAvg = rScores.length > 0 ? Math.round((rScores.reduce((a, b) => a + b, 0) / rScores.length) * 10) / 10 : 0
    const rMax = rScores.length > 0 ? Math.max(...rScores) : 0
    roundArchetypes[roundType] = {
      roundType,
      sessionCount: rScores.length,
      averageScore: rAvg,
      highestScore: rMax,
      status: calculateRoundProficiency(rAvg),
    }
  }

  // Build Tier Benchmarks
  const companyTierBenchmarks: Record<CompanyTierType, CompanyTierBenchmark> = {
    "Tier 1 (Big Tech)": {
      tier: "Tier 1 (Big Tech)",
      tierShort: "Tier 1",
      benchmarkTarget: 85,
      description: "Elite standard: Rigorous system design, algorithmic edge cases, and high-ownership STAR metrics.",
      sessionCount: tierMap["Tier 1 (Big Tech)"].scores.length,
      averageScore:
        tierMap["Tier 1 (Big Tech)"].scores.length > 0
          ? Math.round(
              (tierMap["Tier 1 (Big Tech)"].scores.reduce((a, b) => a + b, 0) /
                tierMap["Tier 1 (Big Tech)"].scores.length) *
                10
            ) / 10
          : 0,
      readiness: calculateReadiness(
        tierMap["Tier 1 (Big Tech)"].scores.length > 0
          ? tierMap["Tier 1 (Big Tech)"].scores.reduce((a, b) => a + b, 0) /
              tierMap["Tier 1 (Big Tech)"].scores.length
          : 0,
        85,
        tierMap["Tier 1 (Big Tech)"].scores.length
      ),
      companies: Array.from(tierMap["Tier 1 (Big Tech)"].companies),
    },
    "Tier 2 (Scaleup / Enterprise)": {
      tier: "Tier 2 (Scaleup / Enterprise)",
      tierShort: "Tier 2",
      benchmarkTarget: 75,
      description: "High velocity bar: Pragmatic architecture, production triage, cross-functional collaboration.",
      sessionCount: tierMap["Tier 2 (Scaleup / Enterprise)"].scores.length,
      averageScore:
        tierMap["Tier 2 (Scaleup / Enterprise)"].scores.length > 0
          ? Math.round(
              (tierMap["Tier 2 (Scaleup / Enterprise)"].scores.reduce((a, b) => a + b, 0) /
                tierMap["Tier 2 (Scaleup / Enterprise)"].scores.length) *
                10
            ) / 10
          : 0,
      readiness: calculateReadiness(
        tierMap["Tier 2 (Scaleup / Enterprise)"].scores.length > 0
          ? tierMap["Tier 2 (Scaleup / Enterprise)"].scores.reduce((a, b) => a + b, 0) /
              tierMap["Tier 2 (Scaleup / Enterprise)"].scores.length
          : 0,
        75,
        tierMap["Tier 2 (Scaleup / Enterprise)"].scores.length
      ),
      companies: Array.from(tierMap["Tier 2 (Scaleup / Enterprise)"].companies),
    },
    "Tier 3 (Startup / Mid-Market)": {
      tier: "Tier 3 (Startup / Mid-Market)",
      tierShort: "Tier 3",
      benchmarkTarget: 70,
      description: "Execution & adaptability: Direct business impact, full-lifecycle delivery, rapid problem solving.",
      sessionCount: tierMap["Tier 3 (Startup / Mid-Market)"].scores.length,
      averageScore:
        tierMap["Tier 3 (Startup / Mid-Market)"].scores.length > 0
          ? Math.round(
              (tierMap["Tier 3 (Startup / Mid-Market)"].scores.reduce((a, b) => a + b, 0) /
                tierMap["Tier 3 (Startup / Mid-Market)"].scores.length) *
                10
            ) / 10
          : 0,
      readiness: calculateReadiness(
        tierMap["Tier 3 (Startup / Mid-Market)"].scores.length > 0
          ? tierMap["Tier 3 (Startup / Mid-Market)"].scores.reduce((a, b) => a + b, 0) /
              tierMap["Tier 3 (Startup / Mid-Market)"].scores.length
          : 0,
        70,
        tierMap["Tier 3 (Startup / Mid-Market)"].scores.length
      ),
      companies: Array.from(tierMap["Tier 3 (Startup / Mid-Market)"].companies),
    },
  }

  // Sort recurring weaknesses
  const recurringWeaknesses: RecurringWeakness[] = Object.values(weaknessMap)
    .sort((a, b) => {
      if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences
      const sevRank = (s: string) => (s === "high" ? 3 : s === "medium" ? 2 : 1)
      const maxSevA = Math.max(...a.severities.map(sevRank), 1)
      const maxSevB = Math.max(...b.severities.map(sevRank), 1)
      return maxSevB - maxSevA
    })
    .slice(0, 10)
    .map((w) => {
      const sevRank = (s: string) => (s === "high" ? 3 : s === "medium" ? 2 : 1)
      const maxSev = Math.max(...w.severities.map(sevRank), 1)
      const dominantSev: "high" | "medium" | "low" =
        maxSev === 3 ? "high" : maxSev === 2 ? "medium" : "low"

      return {
        topic: w.topic,
        type: w.type,
        occurrences: w.occurrences,
        highestSeverity: dominantSev,
        lastEncountered: w.lastEncountered,
        companies: Array.from(w.companies),
      }
    })

  return {
    totalSessions: sortedSessions.length,
    scoredSessionsCount: scoredCount,
    averageScore,
    highestScore: scoredCount > 0 ? highestScore : 0,
    lowestScore: scoredCount > 0 ? lowestScore : 0,
    passRate,
    trajectoryChange,
    estimatedPracticeMinutes: totalEstimatedMinutes,
    scoreProgression: progression,
    roundArchetypes,
    companyTierBenchmarks,
    recurringWeaknesses,
    verdictDistribution,
  }
}
