import { prisma, withDbRetry } from "@/lib/prisma"
import { getCachedJson, setCachedJson } from "@/lib/redis"

// Legal suffixes, geographical noise, and parentheticals to strip
const STRIP_PATTERNS = [
  /\ba\/s\b/gi,
  /\baps\b/gi,
  /\bi\/s\b/gi,
  /\bp\/s\b/gi,
  /\bk\/s\b/gi,
  /\bivs\b/gi,
  /\bamba\b/gi,
  /\ba\.m\.b\.a\.?\b/gi,
  /\binc\.?\b/gi,
  /\bcorp\.?\b/gi,
  /\bllc\.?\b/gi,
  /\bltd\.?\b/gi,
  /\bgmbh\b/gi,
  /\bab\b/gi,
  /\bag\b/gi,
  /\bholding\b/gi,
  /\bgroup\b/gi,
  /\(vg\)/gi,
  /\(.*?\)/g,
  /\bdanmark\b/gi,
  /\bdenmark\b/gi,
  /\bscandinavia\b/gi,
  /\bnordic\b/gi,
  /,.*$/g, // everything after comma
]

const NORDIC_SPELLING_VARIANTS: Record<string, string> = {
  ø: "o",
  æ: "ae",
  å: "aa",
  ö: "o",
  ä: "ae",
  ü: "u",
  é: "e",
}

/**
 * Normalizes company name for robust fuzzy matching
 */
export function normalizeCompanyName(name: string): string {
  if (!name || typeof name !== "string") return ""
  let s = name.toLowerCase().trim()

  for (const pat of STRIP_PATTERNS) {
    s = s.replace(pat, " ")
  }

  // Transliterate Nordic/special chars
  for (const [char, replacement] of Object.entries(NORDIC_SPELLING_VARIANTS)) {
    s = s.split(char).join(replacement)
  }

  // Replace punctuation with space and compact
  s = s.replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim()
  return s
}

/**
 * Transliterates characters to standard anglicized equivalents
 */
export function anglicize(s: string): string {
  let str = s.toLowerCase()
  for (const [nordic, english] of Object.entries(NORDIC_SPELLING_VARIANTS)) {
    str = str.split(nordic).join(english)
  }
  return str
}

/**
 * Extracts meaningful words from a company name
 */
export function extractCoreWords(name: string): string[] {
  const normalized = normalizeCompanyName(name)
  return normalized
    .split(" ")
    .map((w) => w.trim())
    .filter((w) => w.length > 1)
}

/**
 * Computes fuzzy match score (0 - 100) between two company names
 * Preserves the battle-tested scoring ratios from Repo A's salary_lookup.py
 */
export function calculateCompanyMatchScore(query: string, candidate: string): number {
  const qNorm = normalizeCompanyName(query)
  const cNorm = normalizeCompanyName(candidate)

  if (!qNorm || !cNorm) return 0
  if (qNorm === cNorm) return 100

  // Substring containment
  if (cNorm.includes(qNorm)) {
    const ratio = qNorm.length / cNorm.length
    return Math.min(100, 80 + Math.floor(ratio * 10))
  }
  if (qNorm.includes(cNorm)) {
    const ratio = cNorm.length / qNorm.length
    return Math.min(100, 80 + Math.floor(ratio * 10))
  }

  // Anglicized variations
  const qAng = anglicize(qNorm)
  const cAng = anglicize(cNorm)
  if (qAng === cAng) return 85
  if (cAng.includes(qAng) || qAng.includes(cAng)) return 75

  // Word token overlap
  const qWords = new Set(extractCoreWords(query))
  const cWords = new Set(extractCoreWords(candidate))
  if (qWords.size === 0 || cWords.size === 0) return 0

  const overlap = [...qWords].filter((w) => cWords.has(w))
  if (overlap.length > 0) {
    if (qWords.size === 1) {
      return 70
    }
    const coverage = overlap.length / qWords.size
    return Math.min(95, Math.floor(30 + coverage * 40))
  }

  return 0
}

export interface ParsedSalary {
  min: number
  max: number
  midpoint: number
  currency: string
}

/**
 * Parses diverse salary text representations into numeric min/max/midpoint.
 * Automatically annualizes monthly rates (/mo, /month) and supports South Asian
 * formats (BDT, ৳, Lakh, LPA, Indian numbering).
 */
export function parseSalaryString(salaryStr?: string | null): ParsedSalary | null {
  if (!salaryStr || typeof salaryStr !== "string") return null
  const clean = salaryStr.trim()
  if (!clean || /competitive|doe|negotiable|undisclosed/i.test(clean)) return null

  let currency = "USD"
  if (clean.includes("€") || /eur/i.test(clean)) currency = "EUR"
  else if (clean.includes("£") || /gbp/i.test(clean)) currency = "GBP"
  else if (/dkk|kr/i.test(clean)) currency = "DKK"
  else if (/bdt|tk|taka|৳/i.test(clean)) currency = "BDT"
  else if (clean.includes("$") || /usd/i.test(clean)) currency = "USD"

  const isMonthly = /\b(month|monthly|mo)\b|\/mo\b|\/month\b/i.test(clean)
  const multiplier = isMonthly ? 12 : 1

  // 1. Check for Lakh / LPA representations (e.g. 15-20 LPA, 1.5 - 2.5 Lakh, 2.5L / mo)
  const isLpaOrLakh = /(?:lpa|lakh|lac|\bl\b)/i.test(clean)
  if (isLpaOrLakh) {
    const rangeLpaMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakh|lac|\bl\b)/i)
    if (rangeLpaMatch) {
      const min = Math.round(parseFloat(rangeLpaMatch[1]) * 100000 * multiplier)
      const max = Math.round(parseFloat(rangeLpaMatch[2]) * 100000 * multiplier)
      return {
        min: Math.min(min, max),
        max: Math.max(min, max),
        midpoint: Math.round((min + max) / 2),
        currency: currency === "USD" ? "BDT" : currency,
      }
    }
    const singleMatches = clean.match(/(\d+(?:\.\d+)?)\s*(?:lpa|lakh|lac|\bl\b)/gi)
    if (singleMatches && singleMatches.length > 0) {
      const values = singleMatches.map((m) => {
        const num = parseFloat(m.replace(/(?:lpa|lakh|lac|\bl\b)/gi, "").trim())
        return Math.round(num * 100000 * multiplier)
      })
      const min = Math.min(...values)
      const max = Math.max(...values)
      return {
        min,
        max,
        midpoint: Math.round((min + max) / 2),
        currency: currency === "USD" ? "BDT" : currency,
      }
    }
  }

  // 2. Check for 'k' representations (e.g. 140k - 180k, 140 - 180k, or 80k BDT / month)
  const rangeKMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*k\b/i)
  if (rangeKMatch) {
    const min = Math.round(parseFloat(rangeKMatch[1]) * 1000 * multiplier)
    const max = Math.round(parseFloat(rangeKMatch[2]) * 1000 * multiplier)
    return {
      min: Math.min(min, max),
      max: Math.max(min, max),
      midpoint: Math.round((min + max) / 2),
      currency,
    }
  }
  const numbersWithK = clean.match(/(\d+(?:\.\d+)?)\s*k\b/gi)
  if (numbersWithK && numbersWithK.length > 0) {
    const values = numbersWithK.map((m) => {
      const num = parseFloat(m.replace(/k/i, "").trim())
      return Math.round(num * 1000 * multiplier)
    })
    const min = Math.min(...values)
    const max = Math.max(...values)
    return {
      min,
      max,
      midpoint: Math.round((min + max) / 2),
      currency,
    }
  }

  // 3. Check for standard & South Asian comma numbers (e.g. 140,000 - 180,000 or 1,50,000 - 2,20,000)
  const numbersStandard = clean.match(/\d{1,3}(?:,\d{2,3})+(?:\.\d+)?/g)
  if (numbersStandard && numbersStandard.length > 0) {
    const values = numbersStandard.map((s) => Math.round(parseFloat(s.replace(/,/g, "")) * multiplier))
    const min = Math.min(...values)
    const max = Math.max(...values)
    return {
      min,
      max,
      midpoint: Math.round((min + max) / 2),
      currency,
    }
  }

  // 4. Check for plain integers (e.g. 80000 - 120000, or 2000 - 3000 / mo)
  const plainNumbers = clean.match(/\b\d{4,8}\b/g)
  if (plainNumbers && plainNumbers.length > 0) {
    const values = plainNumbers.map((s) => Math.round(parseFloat(s) * multiplier))
    const min = Math.min(...values)
    const max = Math.max(...values)
    return {
      min,
      max,
      midpoint: Math.round((min + max) / 2),
      currency,
    }
  }

  return null
}

export type MarketBand = "top_10" | "above_market" | "at_market" | "below_market" | "unknown"

export interface SalaryIndexAssessment {
  index: number // 100 is market baseline. 120 means +20% above market
  deltaPercent: number // e.g. +20 or -15
  band: MarketBand
  bandLabel: string
  offeredMidpoint: number
  benchmarkMedian: number
  currency: string
  confidence: number
  source: string
}

/**
 * Computes Salary Index relative to baseline (100 = median)
 */
export function computeSalaryIndex(
  offeredSalary: number | { min?: number | null; max?: number | null } | null | undefined,
  benchmark: {
    salaryMedian?: number | null
    salaryMin?: number | null
    salaryMax?: number | null
    currency?: string
    confidence?: number
    source?: string
  }
): SalaryIndexAssessment | null {
  if (!offeredSalary || !benchmark.salaryMedian || benchmark.salaryMedian <= 0) return null

  let offeredMidpoint: number
  if (typeof offeredSalary === "number") {
    offeredMidpoint = offeredSalary
  } else {
    const min = offeredSalary.min ?? offeredSalary.max ?? 0
    const max = offeredSalary.max ?? offeredSalary.min ?? 0
    if (min <= 0 && max <= 0) return null
    offeredMidpoint = (min + max) / 2
  }

  if (offeredMidpoint <= 0) return null

  const median = benchmark.salaryMedian
  const index = Number(((offeredMidpoint / median) * 100).toFixed(1))
  const deltaPercent = Number((((offeredMidpoint - median) / median) * 100).toFixed(1))

  let band: MarketBand = "at_market"
  let bandLabel = "Market Aligned"

  if (index >= 130) {
    band = "top_10"
    bandLabel = `Top 10% Market (+${deltaPercent}%)`
  } else if (index >= 110) {
    band = "above_market"
    bandLabel = `Above Market (+${deltaPercent}%)`
  } else if (index < 90) {
    band = "below_market"
    bandLabel = `Below Market (${deltaPercent}%)`
  }

  return {
    index,
    deltaPercent,
    band,
    bandLabel,
    offeredMidpoint,
    benchmarkMedian: median,
    currency: benchmark.currency || "USD",
    confidence: benchmark.confidence ?? 1.0,
    source: benchmark.source || "Market Benchmark",
  }
}

/**
 * Tone mapping for Stripe hairline styled badge
 */
export function formatSalaryIndexBadge(assessment: SalaryIndexAssessment): {
  label: string
  tone: "emerald" | "amber" | "rose" | "neutral"
} {
  switch (assessment.band) {
    case "top_10":
    case "above_market":
      return { label: `Index ${assessment.index} (${assessment.bandLabel})`, tone: "emerald" }
    case "below_market":
      return { label: `Index ${assessment.index} (${assessment.bandLabel})`, tone: "rose" }
    case "at_market":
    default:
      return { label: `Index ${assessment.index} (Market Aligned)`, tone: "neutral" }
  }
}

export interface SalaryBenchmarkResult {
  benchmark: {
    id?: string
    company: string
    role?: string | null
    location?: string | null
    salaryMin?: number | null
    salaryMax?: number | null
    salaryMedian: number
    salaryIndex?: number | null
    currency: string
    sampleSize?: number | null
    source: string
    confidence: number
  }
  matchScore: number
  source: string
}

export type SalaryRegion = "BD_BDT" | "BD_USD" | "EU" | "UK" | "GLOBAL_US"

export interface RoleBaseline {
  median: number
  min: number
  max: number
  category: string
}

/**
 * Detects target salary region from location and/or currency
 */
export function detectRegion(
  location?: string | null,
  currency?: string | null
): { region: SalaryRegion; currency: string; label: string } {
  const loc = (location || "").toLowerCase()
  const curr = (currency || "").toUpperCase()

  const isBD = /\b(bangladesh|dhaka|chittagong|ctg|sylhet|rajshahi|khulna|bd)\b/i.test(loc)

  if (curr === "BDT" || (isBD && curr !== "USD" && curr !== "EUR" && curr !== "GBP")) {
    return { region: "BD_BDT", currency: "BDT", label: "Bangladesh Market (BDT)" }
  }
  if (isBD && curr === "USD") {
    return { region: "BD_USD", currency: "USD", label: "Bangladesh Offshore (USD)" }
  }
  if (curr === "EUR" || /\b(germany|france|netherlands|berlin|amsterdam|paris|europe|eu)\b/i.test(loc)) {
    return { region: "EU", currency: "EUR", label: "European Market (EUR)" }
  }
  if (curr === "GBP" || /\b(uk|united kingdom|london|england|scotland)\b/i.test(loc)) {
    return { region: "UK", currency: "GBP", label: "UK Market (GBP)" }
  }
  return { region: "GLOBAL_US", currency: "USD", label: "Global US Market (USD)" }
}

// 1. Bangladesh Local Market (BDT / Annualized)
export const BANGLADESH_BDT_BASELINES: Record<string, RoleBaseline> = {
  principal: { median: 3600000, min: 2800000, max: 4800000, category: "Software Engineering" }, // ~300k BDT/mo
  staff: { median: 2880000, min: 2200000, max: 3600000, category: "Software Engineering" }, // ~240k BDT/mo
  lead: { median: 2280000, min: 1800000, max: 2880000, category: "Software Engineering" }, // ~190k BDT/mo
  manager: { median: 2880000, min: 2200000, max: 3800000, category: "Engineering Management" }, // ~240k BDT/mo
  senior: { median: 1560000, min: 1200000, max: 2160000, category: "Software Engineering" }, // ~130k BDT/mo (~15.6 LPA)
  mid: { median: 900000, min: 660000, max: 1200000, category: "Software Engineering" }, // ~75k BDT/mo (~9.0 LPA)
  junior: { median: 420000, min: 300000, max: 600000, category: "Software Engineering" }, // ~35k BDT/mo (~4.2 LPA)
  platform: { median: 1680000, min: 1200000, max: 2280000, category: "DevOps & Platform" }, // ~140k BDT/mo
  data: { median: 1620000, min: 1200000, max: 2160000, category: "Data & ML" }, // ~135k BDT/mo
  frontend: { median: 1380000, min: 960000, max: 1800000, category: "Frontend" }, // ~115k BDT/mo
  backend: { median: 1560000, min: 1140000, max: 2100000, category: "Backend" }, // ~130k BDT/mo
  fullstack: { median: 1500000, min: 1080000, max: 2040000, category: "Full Stack" }, // ~125k BDT/mo
}

// 2. Bangladesh Offshore Tech (USD / Annualized)
export const BANGLADESH_USD_BASELINES: Record<string, RoleBaseline> = {
  principal: { median: 36000, min: 28000, max: 48000, category: "Software Engineering" }, // ~$3k/mo
  staff: { median: 28000, min: 22000, max: 38000, category: "Software Engineering" }, // ~$2.3k/mo
  lead: { median: 24000, min: 19000, max: 32000, category: "Software Engineering" }, // ~$2k/mo
  manager: { median: 30000, min: 24000, max: 42000, category: "Engineering Management" }, // ~$2.5k/mo
  senior: { median: 18000, min: 13500, max: 26000, category: "Software Engineering" }, // ~$1.5k/mo
  mid: { median: 10800, min: 7200, max: 15000, category: "Software Engineering" }, // ~$900/mo
  junior: { median: 5400, min: 3600, max: 7800, category: "Software Engineering" }, // ~$450/mo
  platform: { median: 19000, min: 14000, max: 28000, category: "DevOps & Platform" },
  data: { median: 19000, min: 14000, max: 27000, category: "Data & ML" },
  frontend: { median: 16000, min: 12000, max: 24000, category: "Frontend" },
  backend: { median: 18000, min: 13500, max: 26000, category: "Backend" },
  fullstack: { median: 17000, min: 13000, max: 25000, category: "Full Stack" },
}

// 3. Europe (EUR / Annual)
export const EUROPE_EUR_BASELINES: Record<string, RoleBaseline> = {
  principal: { median: 135000, min: 110000, max: 170000, category: "Software Engineering" },
  staff: { median: 115000, min: 95000, max: 145000, category: "Software Engineering" },
  lead: { median: 95000, min: 80000, max: 120000, category: "Software Engineering" },
  manager: { median: 105000, min: 88000, max: 135000, category: "Engineering Management" },
  senior: { median: 85000, min: 70000, max: 105000, category: "Software Engineering" },
  mid: { median: 65000, min: 52000, max: 80000, category: "Software Engineering" },
  junior: { median: 48000, min: 40000, max: 58000, category: "Software Engineering" },
  platform: { median: 90000, min: 75000, max: 115000, category: "DevOps & Platform" },
  data: { median: 85000, min: 70000, max: 110000, category: "Data & ML" },
  frontend: { median: 78000, min: 62000, max: 95000, category: "Frontend" },
  backend: { median: 85000, min: 70000, max: 105000, category: "Backend" },
  fullstack: { median: 82000, min: 65000, max: 100000, category: "Full Stack" },
}

// 4. UK (GBP / Annual)
export const UK_GBP_BASELINES: Record<string, RoleBaseline> = {
  principal: { median: 130000, min: 105000, max: 165000, category: "Software Engineering" },
  staff: { median: 110000, min: 90000, max: 140000, category: "Software Engineering" },
  lead: { median: 90000, min: 75000, max: 115000, category: "Software Engineering" },
  manager: { median: 98000, min: 82000, max: 125000, category: "Engineering Management" },
  senior: { median: 80000, min: 65000, max: 100000, category: "Software Engineering" },
  mid: { median: 60000, min: 48000, max: 75000, category: "Software Engineering" },
  junior: { median: 42000, min: 35000, max: 52000, category: "Software Engineering" },
  platform: { median: 85000, min: 70000, max: 110000, category: "DevOps & Platform" },
  data: { median: 80000, min: 65000, max: 105000, category: "Data & ML" },
  frontend: { median: 75000, min: 60000, max: 92000, category: "Frontend" },
  backend: { median: 80000, min: 65000, max: 100000, category: "Backend" },
  fullstack: { median: 78000, min: 62000, max: 96000, category: "Full Stack" },
}

// 5. Global US / Remote Tech (USD / Annual - Default)
export const GLOBAL_US_BASELINES: Record<string, RoleBaseline> = {
  staff: { median: 235000, min: 200000, max: 280000, category: "Software Engineering" },
  principal: { median: 275000, min: 230000, max: 340000, category: "Software Engineering" },
  senior: { median: 175000, min: 145000, max: 210000, category: "Software Engineering" },
  mid: { median: 135000, min: 110000, max: 160000, category: "Software Engineering" },
  junior: { median: 95000, min: 80000, max: 115000, category: "Software Engineering" },
  lead: { median: 195000, min: 165000, max: 235000, category: "Software Engineering" },
  manager: { median: 215000, min: 180000, max: 260000, category: "Engineering Management" },
  data: { median: 165000, min: 135000, max: 200000, category: "Data & ML" },
  platform: { median: 180000, min: 150000, max: 220000, category: "DevOps & Platform" },
  frontend: { median: 160000, min: 130000, max: 195000, category: "Frontend" },
  fullstack: { median: 165000, min: 135000, max: 200000, category: "Full Stack" },
  backend: { median: 170000, min: 140000, max: 205000, category: "Backend" },
}

// Backward-compatible alias
export const INDUSTRY_ROLE_BASELINES = GLOBAL_US_BASELINES

/**
 * Resolves appropriate baseline given role, location, and currency
 */
export function getIndustryBaseline(
  role?: string | null,
  location?: string | null,
  currency?: string | null
): {
  median: number
  min: number
  max: number
  currency: string
  category: string
  source: string
  region: SalaryRegion
} {
  const { region, currency: detectedCurr, label } = detectRegion(location, currency)

  let table = GLOBAL_US_BASELINES
  if (region === "BD_BDT") table = BANGLADESH_BDT_BASELINES
  else if (region === "BD_USD") table = BANGLADESH_USD_BASELINES
  else if (region === "EU") table = EUROPE_EUR_BASELINES
  else if (region === "UK") table = UK_GBP_BASELINES

  const roleLower = (role || "senior software engineer").toLowerCase()
  let matched = table.senior

  if (roleLower.includes("staff")) matched = table.staff
  else if (roleLower.includes("principal") || roleLower.includes("architect")) matched = table.principal
  else if (roleLower.includes("lead")) matched = table.lead
  else if (roleLower.includes("manager") || roleLower.includes("director")) matched = table.manager
  else if (roleLower.includes("junior") || roleLower.includes("entry") || roleLower.includes("associate")) matched = table.junior
  else if (roleLower.includes("platform") || roleLower.includes("devops") || roleLower.includes("sre") || roleLower.includes("infra"))
    matched = table.platform
  else if (roleLower.includes("data") || roleLower.includes("ml") || roleLower.includes("ai") || roleLower.includes("machine learning"))
    matched = table.data
  else if (roleLower.includes("frontend") || roleLower.includes("front-end") || roleLower.includes("ui") || roleLower.includes("web"))
    matched = table.frontend
  else if (roleLower.includes("backend") || roleLower.includes("back-end"))
    matched = table.backend
  else if (roleLower.includes("fullstack") || roleLower.includes("full-stack"))
    matched = table.fullstack
  else if (roleLower.includes("mid") || roleLower.includes("software engineer"))
    matched = roleLower.includes("senior") ? table.senior : table.mid

  return {
    median: matched.median,
    min: matched.min,
    max: matched.max,
    currency: detectedCurr,
    category: matched.category,
    source: `${label} Baseline`,
    region,
  }
}

/**
 * Searches for a salary benchmark by company, role, location, and currency
 */
export async function findSalaryBenchmark(query: {
  company: string
  role?: string
  location?: string
  currency?: string
}): Promise<SalaryBenchmarkResult | null> {
  const normQuery = normalizeCompanyName(query.company)
  if (!normQuery) return null

  const targetRegion = detectRegion(query.location, query.currency)
  const cacheKey = `salary:benchmark:${normQuery}:${query.role || ""}:${query.location || ""}:${targetRegion.currency}`
  const cached = await getCachedJson<SalaryBenchmarkResult>(cacheKey)
  if (cached) return cached

  let result: SalaryBenchmarkResult | null = null

  try {
    const candidates = await withDbRetry(() =>
      prisma.salaryBenchmark.findMany({
        take: 50,
      })
    )

    let bestMatch: (typeof candidates)[0] | null = null
    let bestScore = 0

    for (const entry of candidates) {
      let score = calculateCompanyMatchScore(query.company, entry.company)
      
      // If currency matches the target, give confidence boost
      if (entry.currency === targetRegion.currency) {
        score += 5
      }

      if (score > bestScore) {
        bestScore = score
        bestMatch = entry
      }
    }

    if (bestMatch && bestScore >= 60 && bestMatch.salaryMedian) {
      result = {
        benchmark: {
          id: bestMatch.id,
          company: bestMatch.company,
          role: bestMatch.role,
          location: bestMatch.location,
          salaryMin: bestMatch.salaryMin,
          salaryMax: bestMatch.salaryMax,
          salaryMedian: bestMatch.salaryMedian,
          salaryIndex: bestMatch.salaryIndex,
          currency: bestMatch.currency,
          sampleSize: bestMatch.sampleSize,
          source: bestMatch.source,
          confidence: bestMatch.confidence,
        },
        matchScore: Math.min(100, bestScore),
        source: bestMatch.source,
      }
    }
  } catch (error) {
    console.warn("[SalaryBenchmarkEngine] DB search failed, falling back to role baseline:", error)
  }

  // Fallback to region & role-aware industry baseline
  if (!result) {
    const baseline = getIndustryBaseline(query.role, query.location, query.currency)
    result = {
      benchmark: {
        company: query.company,
        role: query.role || "Software Engineer",
        salaryMedian: baseline.median,
        salaryMin: baseline.min,
        salaryMax: baseline.max,
        currency: baseline.currency,
        confidence: 0.75,
        source: baseline.source,
      },
      matchScore: 50,
      source: baseline.source,
    }
  }

  void setCachedJson(cacheKey, result, 3600)
  return result
}
