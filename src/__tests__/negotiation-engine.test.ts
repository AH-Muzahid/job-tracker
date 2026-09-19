/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  benchmarkOfferCompensation,
  calculatePipelineLeverage,
  generateNegotiationStrategies,
  saveOfferNegotiationStrategy,
} from "@/lib/applications/negotiate-engine"
import { prisma } from "@/lib/prisma"
import { GET, POST } from "@/app/api/applications/[id]/negotiate/route"
import { NextRequest } from "next/server"

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    applicationAnalysis: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    userProfile: {
      findUnique: vi.fn(),
    },
  },
  withDbRetry: vi.fn((fn) => fn()),
}))

// Mock Auth
vi.mock("@/lib/auth", () => ({
  getInternalUserId: vi.fn().mockResolvedValue("user-test-negotiate"),
}))

// Mock Redis
vi.mock("@/lib/redis", () => ({
  invalidateCache: vi.fn().mockResolvedValue(true),
  getCachedJson: vi.fn().mockResolvedValue(null),
  setCachedJson: vi.fn().mockResolvedValue(true),
}))

// Mock Rate Limit
vi.mock("@/lib/rate-limit", () => ({
  checkDistributedRateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}))

// Mock AI
vi.mock("ai", () => ({
  generateText: vi.fn(),
}))

vi.mock("@/lib/ai/config", () => ({
  getUserAIConfig: vi.fn().mockResolvedValue(null),
}))

describe("CAG-16: Offer Benchmarking & Counter-Offer Strategy Assistant", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Market Percentile Benchmarking", () => {
    it("calculates accurate market bands and percentiles for Senior Backend Engineer in USD", () => {
      const benchmark = benchmarkOfferCompensation({
        jobTitle: "Senior Backend Engineer",
        seniority: "senior",
        currency: "USD",
        baseSalary: 170000,
      })

      expect(benchmark.marketBand.currency).toBe("USD")
      expect(benchmark.marketBand.p50).toBe(170000)
      expect(benchmark.marketBand.p75).toBe(198000)
      expect(benchmark.percentileRank).toBe(50)
      expect(benchmark.statusDescription).toContain("Market Median")
    })

    it("detects below-market offer and marks for high counter-offer justification", () => {
      const benchmark = benchmarkOfferCompensation({
        jobTitle: "Senior Full Stack Engineer",
        seniority: "senior",
        currency: "USD",
        baseSalary: 110000,
      })

      expect(benchmark.percentileRank).toBeLessThan(35)
      expect(benchmark.statusDescription).toContain("Below Market Median")
    })

    it("applies currency scaling correctly for EUR and GBP", () => {
      const benchmarkEur = benchmarkOfferCompensation({
        jobTitle: "Frontend Engineer",
        seniority: "mid",
        currency: "EUR",
        baseSalary: 100000,
      })

      expect(benchmarkEur.marketBand.currency).toBe("EUR")
      expect(benchmarkEur.marketBand.p50).toBe(Math.round(115000 * 0.92))
    })
  })

  describe("Pipeline Leverage (BATNA) Calculation", () => {
    it("assigns LOW leverage when candidate has 0 competing offers or active interviews", async () => {
      vi.mocked(prisma.application.findMany).mockResolvedValueOnce([])

      const leverage = await calculatePipelineLeverage("user-test-negotiate", "app-target")

      expect(leverage.score).toBeLessThan(35)
      expect(leverage.level).toBe("LOW")
      expect(leverage.competingOffersCount).toBe(0)
    })

    it("assigns STRONG leverage when candidate has multiple active final-round interviews", async () => {
      vi.mocked(prisma.application.findMany).mockResolvedValueOnce([
        { id: "app-1", status: "Interview", companyName: "Stripe", jobTitle: "Engineer" },
        { id: "app-2", status: "Interview", companyName: "Datadog", jobTitle: "Engineer" },
        { id: "app-3", status: "Interview", companyName: "Vercel", jobTitle: "Engineer" },
      ] as any)

      const leverage = await calculatePipelineLeverage("user-test-negotiate", "app-target")

      // Base 25 + 3 * 15 = 70 points -> STRONG
      expect(leverage.score).toBe(70)
      expect(leverage.level).toBe("STRONG")
      expect(leverage.activeInterviewsCount).toBe(3)
      expect(leverage.tacticalAdvantage).toContain("75th market percentile")
    })

    it("assigns MAXIMUM leverage when candidate holds competing offers", async () => {
      vi.mocked(prisma.application.findMany).mockResolvedValueOnce([
        { id: "app-comp-1", status: "Offer", companyName: "OpenAI", jobTitle: "Engineer" },
        { id: "app-comp-2", status: "Offer", companyName: "Anthropic", jobTitle: "Engineer" },
      ] as any)

      const leverage = await calculatePipelineLeverage("user-test-negotiate", "app-target")

      // Base 25 + 2 * 35 = 95 points -> MAXIMUM
      expect(leverage.score).toBeGreaterThanOrEqual(85)
      expect(leverage.level).toBe("MAXIMUM")
      expect(leverage.competingOffersCount).toBe(2)
      expect(leverage.summary).toContain("2 competing offer(s)")
    })
  })

  describe("3 Tiered Counter-Offer Strategy Generation", () => {
    it("generates Conservative, Balanced, and Ambitious strategies with scripts and talking points", async () => {
      const marketBand = {
        p25: 140000,
        p50: 165000,
        p75: 190000,
        p90: 220000,
        currency: "USD",
      }

      const leverage = {
        score: 75,
        level: "STRONG" as const,
        activeInterviewsCount: 2,
        competingOffersCount: 1,
        summary: "1 competing offer",
        tacticalAdvantage: "Leverage competing timelines",
      }

      const strategies = await generateNegotiationStrategies({
        userId: "user-test-negotiate",
        companyName: "Linear",
        jobTitle: "Senior Product Engineer",
        candidateName: "Alex Mercer",
        baseSalary: 160000,
        currency: "USD",
        marketBand,
        leverage,
      })

      expect(strategies).toHaveLength(3)

      const [conservative, balanced, ambitious] = strategies

      // Conservative Tier
      expect(conservative.tierName).toBe("Conservative")
      expect(conservative.riskLevel).toBe("Low")
      expect(conservative.targetTotalComp).toBe(168000)
      expect(conservative.emailScript).toContain("Linear")
      expect(conservative.emailScript).toContain("Alex Mercer")

      // Balanced Tier
      expect(balanced.tierName).toBe("Balanced")
      expect(balanced.riskLevel).toBe("Moderate")
      expect(balanced.targetTotalComp).toBeGreaterThanOrEqual(176000)
      expect(balanced.emailScript).toContain("75th percentile")

      // Ambitious Tier
      expect(ambitious.tierName).toBe("Ambitious")
      expect(ambitious.riskLevel).toBe("High")
      expect(ambitious.targetTotalComp).toBeGreaterThanOrEqual(220000)
      expect(ambitious.emailScript).toContain("evaluating other active opportunities")
    })
  })

  describe("Persistence & State Synchronization", () => {
    it("persists offerDetails to Application and updates ApplicationAnalysis", async () => {
      vi.mocked(prisma.application.update).mockResolvedValueOnce({ id: "app-1" } as any)
      vi.mocked(prisma.applicationAnalysis.findUnique).mockResolvedValueOnce({
        id: "analysis-1",
        applyStrategy: {},
      } as any)

      await saveOfferNegotiationStrategy("app-1", "user-test-negotiate", {
        baseSalary: 150000,
        currency: "USD",
        bonus: 15000,
      })

      expect(prisma.application.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "app-1", userId: "user-test-negotiate" },
          data: expect.objectContaining({
            offerDetails: expect.objectContaining({ baseSalary: 150000 }),
          }),
        })
      )

      expect(prisma.applicationAnalysis.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { applicationId: "app-1" },
          data: expect.objectContaining({
            applyStrategy: expect.objectContaining({
              offerNegotiation: expect.objectContaining({ baseSalary: 150000 }),
            }),
          }),
        })
      )
    })
  })

  describe("Negotiation API Endpoints (/api/applications/[id]/negotiate)", () => {
    it("GET returns current offer details, benchmark, and leverage", async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValueOnce({
        id: "app-offer-1",
        userId: "user-test-negotiate",
        companyName: "Stripe",
        jobTitle: "Software Engineer",
        status: "Offer",
        company: { name: "Stripe" },
        offerDetails: {
          baseSalary: 165000,
          currency: "USD",
        },
      } as any)

      vi.mocked(prisma.application.findMany).mockResolvedValueOnce([]) // for leverage check

      const req = new NextRequest("http://localhost:3000/api/applications/app-offer-1/negotiate")
      const res = await GET(req, { params: Promise.resolve({ id: "app-offer-1" }) })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.companyName).toBe("Stripe")
      expect(json.benchmark).toBeDefined()
      expect(json.leverage).toBeDefined()
      expect(json.offerDetails.baseSalary).toBe(165000)
    })

    it("POST rejects invalid baseSalary with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/applications/app-offer-1/negotiate", {
        method: "POST",
        body: JSON.stringify({ baseSalary: -500 }),
      })

      const res = await POST(req, { params: Promise.resolve({ id: "app-offer-1" }) })
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toContain("Valid baseSalary is required")
    })

    it("POST computes benchmark, leverage, 3 strategies, and saves to database", async () => {
      vi.mocked(prisma.application.findUnique).mockResolvedValueOnce({
        id: "app-offer-1",
        userId: "user-test-negotiate",
        companyName: "Vercel",
        jobTitle: "Frontend Engineer",
        status: "Offer",
        company: { name: "Vercel" },
      } as any)

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        name: "Alex",
      } as any)

      vi.mocked(prisma.application.findMany).mockResolvedValueOnce([
        { id: "app-comp", status: "Offer", companyName: "Figma", jobTitle: "Frontend Engineer" },
      ] as any)

      const req = new NextRequest("http://localhost:3000/api/applications/app-offer-1/negotiate", {
        method: "POST",
        body: JSON.stringify({
          baseSalary: 140000,
          currency: "USD",
          bonus: 10000,
          equity: "0.05%",
        }),
      })

      const res = await POST(req, { params: Promise.resolve({ id: "app-offer-1" }) })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.percentileRank).toBeDefined()
      expect(json.leverage.score).toBeGreaterThan(50)
      expect(json.strategies).toHaveLength(3)
      expect(json.strategies[0].tierName).toBe("Conservative")
      expect(json.strategies[1].tierName).toBe("Balanced")
      expect(json.strategies[2].tierName).toBe("Ambitious")
    })
  })
})
