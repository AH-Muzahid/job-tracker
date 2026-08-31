/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getUserMacroOutcomes,
  generateAdaptivePromptWeights,
  injectLearningWeightsIntoPrompt,
  getMacroLearningContext,
} from "../learning-engine"
import { prisma } from "@/lib/prisma"

vi.mock("@/lib/redis", () => ({
  getCachedJson: vi.fn().mockResolvedValue(null),
  setCachedJson: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: {
      findMany: vi.fn(),
    },
  },
  withDbRetry: vi.fn((fn) => fn()),
}))

describe("Macro-Learning Engine", () => {
  const testUserId = "user-macro-123"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("aggregates user application outcomes and calculates conversion metrics", async () => {
    vi.mocked(prisma.application.findMany).mockResolvedValueOnce([
      {
        id: "app-1",
        jobTitle: "Staff Distributed Systems Engineer",
        companyName: "Stripe",
        status: "Offer",
        applicationDate: new Date("2026-01-01"),
        statusChanges: [
          { toStatus: "Applied", changedAt: new Date("2026-01-01") },
          { toStatus: "Interview", changedAt: new Date("2026-01-10") },
          { toStatus: "Offer", changedAt: new Date("2026-01-20") },
        ],
        analysis: {
          jdKeywords: ["Golang", "PostgreSQL", "Raft", "Distributed Caching"],
          gapAnalysis: [],
        },
      },
      {
        id: "app-2",
        jobTitle: "Principal Backend Engineer",
        companyName: "Vercel",
        status: "Interview",
        applicationDate: new Date("2026-01-05"),
        statusChanges: [
          { toStatus: "Applied", changedAt: new Date("2026-01-05") },
          { toStatus: "Interview", changedAt: new Date("2026-01-12") },
        ],
        analysis: {
          jdKeywords: ["Next.js", "Edge Runtime", "TypeScript"],
          gapAnalysis: [],
        },
      },
      {
        id: "app-3",
        jobTitle: "Java Backend Developer",
        companyName: "Legacy Bank",
        status: "Rejected",
        applicationDate: new Date("2026-01-02"),
        statusChanges: [
          { toStatus: "Applied", changedAt: new Date("2026-01-02") },
          { toStatus: "Rejected", changedAt: new Date("2026-01-15") },
        ],
        analysis: {
          jdKeywords: [],
          gapAnalysis: ["Spring Boot 3", "SOAP APIs"],
        },
      },
      {
        id: "app-4",
        jobTitle: "Junior Fullstack",
        companyName: "Acme Corp",
        status: "Applied",
        applicationDate: new Date("2026-01-18"),
        statusChanges: [],
        analysis: null,
      },
    ] as any)

    const outcomes = await getUserMacroOutcomes(testUserId)

    expect(outcomes.totalApplications).toBe(4)
    expect(outcomes.interviewCount).toBe(1)
    expect(outcomes.offerCount).toBe(1)
    expect(outcomes.rejectedCount).toBe(1)
    expect(outcomes.conversionRate).toBe(66.7) // (1 + 1) / (1 + 1 + 1) = 66.7%
    expect(outcomes.winningRoles).toContain("Staff Distributed Systems Engineer")
    expect(outcomes.winningCompanies).toContain("Stripe")
    expect(outcomes.winningSkills).toContain("Golang")
    expect(outcomes.winningSkills).toContain("PostgreSQL")
    expect(outcomes.penalizedSkills).toContain("Spring Boot 3")
    expect(outcomes.averageTimeToInterviewDays).toBeGreaterThanOrEqual(7)
  })

  it("provides baseline best practices on cold-start with < 3 applications", async () => {
    vi.mocked(prisma.application.findMany).mockResolvedValueOnce([
      {
        id: "app-1",
        jobTitle: "Software Engineer",
        companyName: "Tech Startup",
        status: "Applied",
        statusChanges: [],
        analysis: null,
      },
    ] as any)

    const weights = await generateAdaptivePromptWeights(testUserId)

    expect(weights.sampleSize).toBe(1)
    expect(weights.positiveBoosts.length).toBeGreaterThan(0)
    expect(weights.positiveBoosts[0]).toContain("STAR impact metrics")
    expect(weights.negativePenalties).toHaveLength(0)
  })

  it("generates positive signal boosts and negative penalties for experienced candidate", async () => {
    vi.mocked(prisma.application.findMany).mockResolvedValueOnce([
      {
        id: "app-1",
        jobTitle: "Staff Backend Engineer",
        companyName: "Scale AI",
        status: "Offer",
        analysis: { jdKeywords: ["Rust", "Distributed Systems"] },
      },
      {
        id: "app-2",
        jobTitle: "Staff Backend Engineer",
        companyName: "Datadog",
        status: "Interview",
        analysis: { jdKeywords: ["Kubernetes", "Kafka"] },
      },
      {
        id: "app-3",
        jobTitle: "Fullstack Developer",
        companyName: "Generic Corp",
        status: "Rejected",
        analysis: { gapAnalysis: ["Weak system design evidence"] },
      },
    ] as any)

    const weights = await generateAdaptivePromptWeights(testUserId)

    expect(weights.sampleSize).toBe(3)
    expect(weights.positiveBoosts.some((b) => b.includes("Staff Backend Engineer"))).toBe(true)
    expect(weights.positiveBoosts.some((b) => b.includes("Rust"))).toBe(true)
    expect(weights.negativePenalties.some((p) => p.includes("Weak system design evidence"))).toBe(true)
  })

  it("injects learning directives and constraints cleanly into prompts", () => {
    const basePrompt = "You are a career strategy assistant."
    const weights = {
      positiveBoosts: ["Highlight proven Kubernetes & Go mastery"],
      negativePenalties: ["Avoid generic filler without numbers"],
      topConvertingRoles: ["Staff Engineer"],
      overallConversionRate: 40,
      sampleSize: 5,
    }

    const injected = injectLearningWeightsIntoPrompt(basePrompt, weights)

    expect(injected).toContain("You are a career strategy assistant.")
    expect(injected).toContain("Macro-Learning Engine Directives")
    expect(injected).toContain("Highlight proven Kubernetes & Go mastery")
    expect(injected).toContain("Avoid generic filler without numbers")
    expect(injected).toContain("40% across 5 tracked applications")
  })

  it("generates compact markdown summary for context builder", async () => {
    vi.mocked(prisma.application.findMany).mockResolvedValueOnce([
      {
        id: "app-1",
        jobTitle: "Staff Engineer",
        companyName: "OpenAI",
        status: "Interview",
        analysis: { jdKeywords: ["PyTorch", "Python"] },
      },
    ] as any)

    const context = await getMacroLearningContext(testUserId)

    expect(context).toContain("Pipeline: 1 total | 1 interviews | 0 offers | 0 rejected (100% conversion)")
    expect(context).toContain("Top Converting Roles: Staff Engineer")
    expect(context).toContain("Top Performing Skills: PyTorch, Python")
  })
})
