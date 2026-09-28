import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  coordinateApplicationPackageSquad,
  ApplicationSquadResult,
  StrategistBrief,
} from "../squad/orchestrator"
import { SQUAD_ROLES } from "../squad/roles"

describe("Level 4 Multi-Agent Squad Orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("defines the 5 specialized agent roles with clear responsibilities", () => {
    expect(SQUAD_ROLES.scout).toBeDefined()
    expect(SQUAD_ROLES.strategist).toBeDefined()
    expect(SQUAD_ROLES.scribe).toBeDefined()
    expect(SQUAD_ROLES.critic).toBeDefined()
    expect(SQUAD_ROLES.coach).toBeDefined()

    expect(SQUAD_ROLES.critic.systemPrompt).toContain("Adversarial QA Gatekeeper")
    expect(SQUAD_ROLES.scribe.systemPrompt).toContain("Master Application Craftsman")
    expect(SQUAD_ROLES.strategist.systemPrompt).toContain("Career Knowledge Graph Strategist")
  })

  it("coordinates Strategist, Scribe, and Critic in a collaborative pipeline", async () => {
    const mockStrategist = vi.fn().mockResolvedValue({
      targetRole: "Staff Platform Engineer",
      matchedSkills: [{ skill: "Kubernetes", proofProject: "ClusterScaler", metric: "99.99% uptime" }],
      cautionSkills: ["COBOL"],
      positioningPitch: "Focus on automated scaling and distributed telemetry",
    } as StrategistBrief)

    // Scribe initially outputs a draft with a placeholder, then fixes it on round 2
    const mockScribe = vi
      .fn()
      .mockResolvedValueOnce({
        coverLetter: "Dear [Hiring Manager], I scaled Kubernetes at Acme.",
        outreachPitch: "Hi [Recruiter], check my ClusterScaler project.",
        atsKeywords: ["Kubernetes", "Next.js"],
      })
      .mockResolvedValueOnce({
        coverLetter: "Dear Vercel Hiring Team, I scaled Kubernetes at Acme with 99.99% uptime.",
        outreachPitch: "Hi Sarah, check out how I maintained 99.99% uptime on ClusterScaler.",
        atsKeywords: ["Kubernetes", "Next.js"],
      })

    const result: ApplicationSquadResult = await coordinateApplicationPackageSquad({
      jobTitle: "Staff Platform Engineer",
      companyName: "Vercel",
      candidateName: "Jordan Hayes",
      dossierContext: "Candidate has 8 years DevOps experience.",
      strategistFn: mockStrategist,
      scribeFn: mockScribe,
      maxCriticRounds: 3,
    })

    expect(mockStrategist).toHaveBeenCalledTimes(1)
    expect(mockScribe).toHaveBeenCalledTimes(2) // Critic triggered a re-draft!
    expect(result.approvedByCritic).toBe(true)
    expect(result.rounds).toBe(2)
    expect(result.materials.coverLetter).not.toContain("[Hiring Manager]")
    expect(result.materials.outreachPitch).toContain("Sarah")
  })

  it("gracefully falls back to deterministic safe bundle if LLM fails or critic rounds exhaust", async () => {
    const mockStrategist = vi.fn().mockRejectedValue(new Error("API Timeout"))
    const mockScribe = vi.fn()

    const result = await coordinateApplicationPackageSquad({
      jobTitle: "Frontend Architect",
      companyName: "Linear",
      candidateName: "Jordan Hayes",
      dossierContext: "",
      strategistFn: mockStrategist,
      scribeFn: mockScribe,
      maxCriticRounds: 2,
    })

    expect(result.approvedByCritic).toBe(true)
    expect(result.isDeterministicFallback).toBe(true)
    expect(result.materials.coverLetter).toContain("Linear")
    expect(result.materials.coverLetter).not.toContain("[")
  })
})
