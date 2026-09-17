import { describe, it, expect, vi } from "vitest"

// Mock internal auth and prisma
vi.mock("@/lib/auth", () => ({
  getInternalUserId: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    interviewSession: {
      findMany: vi.fn(),
    },
  },
}))

import { getInternalUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { GET } from "@/app/api/interview-sessions/analytics/route"
import {
  classifyCompanyTier,
  calculateReadiness,
  calculateRoundProficiency,
  computeLongitudinalMasteryAnalytics,
  RawInterviewSessionInput,
} from "@/lib/interview/company-benchmarks"

describe("Longitudinal Interview Mastery & Benchmarking Engine", () => {
  describe("Company Tier Classification", () => {
    it("classifies Big Tech / Tier 1 companies accurately", () => {
      const google = classifyCompanyTier("Google LLC")
      expect(google.tier).toBe("Tier 1 (Big Tech)")
      expect(google.benchmarkTarget).toBe(85)

      const meta = classifyCompanyTier("Meta Platforms Inc")
      expect(meta.tier).toBe("Tier 1 (Big Tech)")

      const stripe = classifyCompanyTier("Stripe")
      expect(stripe.tier).toBe("Tier 1 (Big Tech)")

      const openai = classifyCompanyTier("OpenAI Inc")
      expect(openai.tier).toBe("Tier 1 (Big Tech)")
    })

    it("classifies Scaleup / Enterprise / Tier 2 companies accurately", () => {
      const spotify = classifyCompanyTier("Spotify")
      expect(spotify.tier).toBe("Tier 2 (Scaleup / Enterprise)")
      expect(spotify.benchmarkTarget).toBe(75)

      const shopify = classifyCompanyTier("Shopify Commerce")
      expect(shopify.tier).toBe("Tier 2 (Scaleup / Enterprise)")

      const cloudflare = classifyCompanyTier("Cloudflare")
      expect(cloudflare.tier).toBe("Tier 2 (Scaleup / Enterprise)")
    })

    it("defaults other companies to Tier 3 (Startup / Mid-Market)", () => {
      const startup = classifyCompanyTier("Fintech Seedling Labs")
      expect(startup.tier).toBe("Tier 3 (Startup / Mid-Market)")
      expect(startup.benchmarkTarget).toBe(70)

      const unknown = classifyCompanyTier("")
      expect(unknown.tier).toBe("Tier 3 (Startup / Mid-Market)")
    })
  })

  describe("Readiness & Proficiency Calculation", () => {
    it("returns Not Evaluated when 0 sessions exist", () => {
      expect(calculateReadiness(0, 85, 0)).toBe("Not Evaluated")
    })

    it("calculates Ready when average exceeds benchmark", () => {
      expect(calculateReadiness(88, 85, 2)).toBe("Ready")
      expect(calculateReadiness(85, 85, 1)).toBe("Ready")
    })

    it("calculates Competitive when within 7 points of benchmark", () => {
      expect(calculateReadiness(80, 85, 2)).toBe("Competitive")
      expect(calculateReadiness(78, 85, 3)).toBe("Competitive")
    })

    it("calculates Borderline when within 15 points of benchmark", () => {
      expect(calculateReadiness(72, 85, 2)).toBe("Borderline")
    })

    it("calculates Gap Identified when below benchmark threshold", () => {
      expect(calculateReadiness(65, 85, 3)).toBe("Gap Identified")
      expect(calculateReadiness(50, 75, 1)).toBe("Gap Identified")
    })

    it("calculates round proficiency status correctly", () => {
      expect(calculateRoundProficiency(90)).toBe("Mastered")
      expect(calculateRoundProficiency(78)).toBe("Proficient")
      expect(calculateRoundProficiency(65)).toBe("Developing")
      expect(calculateRoundProficiency(45)).toBe("Needs Practice")
    })
  })

  describe("computeLongitudinalMasteryAnalytics", () => {
    it("handles empty sessions gracefully", () => {
      const result = computeLongitudinalMasteryAnalytics([])
      expect(result.totalSessions).toBe(0)
      expect(result.averageScore).toBe(0)
      expect(result.passRate).toBe(0)
      expect(result.scoreProgression).toEqual([])
      expect(result.recurringWeaknesses).toEqual([])
      expect(result.companyTierBenchmarks["Tier 1 (Big Tech)"].readiness).toBe("Not Evaluated")
    })

    it("computes trajectory, archetypes, and company benchmarks over multiple sessions", () => {
      const mockSessions: RawInterviewSessionInput[] = [
        {
          id: "s1",
          targetCompany: "Acme Startup",
          targetRole: "Fullstack Dev",
          interviewType: "Behavioral",
          score: 60,
          verdict: "Lean Hire",
          createdAt: new Date("2026-08-01T10:00:00Z"),
          report: {
            knowledgeGaps: [
              { topic: "STAR Ownership", type: "behavioral", severity: "high" },
              { topic: "Conflict Resolution", type: "behavioral", severity: "medium" },
            ],
          },
        },
        {
          id: "s2",
          targetCompany: "Spotify",
          targetRole: "Backend Engineer",
          interviewType: "Technical",
          score: 76,
          verdict: "Hire",
          createdAt: new Date("2026-08-15T10:00:00Z"),
          report: {
            knowledgeGaps: [
              { topic: "Distributed Caching", type: "technical", severity: "high" },
              { topic: "STAR Ownership", type: "behavioral", severity: "medium" },
            ],
          },
        },
        {
          id: "s3",
          targetCompany: "Google",
          targetRole: "Staff Software Engineer",
          interviewType: "System Design",
          score: 88,
          verdict: "Strong Hire",
          createdAt: new Date("2026-09-01T10:00:00Z"),
          report: {
            knowledgeGaps: [
              { topic: "Distributed Caching", type: "technical", severity: "medium" },
            ],
          },
        },
      ]

      const analytics = computeLongitudinalMasteryAnalytics(mockSessions)

      expect(analytics.totalSessions).toBe(3)
      expect(analytics.scoredSessionsCount).toBe(3)
      // Average: (60 + 76 + 88) / 3 = 224 / 3 = 74.7
      expect(analytics.averageScore).toBe(74.7)
      expect(analytics.highestScore).toBe(88)
      expect(analytics.lowestScore).toBe(60)

      // Trajectory: early avg vs recent avg
      expect(analytics.trajectoryChange).toBeGreaterThan(0)

      // Score progression points sorted chronologically
      expect(analytics.scoreProgression).toHaveLength(3)
      expect(analytics.scoreProgression[0].targetCompany).toBe("Acme Startup")
      expect(analytics.scoreProgression[2].targetCompany).toBe("Google")
      expect(analytics.scoreProgression[2].companyTier).toBe("Tier 1 (Big Tech)")

      // Round archetypes
      expect(analytics.roundArchetypes["Behavioral"].averageScore).toBe(60)
      expect(analytics.roundArchetypes["Technical"].averageScore).toBe(76)
      expect(analytics.roundArchetypes["System Design"].averageScore).toBe(88)
      expect(analytics.roundArchetypes["System Design"].status).toBe("Mastered")

      // Tier benchmarks
      const tier1 = analytics.companyTierBenchmarks["Tier 1 (Big Tech)"]
      expect(tier1.sessionCount).toBe(1)
      expect(tier1.averageScore).toBe(88)
      expect(tier1.readiness).toBe("Ready")

      const tier2 = analytics.companyTierBenchmarks["Tier 2 (Scaleup / Enterprise)"]
      expect(tier2.sessionCount).toBe(1)
      expect(tier2.averageScore).toBe(76)
      expect(tier2.readiness).toBe("Ready") // >= 75

      const tier3 = analytics.companyTierBenchmarks["Tier 3 (Startup / Mid-Market)"]
      expect(tier3.sessionCount).toBe(1)
      expect(tier3.averageScore).toBe(60)
      expect(tier3.readiness).toBe("Borderline")

      // Recurring Weaknesses ranking
      expect(analytics.recurringWeaknesses.length).toBeGreaterThanOrEqual(2)
      // "STAR Ownership" appeared twice (s1 and s2), "Distributed Caching" appeared twice (s2 and s3)
      const topTopics = analytics.recurringWeaknesses.map((w) => w.topic)
      expect(topTopics).toContain("STAR Ownership")
      expect(topTopics).toContain("Distributed Caching")
      expect(analytics.recurringWeaknesses[0].occurrences).toBe(2)

      // Verdict distribution
      expect(analytics.verdictDistribution.strongHire).toBe(1)
      expect(analytics.verdictDistribution.hire).toBe(1)
      expect(analytics.verdictDistribution.leanHire).toBe(1)
    })
  })

  describe("GET /api/interview-sessions/analytics Endpoint", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(getInternalUserId).mockResolvedValueOnce(null)
      const res = await GET()
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 200 with aggregated longitudinal analytics for authenticated user", async () => {
      vi.mocked(getInternalUserId).mockResolvedValueOnce("user-test-456")
      vi.mocked(prisma.interviewSession.findMany).mockResolvedValueOnce([
        {
          id: "sess-1",
          targetCompany: "Google",
          targetRole: "Staff L6 Engineer",
          interviewType: "System Design",
          language: "en",
          score: 86,
          verdict: "Strong Hire",
          dialogue: [{ role: "assistant", text: "Q1" }, { role: "user", text: "A1" }],
          report: {
            overallScore: 86,
            knowledgeGaps: [{ topic: "Gossip Protocols", severity: "medium" }],
          },
          createdAt: new Date("2026-09-10T12:00:00Z"),
        },
      ] as any)

      const res = await GET()
      expect(res.status).toBe(200)
      const json = await res.json()

      expect(json.totalSessions).toBe(1)
      expect(json.averageScore).toBe(86)
      expect(json.companyTierBenchmarks["Tier 1 (Big Tech)"].readiness).toBe("Ready")
      expect(json.roundArchetypes["System Design"].averageScore).toBe(86)
      expect(json.recurringWeaknesses[0].topic).toBe("Gossip Protocols")
    })

    it("returns 500 when database throws an exception", async () => {
      vi.mocked(getInternalUserId).mockResolvedValueOnce("user-test-456")
      vi.mocked(prisma.interviewSession.findMany).mockRejectedValueOnce(new Error("DB Timeout"))

      const res = await GET()
      expect(res.status).toBe(500)
      const json = await res.json()
      expect(json.error).toBe("Failed to compute interview mastery analytics")
    })
  })
})

