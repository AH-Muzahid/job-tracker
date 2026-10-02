import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  extractSkillsFromJobData,
  diffSkillsAgainstProfile,
  calculateGapHeatmap,
  generateLearningRoadmap,
  analyzeJobSkillGapsTargeted,
  type JobSkillSource,
  type ExtractedGap,
} from "@/lib/ai/upskill-engine"

describe("Upskill & Skill Gap Heatmap Engine", () => {
  const mockKnowledgeGraph = {
    nodes: [
      { id: "1", type: "skill", name: "TypeScript", canonicalName: "typescript" },
      { id: "2", type: "skill", name: "React", canonicalName: "react" },
      { id: "3", type: "skill", name: "Node.js", canonicalName: "nodejs" },
      { id: "4", type: "skill", name: "PostgreSQL", canonicalName: "postgresql" },
      { id: "5", type: "skill", name: "Docker", canonicalName: "docker" },
    ],
    edges: [],
  }

  describe("1. Skill Extraction & Provenance Tracking", () => {
    it("extracts explicit and inferred skills with proper provenance", () => {
      const job: JobSkillSource = {
        id: "job-1",
        title: "Senior Platform Engineer",
        company: "CloudScale Inc",
        fitScore: 60,
        explicitSkills: ["Kubernetes", "Terraform", "Go"],
        description: "Looking for an engineer with deep AWS, CI/CD, and Microservices experience.",
        recordedGaps: ["Kubernetes", "Terraform"],
      }

      const extracted = extractSkillsFromJobData([job])
      
      const k8s = extracted.find((s) => s.canonical === "kubernetes")
      expect(k8s).toBeDefined()
      expect(k8s?.provenance).toBe("recorded_gap")
      expect(k8s?.jobOccurrences).toBe(1)
      expect(k8s?.weightedScore).toBeCloseTo((100 - 60) / 100, 2) // 0.40

      const aws = extracted.find((s) => s.canonical === "aws")
      expect(aws).toBeDefined()
      expect(aws?.provenance).toBe("inferred_from_jd")
    })
  })

  describe("2. Profile Diff & Anti-Duplication", () => {
    it("filters out skills the candidate already possesses in Knowledge Graph", () => {
      const candidateSkills = ["typescript", "react", "nodejs", "postgresql", "docker"]
      
      const rawGaps: ExtractedGap[] = [
        { name: "React", canonical: "react", category: "hard", count: 3, weightedScore: 1.2, provenance: "recorded_gap", sampleJobs: ["Stripe"] },
        { name: "Kubernetes", canonical: "kubernetes", category: "tooling", count: 4, weightedScore: 1.8, provenance: "recorded_gap", sampleJobs: ["Stripe", "Datadog"] },
        { name: "Kafka", canonical: "kafka", category: "hard", count: 2, weightedScore: 0.9, provenance: "inferred_from_jd", sampleJobs: ["Uber"] },
        { name: "Docker", canonical: "docker", category: "tooling", count: 3, weightedScore: 1.1, provenance: "inferred_from_jd", sampleJobs: ["Meta"] },
      ]

      const diffed = diffSkillsAgainstProfile(rawGaps, candidateSkills)

      // React and Docker should be removed
      expect(diffed.some((g) => g.canonical === "react")).toBe(false)
      expect(diffed.some((g) => g.canonical === "docker")).toBe(false)

      // Kubernetes and Kafka should remain
      expect(diffed.some((g) => g.canonical === "kubernetes")).toBe(true)
      expect(diffed.some((g) => g.canonical === "kafka")).toBe(true)
    })
  })

  describe("3. Gap Heatmap Prioritization & Categorization", () => {
    it("assigns Critical, High, Medium priorities accurately", () => {
      const gaps: ExtractedGap[] = [
        { name: "Kubernetes", canonical: "kubernetes", category: "tooling", count: 5, weightedScore: 2.5, provenance: "recorded_gap", sampleJobs: ["J1", "J2", "J3"] },
        { name: "Kafka", canonical: "kafka", category: "hard", count: 3, weightedScore: 1.2, provenance: "recorded_gap", sampleJobs: ["J1", "J2"] },
        { name: "GraphQL", canonical: "graphql", category: "hard", count: 1, weightedScore: 0.3, provenance: "inferred_from_jd", sampleJobs: ["J4"] },
      ]

      const heatmap = calculateGapHeatmap(gaps)
      
      expect(heatmap[0].canonical).toBe("kubernetes")
      expect(heatmap[0].priority).toBe("Critical")

      expect(heatmap[1].canonical).toBe("kafka")
      expect(heatmap[1].priority).toBe("High")

      expect(heatmap[2].canonical).toBe("graphql")
      expect(heatmap[2].priority).toBe("Low")
    })

    it("categorizes soft skills, domain gaps, and credentials", () => {
      const gaps: ExtractedGap[] = [
        { name: "Fintech Domain Knowledge", canonical: "fintech-domain", category: "domain", count: 3, weightedScore: 1.5, provenance: "inferred_from_jd", sampleJobs: ["Stripe"] },
        { name: "Cross-Functional Leadership", canonical: "cross-functional-leadership", category: "soft", count: 2, weightedScore: 0.8, provenance: "inferred_from_jd", sampleJobs: ["Linear"] },
      ]

      const heatmap = calculateGapHeatmap(gaps)
      expect(heatmap.find((h) => h.canonical === "fintech-domain")?.category).toBe("domain")
      expect(heatmap.find((h) => h.canonical === "cross-functional-leadership")?.category).toBe("soft")
    })
  })

  describe("4. Learning Roadmap Generation", () => {
    it("generates structured study plans with curated resources and background bridge", () => {
      const candidateKnownSkills = ["docker", "typescript", "react", "postgresql"]
      const criticalGaps = [
        {
          name: "Kubernetes",
          canonical: "kubernetes",
          category: "tooling" as const,
          priority: "Critical" as const,
          count: 5,
          weightedScore: 2.5,
          provenance: "recorded_gap" as const,
          sampleJobs: ["Stripe", "Datadog"],
        },
      ]

      const roadmap = generateLearningRoadmap(criticalGaps, candidateKnownSkills)

      expect(roadmap).toHaveLength(1)
      const item = roadmap[0]
      expect(item.skill).toBe("Kubernetes")
      expect(item.estimatedHours).toBeDefined()
      expect(item.resources.length).toBeGreaterThanOrEqual(2)
      
      // Candidate knows Docker, study direction should advise bridging from Docker
      expect(item.studyDirection.toLowerCase()).toContain("docker")
      expect(item.resources[0].url).toMatch(/^https?:\/\//)
    })
  })

  describe("5. Targeted Single-Job Skill Gap Analysis", () => {
    it("performs instant gap diff for targeted job URL or description", () => {
      const jobDescription = `
        We are seeking a Staff Backend Engineer at FintechCorp.
        Must have: Go, Kubernetes, Kafka, Distributed Systems.
        Nice to have: Rust, AWS.
      `
      const candidateSkills = ["go", "distributed-systems", "aws"]

      const result = analyzeJobSkillGapsTargeted(jobDescription, candidateSkills)

      expect(result.missingSkills.map((s) => s.canonical)).toContain("kubernetes")
      expect(result.missingSkills.map((s) => s.canonical)).toContain("kafka")
      expect(result.missingSkills.map((s) => s.canonical)).toContain("rust")
      expect(result.coveredSkills.map((s) => s.canonical)).toContain("go")
      expect(result.coveredSkills.map((s) => s.canonical)).toContain("aws")
    })
  })
})
