import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  normalizeCompanyName,
  calculateCompanyMatchScore,
  computeSalaryIndex,
  extractCoreWords,
  formatSalaryIndexBadge,
  findSalaryBenchmark,
  parseSalaryString,
  detectRegion,
  getIndustryBaseline,
} from "@/lib/salary/benchmark-engine"
import { prisma } from "@/lib/prisma"

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    salaryBenchmark: {
      findMany: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    },
  },
  withDbRetry: vi.fn((fn: any) => fn()),
}))

describe("Salary Benchmark Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("1. Company Name Normalization & Fuzzy Matching", () => {
    it("normalizes standard legal suffixes and punctuation", () => {
      expect(normalizeCompanyName("Stripe, Inc.")).toBe("stripe")
      expect(normalizeCompanyName("Maersk A/S")).toBe("maersk")
      expect(normalizeCompanyName("Novo Nordisk ApS (VG)")).toBe("novo nordisk")
      expect(normalizeCompanyName("Spotify AB")).toBe("spotify")
      expect(normalizeCompanyName("Acme Corp.")).toBe("acme")
      expect(normalizeCompanyName("Tech Global LLC")).toBe("tech global")
    })

    it("handles Nordic transliterations seamlessly", () => {
      // Danish ø -> o, æ -> ae, å -> aa
      expect(normalizeCompanyName("København Software")).toBe("kobenhavn software")
      expect(normalizeCompanyName("Mærsk")).toBe("maersk")
      expect(normalizeCompanyName("Århus Tech")).toBe("aarhus tech")
    })

    it("extracts core words cleanly", () => {
      const words = extractCoreWords("Stripe Payments Europe Ltd.")
      expect(words).toContain("stripe")
      expect(words).toContain("payments")
      expect(words).toContain("europe")
      expect(words).not.toContain("ltd")
    })

    it("calculates accurate match scores", () => {
      // Exact match after normalization
      expect(calculateCompanyMatchScore("Stripe", "Stripe Inc.")).toBe(100)
      
      // Substring match
      const subScore = calculateCompanyMatchScore("Stripe", "Stripe Payments Group")
      expect(subScore).toBeGreaterThanOrEqual(80)

      // Transliterated match
      const transScore = calculateCompanyMatchScore("Maersk", "Mærsk A/S")
      expect(transScore).toBeGreaterThanOrEqual(85)

      // Completely unrelated company
      expect(calculateCompanyMatchScore("Google", "Netflix")).toBe(0)
    })
  })

  describe("2. Salary String Parsing", () => {
    it("parses diverse salary formats correctly", () => {
      expect(parseSalaryString("$140,000 - $180,000")).toEqual({
        min: 140000,
        max: 180000,
        midpoint: 160000,
        currency: "USD",
      })

      expect(parseSalaryString("120k - 150k USD")).toEqual({
        min: 120000,
        max: 150000,
        midpoint: 135000,
        currency: "USD",
      })

      expect(parseSalaryString("£80,000 / yr")).toEqual({
        min: 80000,
        max: 80000,
        midpoint: 80000,
        currency: "GBP",
      })

      expect(parseSalaryString("€95k")).toEqual({
        min: 95000,
        max: 95000,
        midpoint: 95000,
        currency: "EUR",
      })

      // Bangladesh & South Asian parsing (monthly, Lakh, LPA, BDT, ৳)
      expect(parseSalaryString("৳1,50,000 - ৳2,20,000 / month")).toEqual({
        min: 1800000, // 150k * 12
        max: 2640000, // 220k * 12
        midpoint: 2220000,
        currency: "BDT",
      })

      expect(parseSalaryString("80k - 120k BDT / mo")).toEqual({
        min: 960000, // 80k * 12
        max: 1440000, // 120k * 12
        midpoint: 1200000,
        currency: "BDT",
      })

      expect(parseSalaryString("15 - 20 LPA")).toEqual({
        min: 1500000,
        max: 2000000,
        midpoint: 1750000,
        currency: "BDT",
      })

      expect(parseSalaryString("$2,000 - $3,000 / month")).toEqual({
        min: 24000,
        max: 36000,
        midpoint: 30000,
        currency: "USD",
      })

      expect(parseSalaryString("Competitive salary")).toBeNull()
    })
  })

  describe("3. Salary Index & Market Band Assessment", () => {
    const benchmark = {
      salaryMedian: 150000,
      salaryMin: 120000,
      salaryMax: 180000,
      currency: "USD",
      source: "Levels.fyi Benchmark",
    }

    it("calculates above-market index and assigns correct band", () => {
      // 180,000 is +20% over 150,000 median -> index 120
      const assessment = computeSalaryIndex(180000, benchmark)
      expect(assessment).not.toBeNull()
      expect(assessment?.index).toBe(120)
      expect(assessment?.deltaPercent).toBe(20)
      expect(assessment?.band).toBe("above_market")
      expect(assessment?.bandLabel).toContain("Above Market")
    })

    it("calculates top 10% market index for exceptional offers", () => {
      // 210,000 is +40% over 150,000 median -> top_10
      const assessment = computeSalaryIndex(210000, benchmark)
      expect(assessment?.band).toBe("top_10")
      expect(assessment?.bandLabel).toContain("Top 10%")
    })

    it("calculates market-aligned index when close to median", () => {
      // 153,000 is +2% over 150,000 median -> at_market
      const assessment = computeSalaryIndex(153000, benchmark)
      expect(assessment?.band).toBe("at_market")
      expect(assessment?.bandLabel).toContain("Market Aligned")
    })

    it("calculates below-market index when under median", () => {
      // 120,000 is -20% under 150,000 median -> below_market
      const assessment = computeSalaryIndex(120000, benchmark)
      expect(assessment?.index).toBe(80)
      expect(assessment?.deltaPercent).toBe(-20)
      expect(assessment?.band).toBe("below_market")
      expect(assessment?.bandLabel).toContain("Below Market")
    })

    it("handles range input correctly by using midpoint", () => {
      const assessment = computeSalaryIndex({ min: 140000, max: 180000 }, benchmark)
      expect(assessment?.offeredMidpoint).toBe(160000)
      expect(assessment?.index).toBe(106.7)
    })

    it("returns appropriate badge tone", () => {
      const high = computeSalaryIndex(180000, benchmark)!
      expect(formatSalaryIndexBadge(high).tone).toBe("emerald")

      const mid = computeSalaryIndex(150000, benchmark)!
      expect(formatSalaryIndexBadge(mid).tone).toBe("neutral")

      const low = computeSalaryIndex(110000, benchmark)!
      expect(formatSalaryIndexBadge(low).tone).toBe("rose")
    })
  })

  describe("4. Database & Fallback Benchmark Search", () => {
    it("finds matching benchmark from DB with fuzzy matching", async () => {
      vi.mocked(prisma.salaryBenchmark.findMany).mockResolvedValueOnce([
        {
          id: "sb-1",
          company: "Stripe",
          role: "Senior Software Engineer",
          location: "Remote - US",
          salaryMin: 180000,
          salaryMax: 240000,
          salaryMedian: 210000,
          salaryIndex: 125,
          currency: "USD",
          sampleSize: 42,
          source: "Levels.fyi",
          confidence: 0.95,
          category: "Software Engineering",
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any)

      const result = await findSalaryBenchmark({
        company: "Stripe Inc",
        role: "Senior Software Engineer",
      })

      expect(result).not.toBeNull()
      expect(result?.benchmark.company).toBe("Stripe")
      expect(result?.matchScore).toBe(100)
      expect(result?.benchmark.salaryMedian).toBe(210000)
    })

    it("falls back to reference industry benchmark when DB has no exact entry", async () => {
      vi.mocked(prisma.salaryBenchmark.findMany).mockResolvedValueOnce([])

      const result = await findSalaryBenchmark({
        company: "Acme Startups",
        role: "Staff Software Engineer",
      })

      expect(result).not.toBeNull()
      expect(result?.benchmark.salaryMedian).toBeGreaterThan(150000)
      expect(result?.source).toContain("Global US Market")
    })

    it("detects regions accurately from location and currency", () => {
      expect(detectRegion("Dhaka, Bangladesh", "BDT").region).toBe("BD_BDT")
      expect(detectRegion("Chittagong", undefined).region).toBe("BD_BDT")
      expect(detectRegion("Bangladesh (Remote)", "USD").region).toBe("BD_USD")
      expect(detectRegion("Berlin, Germany", "EUR").region).toBe("EU")
      expect(detectRegion("London, UK", "GBP").region).toBe("UK")
      expect(detectRegion("San Francisco, CA", "USD").region).toBe("GLOBAL_US")
    })

    it("falls back to Bangladesh baseline for Bangladeshi jobs and evaluates realistic index", async () => {
      vi.mocked(prisma.salaryBenchmark.findMany).mockResolvedValueOnce([])

      // Local Bangladesh SWE Job in BDT
      const bdResult = await findSalaryBenchmark({
        company: "Brain Station 23",
        role: "Senior Software Engineer",
        location: "Dhaka, Bangladesh",
        currency: "BDT",
      })

      expect(bdResult).not.toBeNull()
      expect(bdResult?.benchmark.currency).toBe("BDT")
      expect(bdResult?.benchmark.salaryMedian).toBe(1560000) // ~130k/mo
      expect(bdResult?.source).toContain("Bangladesh Market (BDT)")

      // If offered 130k BDT/mo (= 1,560,000 BDT/yr), it should be Market Aligned (Index 100)
      const assessment = computeSalaryIndex(1560000, bdResult!.benchmark)
      expect(assessment?.index).toBe(100)
      expect(assessment?.band).toBe("at_market")

      // If offered 210k BDT/mo (= 2,520,000 BDT/yr), it should be Top 10%
      const topOffer = computeSalaryIndex(2520000, bdResult!.benchmark)
      expect(topOffer?.band).toBe("top_10")
      expect(topOffer?.index).toBeGreaterThanOrEqual(130)
    })

    it("handles Bangladesh offshore tech roles paid in USD", async () => {
      vi.mocked(prisma.salaryBenchmark.findMany).mockResolvedValueOnce([])

      const bdUsdResult = await findSalaryBenchmark({
        company: "Offshore Hub",
        role: "Senior Backend Engineer",
        location: "Bangladesh (Remote)",
        currency: "USD",
      })

      expect(bdUsdResult).not.toBeNull()
      expect(bdUsdResult?.benchmark.currency).toBe("USD")
      expect(bdUsdResult?.benchmark.salaryMedian).toBe(18000) // $18k/yr ($1,500/mo)
      expect(bdUsdResult?.source).toContain("Bangladesh Offshore (USD)")

      // $2,000/mo (= $24k/yr) -> Above market
      const assessment = computeSalaryIndex(24000, bdUsdResult!.benchmark)
      expect(assessment?.band).toBe("top_10")
      expect(assessment?.index).toBeGreaterThanOrEqual(130)
    })
  })
})
