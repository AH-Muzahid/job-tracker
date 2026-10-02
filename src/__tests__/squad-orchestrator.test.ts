import { describe, it, expect, vi } from "vitest"
import {
  skepticalHiringManagerCritic,
  coordinateApplicationPackageSquad,
  FLUFFY_BUZZWORDS,
  type ApplicationMaterialsDraft,
  type StrategistBrief,
} from "@/lib/ai/squad/orchestrator"

describe("Skeptical Hiring Manager Critic & Squad Orchestrator", () => {
  const mockBrief: StrategistBrief = {
    targetRole: "Staff Distributed Systems Engineer",
    matchedSkills: [
      { skill: "Go", proofProject: "Event Pipeline", metric: "50k req/s" },
      { skill: "Kafka", proofProject: "Event Pipeline", metric: "sub-10ms latency" },
      { skill: "Kubernetes", proofProject: "Infra Orchestrator" },
    ],
    cautionSkills: ["Ruby"],
    positioningPitch: "Positioning candidate as a distributed systems expert.",
  }

  describe("skepticalHiringManagerCritic", () => {
    it("rejects fluffy buzzwords and cliches", () => {
      const draft: ApplicationMaterialsDraft = {
        coverLetter: "I am passionate about this role and I believe I would be a great fit. I am a hardworking self-starter ready to hit the ground running and create synergies.",
        outreachPitch: "Hi team! I am deeply excited to apply and leverage my skills.",
      }

      const result = skepticalHiringManagerCritic(draft, {
        brief: mockBrief,
      })

      expect(result.approved).toBe(false)
      expect(result.buzzwordsFound.length).toBeGreaterThan(0)
      expect(result.violations.some((v) => v.includes("fluffy buzzwords") || v.includes("clichés"))).toBe(true)
    })

    it("enforces STAR format metrics in technical achievements", () => {
      const draftWithoutMetrics: ApplicationMaterialsDraft = {
        coverLetter: `Dear Hiring Team,\n\nI worked on backend services and helped the team with software tasks. I wrote code and collaborated with other engineers on features.\n\nSincerely,\nAlex Rivera`,
        outreachPitch: "Hi team! I write code and like systems.",
        highlights: [
          "Wrote software features for our web app",
          "Helped with internal tasks",
        ],
      }

      const result = skepticalHiringManagerCritic(draftWithoutMetrics, {
        brief: mockBrief,
      })

      expect(result.approved).toBe(false)
      expect(result.hasStarMetrics).toBe(false)
      expect(result.violations.some((v) => v.includes("STAR"))).toBe(true)
    })

    it("flags missing coverage of key requirements from strategist brief", () => {
      const draftMissingSkills: ApplicationMaterialsDraft = {
        coverLetter: `Dear Hiring Team,\n\nI have extensive experience building React UI components and CSS styling, achieving 40% speedups in rendering.\n\nSincerely,\nAlex Rivera`,
        outreachPitch: "Hi team! I specialize in React UI design with 40% latency improvements.",
        highlights: ["Optimized rendering by 40%"],
      }

      const result = skepticalHiringManagerCritic(draftMissingSkills, {
        brief: mockBrief,
      })

      expect(result.approved).toBe(false)
      expect(result.missingRequirements.length).toBeGreaterThan(0)
      expect(result.violations.some((v) => v.includes("coverage gap"))).toBe(true)
    })

    it("rejects outreach pitch exceeding 110 words", () => {
      const longPitch = new Array(120).fill("word").join(" ")
      const draft: ApplicationMaterialsDraft = {
        coverLetter: "Dear Hiring Team,\n\nI engineered Go and Kafka streaming systems handling 50k req/s with sub-10ms latency.\n\nSincerely,\nAlex Rivera",
        outreachPitch: longPitch,
        highlights: ["Built Go stream handling 50k req/s with sub-10ms latency"],
      }

      const result = skepticalHiringManagerCritic(draft, {
        brief: mockBrief,
      })

      expect(result.approved).toBe(false)
      expect(result.violations.some((v) => v.includes("110 words") || v.includes("too long"))).toBe(true)
    })

    it("approves clean, concise, metric-grounded materials covering key requirements", () => {
      const cleanDraft: ApplicationMaterialsDraft = {
        coverLetter: `Dear Stripe Hiring Team,

I noticed Stripe is scaling its distributed infrastructure for the Staff Distributed Systems Engineer position. With hands-on experience building fault-tolerant backend services in Go and Kafka, I am writing to share how my background aligns with your team's throughput goals.

In my recent work on the Event Pipeline, I architected distributed ingestion services handling 50k req/s while maintaining sub-10ms p99 latency across Kubernetes clusters. My focus is always on predictable latency, decoupled event semantics, and robust failover.

I would welcome the opportunity to discuss how my distributed systems experience directly supports Stripe's payment infrastructure.

Sincerely,
Alex Rivera`,
        outreachPitch: "Hi Stripe Team — I saw the opening for Staff Distributed Systems Engineer. I recently engineered a Go and Kafka pipeline processing 50k req/s at sub-10ms p99 latency on Kubernetes. Would love to share the architectural trade-offs if you have 10 minutes! — Alex Rivera",
        highlights: [
          "Architected Go and Kafka event ingestion processing 50k req/s with sub-10ms p99 latency",
          "Deployed zero-downtime microservices on Kubernetes with automated health monitoring",
        ],
        atsKeywords: ["Go", "Kafka", "Kubernetes", "Distributed Systems"],
      }

      const result = skepticalHiringManagerCritic(cleanDraft, {
        brief: mockBrief,
      })

      expect(result.approved).toBe(true)
      expect(result.violations).toHaveLength(0)
      expect(result.score).toBeGreaterThanOrEqual(90)
    })
  })

  describe("coordinateApplicationPackageSquad reflexion loop", () => {
    it("runs reflexion loop until Critic approves or max rounds reached", async () => {
      let callCount = 0
      const mockScribe = vi.fn().mockImplementation(async (_brief, critiqueFeedback) => {
        callCount++
        if (callCount === 1) {
          // First draft has buzzwords and no metrics
          return {
            coverLetter: "I am passionate about this role and I am a great fit for the team.",
            outreachPitch: "Hi! I want to leverage my skills.",
            highlights: ["Wrote code"],
          }
        }
        // Second draft fixes feedback
        return {
          coverLetter: `Dear Stripe Team,\n\nI engineered high-throughput Go and Kafka distributed systems processing 50k req/s on Kubernetes.\n\nSincerely,\nAlex Rivera`,
          outreachPitch: "Hi Stripe Team! I built a Go and Kafka event system with 50k req/s. Open to a 10-minute chat! — Alex",
          highlights: ["Engineered Go and Kafka stream handling 50k req/s on Kubernetes"],
          atsKeywords: ["Go", "Kafka", "Kubernetes"],
        }
      })

      const mockStrategist = vi.fn().mockResolvedValue(mockBrief)

      const squadResult = await coordinateApplicationPackageSquad({
        jobTitle: "Staff Distributed Systems Engineer",
        companyName: "Stripe",
        candidateName: "Alex Rivera",
        strategistFn: mockStrategist,
        scribeFn: mockScribe,
        maxCriticRounds: 3,
      })

      expect(mockStrategist).toHaveBeenCalled()
      expect(mockScribe).toHaveBeenCalledTimes(2)
      expect(squadResult.approvedByCritic).toBe(true)
      expect(squadResult.rounds).toBe(2)
    })
  })
})
