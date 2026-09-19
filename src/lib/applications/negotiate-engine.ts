import { prisma, withDbRetry } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import { getUserAIConfig } from "@/lib/ai/config"
import { getProvider } from "@/lib/ai/client"
import { generateText } from "ai"
import { invalidateCache } from "@/lib/redis"

export type LeverageLevel = "LOW" | "MODERATE" | "STRONG" | "MAXIMUM"

export interface MarketBand {
  p25: number
  p50: number // Median
  p75: number
  p90: number
  currency: string
}

export interface PipelineLeverage {
  score: number // 0-100
  level: LeverageLevel
  activeInterviewsCount: number
  competingOffersCount: number
  summary: string
  tacticalAdvantage: string
}

export interface NegotiationScriptTier {
  tierName: "Conservative" | "Balanced" | "Ambitious"
  riskLevel: "Low" | "Moderate" | "High"
  targetIncreasePercentage: number
  targetTotalComp: number
  primaryGoal: string
  tactics: string[]
  emailScript: string
  talkingPoints: string[]
  objectionHandling: Record<string, string>
}

export interface OfferDetailsData {
  baseSalary: number
  currency: string
  bonus?: number
  equity?: string | number
  signingBonus?: number
  deadline?: string
  benefitsNotes?: string
  rawOfferText?: string
  marketPercentileRank?: number
  marketBand?: MarketBand
  leverage?: PipelineLeverage
  strategies?: NegotiationScriptTier[]
  savedAt?: string
}

/**
 * Standard market compensation baseline bands (USD equivalent for remote / US,
 * adjusted proportionally for regional tech hubs).
 */
const MARKET_SALARY_MATRIX: Record<string, Record<string, MarketBand>> = {
  frontend: {
    junior: { p25: 65000, p50: 80000, p75: 95000, p90: 110000, currency: "USD" },
    mid: { p25: 95000, p50: 115000, p75: 135000, p90: 155000, currency: "USD" },
    senior: { p25: 135000, p50: 160000, p75: 185000, p90: 215000, currency: "USD" },
    lead: { p25: 165000, p50: 195000, p75: 230000, p90: 260000, currency: "USD" },
  },
  backend: {
    junior: { p25: 70000, p50: 85000, p75: 100000, p90: 115000, currency: "USD" },
    mid: { p25: 100000, p50: 125000, p75: 145000, p90: 165000, currency: "USD" },
    senior: { p25: 145000, p50: 170000, p75: 198000, p90: 230000, currency: "USD" },
    lead: { p25: 175000, p50: 205000, p75: 245000, p90: 280000, currency: "USD" },
  },
  fullstack: {
    junior: { p25: 68000, p50: 82000, p75: 98000, p90: 112000, currency: "USD" },
    mid: { p25: 98000, p50: 120000, p75: 140000, p90: 160000, currency: "USD" },
    senior: { p25: 140000, p50: 165000, p75: 190000, p90: 220000, currency: "USD" },
    lead: { p25: 170000, p50: 200000, p75: 235000, p90: 270000, currency: "USD" },
  },
  devops: {
    junior: { p25: 72000, p50: 88000, p75: 102000, p90: 118000, currency: "USD" },
    mid: { p25: 105000, p50: 130000, p75: 150000, p90: 172000, currency: "USD" },
    senior: { p25: 150000, p50: 178000, p75: 205000, p90: 240000, currency: "USD" },
    lead: { p25: 180000, p50: 215000, p75: 255000, p90: 290000, currency: "USD" },
  },
  general: {
    junior: { p25: 65000, p50: 80000, p75: 95000, p90: 110000, currency: "USD" },
    mid: { p25: 95000, p50: 118000, p75: 138000, p90: 160000, currency: "USD" },
    senior: { p25: 138000, p50: 162000, p75: 188000, p90: 218000, currency: "USD" },
    lead: { p25: 168000, p50: 198000, p75: 235000, p90: 265000, currency: "USD" },
  },
}

/**
 * Normalizes role text into a canonical domain key for compensation benchmarking.
 */
function normalizeRoleCategory(title: string): string {
  const t = title.toLowerCase()
  if (t.includes("front") || t.includes("react") || t.includes("ui") || t.includes("web")) return "frontend"
  if (t.includes("back") || t.includes("node") || t.includes("api") || t.includes("distributed")) return "backend"
  if (t.includes("full") || t.includes("software engineer") || t.includes("developer")) return "fullstack"
  if (t.includes("devops") || t.includes("cloud") || t.includes("sre") || t.includes("infra")) return "devops"
  return "general"
}

/**
 * Normalizes seniority text.
 */
function normalizeSeniorityCategory(seniority?: string, title: string = ""): string {
  const s = (seniority || "").toLowerCase()
  const t = title.toLowerCase()

  if (s.includes("lead") || s.includes("staff") || s.includes("principal") || t.includes("lead") || t.includes("staff") || t.includes("principal")) {
    return "lead"
  }
  if (s.includes("senior") || t.includes("senior") || t.includes("sr")) {
    return "senior"
  }
  if (s.includes("junior") || s.includes("entry") || t.includes("junior") || t.includes("associate") || t.includes("intern") || t.includes("trainee")) {
    return "junior"
  }
  return "mid"
}

/**
 * Computes market percentiles and percentile rank for a given offer.
 */
export function benchmarkOfferCompensation(params: {
  jobTitle: string
  seniority?: string
  currency?: string
  baseSalary: number
}): { marketBand: MarketBand; percentileRank: number; statusDescription: string } {
  const role = normalizeRoleCategory(params.jobTitle)
  const level = normalizeSeniorityCategory(params.seniority, params.jobTitle)
  const currency = (params.currency || "USD").toUpperCase()

  const rawBand = (MARKET_SALARY_MATRIX[role] || MARKET_SALARY_MATRIX.general)[level] || MARKET_SALARY_MATRIX.general.mid

  // Currency scaling factors (baseline matrix is in USD)
  let multiplier = 1.0
  if (currency === "EUR") multiplier = 0.92
  else if (currency === "GBP") multiplier = 0.79
  else if (currency === "CAD") multiplier = 1.36
  else if (currency === "BDT") multiplier = 120.0
  else if (currency === "INR") multiplier = 85.0

  const marketBand: MarketBand = {
    p25: Math.round(rawBand.p25 * multiplier),
    p50: Math.round(rawBand.p50 * multiplier),
    p75: Math.round(rawBand.p75 * multiplier),
    p90: Math.round(rawBand.p90 * multiplier),
    currency,
  }

  const base = params.baseSalary
  let rank = 50

  if (base <= marketBand.p25) {
    const fraction = Math.max(0, base / marketBand.p25)
    rank = Math.round(fraction * 25)
  } else if (base <= marketBand.p50) {
    const fraction = (base - marketBand.p25) / (marketBand.p50 - marketBand.p25)
    rank = Math.round(25 + fraction * 25)
  } else if (base <= marketBand.p75) {
    const fraction = (base - marketBand.p50) / (marketBand.p75 - marketBand.p50)
    rank = Math.round(50 + fraction * 25)
  } else if (base <= marketBand.p90) {
    const fraction = (base - marketBand.p75) / (marketBand.p90 - marketBand.p75)
    rank = Math.round(75 + fraction * 15)
  } else {
    rank = Math.min(99, 90 + Math.round(((base - marketBand.p90) / marketBand.p90) * 10))
  }

  let statusDescription = "Competitive Market Offer"
  if (rank < 35) {
    statusDescription = "Below Market Median (High Counter-Offer Justification)"
  } else if (rank >= 35 && rank < 65) {
    statusDescription = "Market Median (Balanced Room for Negotiation)"
  } else if (rank >= 65 && rank < 85) {
    statusDescription = "Strong Above-Median Offer (Selective Perk / Bonus Focus)"
  } else {
    statusDescription = "Top-Tier Market Offer (Focus on Equity Upside & Accelerators)"
  }

  return { marketBand, percentileRank: rank, statusDescription }
}

/**
 * Calculates candidate's active pipeline leverage (BATNA).
 */
export async function calculatePipelineLeverage(
  userId: string,
  targetApplicationId: string
): Promise<PipelineLeverage> {
  if (!prisma?.application?.findMany) {
    return {
      score: 40,
      level: "MODERATE",
      activeInterviewsCount: 0,
      competingOffersCount: 0,
      summary: "Baseline pipeline leverage.",
      tacticalAdvantage: "Highlight your verified technical skills and project metrics.",
    }
  }

  try {
    const activePipeline = await withDbRetry(() =>
      prisma.application.findMany({
        where: {
          userId,
          id: { not: targetApplicationId },
          status: { in: ["Interview", "Offer", "Assessment"] },
        },
        select: { id: true, status: true, companyName: true, jobTitle: true },
      })
    )

    const competingOffers = activePipeline.filter((a) => a.status === "Offer")
    const activeInterviews = activePipeline.filter((a) => a.status === "Interview")
    const activeAssessments = activePipeline.filter((a) => a.status === "Assessment")

    let score = 25 // Base leverage score
    score += competingOffers.length * 35 // Each competing offer provides massive BATNA
    score += activeInterviews.length * 15 // Active interview loops show market velocity
    score += activeAssessments.length * 5

    score = Math.min(100, Math.max(10, score))

    let level: LeverageLevel = "LOW"
    let tacticalAdvantage = "Focus on alignment, value delivered in the interview, and non-salary perks."

    if (score >= 85) {
      level = "MAXIMUM"
      tacticalAdvantage = "You have competing offers. You can confidently request 15-20% base increase or substantial equity matching."
    } else if (score >= 65) {
      level = "STRONG"
      tacticalAdvantage = "Active final-round interviews give you strong leverage to anchor against the 75th market percentile."
    } else if (score >= 35) {
      level = "MODERATE"
      tacticalAdvantage = "Reasonable leverage. Propose a targeted 8-12% adjustment backed by market benchmarks."
    }

    const summary = competingOffers.length > 0
      ? `You have ${competingOffers.length} competing offer(s) and ${activeInterviews.length} active interview(s).`
      : activeInterviews.length > 0
      ? `You have ${activeInterviews.length} active interview stage(s) underway.`
      : "Single active offer with early-stage pipeline."

    return {
      score,
      level,
      activeInterviewsCount: activeInterviews.length,
      competingOffersCount: competingOffers.length,
      summary,
      tacticalAdvantage,
    }
  } catch (err) {
    console.warn("[calculatePipelineLeverage error]:", err)
    return {
      score: 35,
      level: "MODERATE",
      activeInterviewsCount: 0,
      competingOffersCount: 0,
      summary: "Baseline pipeline leverage.",
      tacticalAdvantage: "Anchor on objective role responsibilities and domain depth.",
    }
  }
}

/**
 * Generates 3 tiered counter-offer strategies (Conservative, Balanced, Ambitious).
 */
export async function generateNegotiationStrategies(params: {
  userId: string
  companyName: string
  jobTitle: string
  candidateName: string
  baseSalary: number
  currency: string
  bonus?: number
  equity?: string | number
  marketBand: MarketBand
  leverage: PipelineLeverage
}): Promise<NegotiationScriptTier[]> {
  const {
    companyName,
    jobTitle,
    candidateName,
    baseSalary,
    currency,
    marketBand,
    leverage,
  } = params

  const conservativeTarget = Math.round(baseSalary * 1.05)
  const balancedTarget = Math.round(Math.max(baseSalary * 1.10, marketBand.p75 * 0.95))
  const ambitiousTarget = Math.round(Math.max(baseSalary * 1.20, marketBand.p90))

  // 1. Deterministic Tier Templates
  const conservativeTier: NegotiationScriptTier = {
    tierName: "Conservative",
    riskLevel: "Low",
    targetIncreasePercentage: 5,
    targetTotalComp: conservativeTarget,
    primaryGoal: "Secure modest base bump or flexible perks with zero risk to the offer.",
    tactics: [
      "Express sincere gratitude and firm excitement for the team.",
      `Propose modest adjustment to ${currency} ${conservativeTarget.toLocaleString()} or a sign-on bonus.`,
      "Request accelerated performance review at 6 months with clear KPIs.",
    ],
    emailScript: `Dear ${companyName} Hiring Team,

Thank you so much for extending the offer to join ${companyName} as ${jobTitle}. I am genuinely excited about the work the team is doing and the opportunity to contribute.

After reviewing the full details of the compensation package, I wanted to respectfully inquire if there is any flexibility regarding the base salary. Based on market data for this role and the immediate impact I plan to drive, reaching ${currency} ${conservativeTarget.toLocaleString()} would make this an effortless decision for me.

If the base salary is fixed, I would also be open to discussing a modest sign-on bonus or an accelerated 6-month performance review.

Regardless, I remain enthusiastic about joining ${companyName} and look forward to your thoughts.

Best regards,
${candidateName}`,
    talkingPoints: [
      "Reiterate genuine excitement for the role before mentioning numbers.",
      "Ask collaboratively rather than demanding: 'Is there any flexibility...'",
      "Offer alternatives (sign-on bonus or review timeline) if base budget is capped.",
    ],
    objectionHandling: {
      "Salary band is non-negotiable": "Understandable. Could we explore a signing bonus or additional remote flexibility instead?",
      "Equity cannot be adjusted": "Understood. Could we institute a 6-month compensation review milestone based on metric delivery?",
    },
  }

  const balancedTier: NegotiationScriptTier = {
    tierName: "Balanced",
    riskLevel: "Moderate",
    targetIncreasePercentage: 10,
    targetTotalComp: balancedTarget,
    primaryGoal: "Anchor to the 75th market percentile with data-backed engineering justification.",
    tactics: [
      `Anchor counter at ${currency} ${balancedTarget.toLocaleString()} referencing industry benchmark percentiles.`,
      "Highlight specific high-impact projects and architectural experience.",
      "Position yourself as ready to sign immediately once adjusted.",
    ],
    emailScript: `Dear ${companyName} Hiring Team,

Thank you for sending over the formal offer for the ${jobTitle} position. I am thrilled by the team's vote of confidence and excited about our shared goals.

I would love to make this a definitive yes right away. Based on current market compensation data for senior-level engineering talent in this domain (75th percentile benchmark of ${currency} ${marketBand.p75.toLocaleString()}) and the direct technical leadership I will bring to the upcoming product milestones, I would like to propose a base salary of ${currency} ${balancedTarget.toLocaleString()}.

If we can align on this figure, I am prepared to sign the agreement and begin onboarding immediately.

Thank you for your consideration and partnership throughout this process.

Warm regards,
${candidateName}`,
    talkingPoints: [
      "Lead with enthusiasm and readiness to close immediately.",
      "Cite objective 75th percentile market data to remove personal friction.",
      "Reiterate specific value deliverables (e.g. accelerating sprint velocity and system architecture).",
    ],
    objectionHandling: {
      "We already offered our top budget": "I respect that internal equity is critical. If base is constrained at ${currency} ${baseSalary.toLocaleString()}, can we bridge the gap with a ${currency} ${Math.round((balancedTarget - baseSalary) * 0.8).toLocaleString()} sign-on bonus?",
    },
  }

  const ambitiousTier: NegotiationScriptTier = {
    tierName: "Ambitious",
    riskLevel: "High",
    targetIncreasePercentage: 18,
    targetTotalComp: ambitiousTarget,
    primaryGoal: "Leverage active market pipeline and competing opportunities for maximum comp package.",
    tactics: [
      `Anchor at ${currency} ${ambitiousTarget.toLocaleString()} or equivalent equity/bonus package.`,
      "Professionally mention active pipeline velocity without being adversarial.",
      "State clear preference for this company if numbers align.",
    ],
    emailScript: `Dear ${companyName} Hiring Team,

I want to extend my sincere appreciation for the offer for the ${jobTitle} role. ${companyName} is unquestionably my top choice given the team culture and mission.

To be completely transparent, I am currently evaluating other active opportunities in my pipeline with compensation packages situated around ${currency} ${ambitiousTarget.toLocaleString()}. However, because ${companyName} is my preferred destination, I would sign the offer immediately if we could close the gap to ${currency} ${ambitiousTarget.toLocaleString()} in total guaranteed compensation (or through a combination of base and equity/signing bonus).

I would love to work together to find a structure that works for both of us so we can finalize this today.

Best regards,
${candidateName}`,
    talkingPoints: [
      "Reaffirm that this company is your first choice.",
      "Speak transparently about competing opportunities without sounding arrogant.",
      "Give them a clear mechanism to win you: 'If we can reach X, I will withdraw other processes today.'",
    ],
    objectionHandling: {
      "We cannot match competing numbers": "I completely understand. Because your team remains my top choice, could we meet halfway at ${currency} ${Math.round((baseSalary + ambitiousTarget) / 2).toLocaleString()} or enhance equity vesting?",
    },
  }

  // Check if user has personal AI key configured to enrich scripts
  try {
    const aiConfig = await getUserAIConfig(params.userId, undefined, { requireUserKey: true }).catch(() => null)
    if (!aiConfig?.apiKey) {
      return [conservativeTier, balancedTier, ambitiousTier]
    }

    const resolvedProvider = getProvider({
      providerType: aiConfig.providerType as "openai" | "anthropic" | "google" | "custom-openai",
      apiKey: aiConfig.apiKey,
      baseUrl: aiConfig.baseUrl,
      model: aiConfig.model,
    })

    const targetModel = resolvedProvider.model(aiConfig.model || resolvedProvider.defaultModel)

    const prompt = `You are a world-class salary negotiation coach for elite software engineers.
Refine 3 negotiation email scripts for this candidate:
- Candidate: ${candidateName}
- Company: ${companyName}
- Role: ${jobTitle}
- Base Offer: ${currency} ${baseSalary.toLocaleString()}
- 75th Percentile: ${currency} ${marketBand.p75.toLocaleString()}
- Pipeline Leverage: ${leverage.level} (${leverage.summary})

Return JSON array of 3 objects with properties:
[
  { "tierName": "Conservative", "emailScript": "...", "tactics": ["...", "..."], "talkingPoints": ["...", "..."] },
  { "tierName": "Balanced", "emailScript": "...", "tactics": ["...", "..."], "talkingPoints": ["...", "..."] },
  { "tierName": "Ambitious", "emailScript": "...", "tactics": ["...", "..."], "talkingPoints": ["...", "..."] }
]`

    const result = await generateText({
      model: targetModel,
      prompt,
      maxOutputTokens: 1000,
    })

    const text = result.text.trim()
    const jsonStart = text.indexOf("[")
    const jsonEnd = text.lastIndexOf("]")
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1))
      if (Array.isArray(parsed) && parsed.length === 3) {
        return [
          { ...conservativeTier, ...parsed[0] },
          { ...balancedTier, ...parsed[1] },
          { ...ambitiousTier, ...parsed[2] },
        ]
      }
    }
  } catch (err) {
    console.warn("[generateNegotiationStrategies AI enhancement fallback engaged]:", err)
  }

  return [conservativeTier, balancedTier, ambitiousTier]
}

/**
 * Saves offer negotiation details to Application and ApplicationAnalysis.
 */
export async function saveOfferNegotiationStrategy(
  applicationId: string,
  userId: string,
  offerData: OfferDetailsData
): Promise<void> {
  const now = new Date()

  if (prisma?.application?.update) {
    try {
      await withDbRetry(() =>
        prisma.application.update({
          where: { id: applicationId, userId },
          data: {
            offerDetails: offerData as unknown as object,
            updatedAt: now,
          },
        })
      )
    } catch (err) {
      console.warn("[saveOfferNegotiationStrategy application.update error]:", err)
    }
  }

  if (prisma?.applicationAnalysis?.update) {
    try {
      const existing = prisma.applicationAnalysis.findUnique
        ? await withDbRetry(() =>
            prisma.applicationAnalysis.findUnique({
              where: { applicationId },
              select: { applyStrategy: true },
            })
          )
        : null

      const existingStrategy = (existing?.applyStrategy as Record<string, unknown>) || {}
      await withDbRetry(() =>
        prisma.applicationAnalysis.update({
          where: { applicationId },
          data: {
            applyStrategy: {
              ...existingStrategy,
              offerNegotiation: offerData as unknown as Record<string, unknown>,
              negotiatedAt: now.toISOString(),
            } as Prisma.InputJsonValue,
          },
        })
      )
    } catch (analysisErr) {
      console.warn("[saveOfferNegotiationStrategy analysis.update error]:", analysisErr)
    }
  }

  void invalidateCache(`applications:${userId}`)
  void invalidateCache(`dashboard:stats:${userId}`)
}
