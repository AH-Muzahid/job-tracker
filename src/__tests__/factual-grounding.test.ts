import { describe, it, expect } from "vitest"
import {
  auditFactualGrounding,
  auditApplicationMaterialsGrounding,
  buildHonestBridge,
  extractTechMentions,
  extractMetricClaims,
  type GroundingContext,
} from "@/lib/ai/factual-grounding"
import type { CareerGraphData } from "@/lib/ai/knowledge-graph"
import type { ApplicationMaterialsDraft } from "@/lib/ai/squad/orchestrator"

describe("Factual Grounding Engine (Zero-Hallucination Guard)", () => {
  const mockKnowledgeGraph: CareerGraphData = {
    nodes: [
      { id: "s1", type: "skill", name: "TypeScript", canonicalName: "typescript", level: "expert" },
      { id: "s2", type: "skill", name: "React", canonicalName: "react", level: "expert" },
      { id: "s3", type: "skill", name: "Node.js", canonicalName: "nodejs", level: "advanced" },
      { id: "s4", type: "skill", name: "PostgreSQL", canonicalName: "postgresql", level: "advanced" },
      { id: "s5", type: "skill", name: "Docker", canonicalName: "docker", level: "intermediate" },
      { id: "p1", type: "project", name: "CodeArena", canonicalName: "codearena" },
      { id: "m1", type: "metric", name: "reduced latency by 45%", canonicalName: "reduced latency by 45%" },
      { id: "m2", type: "metric", name: "10,000 active users", canonicalName: "10,000 active users" },
    ],
    edges: [
      { source: "s1", target: "p1", relation: "APPLIED_IN" },
      { source: "m1", target: "p1", relation: "ACHIEVED" },
    ],
  }

  const mockContext: GroundingContext = {
    knowledgeGraph: mockKnowledgeGraph,
    memories: [
      { content: "Built CodeArena with TypeScript and PostgreSQL serving 10,000 users", category: "experience" },
      { content: "Reduced API latency by 45% using Redis caching", category: "experience" },
    ],
    profile: {
      fullName: "Alex Rivera",
      strengths: "TypeScript, React, Node.js, PostgreSQL, Docker",
      targetRoles: ["Full Stack Engineer", "Senior Frontend Engineer"],
      bestProjects: [
        {
          name: "CodeArena",
          stack: "TypeScript, React, Node.js, PostgreSQL",
          description: "Online coding platform with 10k users and sub-100ms evaluation",
        },
      ],
    },
    candidateName: "Alex Rivera",
    targetCompany: "Vercel",
    targetRole: "Senior Frontend Engineer",
  }

  describe("Claim Extraction", () => {
    it("extracts recognized technical terms from prose", () => {
      const text = "Architected a system using TypeScript, React, Kafka, and Rust."
      const techs = extractTechMentions(text)
      expect(techs).toContain("typescript")
      expect(techs).toContain("react")
      expect(techs).toContain("kafka")
      expect(techs).toContain("rust")
    })

    it("extracts quantitative metrics and percentage claims", () => {
      const text = "Reduced latency by 45%, scaled to 10,000 active users and cut AWS costs by $25,000."
      const metrics = extractMetricClaims(text)
      expect(metrics.length).toBeGreaterThanOrEqual(2)
      expect(metrics.some((m) => m.includes("45%"))).toBe(true)
      expect(metrics.some((m) => m.includes("10,000") || m.includes("users"))).toBe(true)
    })
  })

  describe("auditFactualGrounding", () => {
    it("approves fully grounded content without warnings", () => {
      const honestCoverLetter = `Dear Vercel Hiring Team,
I am excited to apply for the Senior Frontend Engineer role. At my project CodeArena, I engineered interactive components using TypeScript and React, which helped serve 10,000 active users while we reduced latency by 45%.
Sincerely,
Alex Rivera`

      const result = auditFactualGrounding(honestCoverLetter, mockContext)
      expect(result.isFullyGrounded).toBe(true)
      expect(result.groundingScore).toBeGreaterThanOrEqual(90)
      expect(result.unsupportedClaims).toHaveLength(0)
      expect(result.verifiedClaims).toContain("typescript")
      expect(result.verifiedClaims).toContain("react")
    })

    it("flags hallucinated technologies that candidate never used", () => {
      const hallucinatedText = `Dear Vercel Hiring Team,
I bring deep production expertise in Rust, Kubernetes, and Apache Kafka from scaling enterprise distributed brokers.
Sincerely,
Alex Rivera`

      const result = auditFactualGrounding(hallucinatedText, mockContext)
      expect(result.isFullyGrounded).toBe(false)
      expect(result.groundingScore).toBeLessThan(70)

      const flaggedSkills = result.unsupportedClaims.filter((c) => c.type === "skill")
      expect(flaggedSkills.some((c) => c.claim === "rust")).toBe(true)
      expect(flaggedSkills.some((c) => c.claim === "kubernetes")).toBe(true)
      expect(flaggedSkills.some((c) => c.claim === "kafka")).toBe(true)
    })

    it("rewrites unsupported skills into honest learning bridges", () => {
      const hallucinatedClaim = "Extensive production mastery in Kubernetes cluster orchestration."
      const result = auditFactualGrounding(hallucinatedClaim, mockContext)

      expect(result.sanitizedContent).not.toContain("production mastery in Kubernetes")
      // Should rewrite with honest bridge using existing Docker foundation
      expect(result.sanitizedContent).toMatch(/Docker|learning bridge|expanding into/i)
    })

    it("flags exaggerated metrics exceeding user's verified evidence", () => {
      const exaggeratedText = "Engineered CodeArena platform, scaling it to 5,000,000 active users and 99.999% uptime."
      const result = auditFactualGrounding(exaggeratedText, mockContext)

      const metricIssues = result.unsupportedClaims.filter((c) => c.type === "metric")
      expect(metricIssues.length).toBeGreaterThan(0)
      expect(result.isFullyGrounded).toBe(false)
    })
  })

  describe("buildHonestBridge", () => {
    it("creates honest bridge acknowledging gap while anchoring in verified foundation", () => {
      const bridge = buildHonestBridge("Kubernetes", "Docker")
      expect(bridge).toContain("Kubernetes")
      expect(bridge).toContain("Docker")
      expect(bridge).toMatch(/natural extension|expanding into|building upon/i)
    })

    it("creates standalone honest bridge when no close foundation exists", () => {
      const bridge = buildHonestBridge("Solidity")
      expect(bridge).toContain("Solidity")
      expect(bridge).toMatch(/rapid learning|daily toolkit|practical foundation/i)
    })
  })

  describe("auditApplicationMaterialsGrounding", () => {
    it("audits complete application materials draft and sanitizes ungrounded content", () => {
      const draft: ApplicationMaterialsDraft = {
        coverLetter: "Dear Vercel Team, I scaled Rust microservices with 5,000,000 users. Sincerely, Alex Rivera",
        outreachPitch: "Hi Vercel team, I am a staff architect with 10 years of Kubernetes experience.",
        highlights: [
          "Built CodeArena with TypeScript and React",
          "Engineered distributed Kafka stream processing",
        ],
      }

      const { materials, audit, hasModifications } = auditApplicationMaterialsGrounding(draft, mockContext)

      expect(hasModifications).toBe(true)
      expect(audit.isFullyGrounded).toBe(false)
      // Highlight with CodeArena/TypeScript should remain
      expect(materials.highlights).toBeDefined()
      expect(materials.highlights?.[0]).toContain("CodeArena")
      // Hallucinated Kafka bullet should be sanitized or bridged
      expect(materials.highlights?.[1]).not.toContain("Engineered distributed Kafka stream processing")
    })
  })
})
