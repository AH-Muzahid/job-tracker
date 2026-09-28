import { describe, it, expect, vi, beforeEach } from "vitest"
import { assembleAgenticCandidateContext, formatDossierAsPromptContext } from "../agentic-context"
import * as knowledgeGraph from "../knowledge-graph"
import * as memory from "../memory"
import { prisma } from "@/lib/prisma"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
  withDbRetry: vi.fn((fn: () => any) => fn()),
}))

vi.mock("../knowledge-graph", async () => {
  const actual = await vi.importActual<typeof import("../knowledge-graph")>("../knowledge-graph")
  return {
    ...actual,
    getCachedKnowledgeGraph: vi.fn(),
  }
})

vi.mock("../memory", () => ({
  getUserWeaknesses: vi.fn(),
}))

describe("Autonomous Context Assembler (Dynamic Graph & RAG)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("assembles grounded dossier traversing knowledge graph when graph exists", async () => {
    const mockProfile = {
      fullName: "Alex Rivera",
      strengths: "TypeScript, React, Next.js, PostgreSQL",
      bestProjects: [
        {
          name: "Cloud Ledger",
          stack: "Next.js, TypeScript, PostgreSQL",
          description: "High volume payment reconciliation",
          metrics: ["Processed $5M volume", "Reduced reconciliation lag by 80%"],
        },
      ],
      githubUrl: "https://github.com/alex",
      linkedinUrl: "https://linkedin.com/in/alex",
    }

    const mockGraph: knowledgeGraph.CareerGraphData = {
      nodes: [
        { id: "skill_ts", type: "skill", name: "TypeScript", canonicalName: "typescript" },
        { id: "skill_next", type: "skill", name: "Next.js", canonicalName: "nextjs" },
        { id: "proj_1", type: "project", name: "Cloud Ledger", canonicalName: "cloud-ledger" },
        { id: "metric_1", type: "metric", name: "Processed $5M volume", canonicalName: "m1" },
      ],
      edges: [
        { source: "skill_next", target: "proj_1", relation: "APPLIED_IN" },
        { source: "proj_1", target: "metric_1", relation: "ACHIEVED" },
      ],
    }

    vi.mocked(prisma.userProfile.findUnique as any).mockResolvedValueOnce(mockProfile)
    vi.mocked(prisma.user.findUnique as any).mockResolvedValueOnce({ name: "Alex Rivera", email: "alex@example.com" })
    vi.mocked(knowledgeGraph.getCachedKnowledgeGraph).mockResolvedValueOnce(mockGraph)
    vi.mocked(memory.getUserWeaknesses).mockResolvedValueOnce([
      { id: "w1", userId: "u1", category: "weakness", content: "Needs deeper explanation of distributed locks", createdAt: new Date(), updatedAt: new Date() },
    ])

    const dossier = await assembleAgenticCandidateContext("u1", {
      jobTitle: "Senior Next.js Engineer",
      companyName: "Vercel",
      jdText: "We are looking for a Senior Next.js and TypeScript developer with database skills.",
    })

    expect(dossier.candidateName).toBe("Alex Rivera")
    expect(dossier.candidateEmail).toBe("alex@example.com")
    expect(dossier.matchedSkills.length).toBeGreaterThan(0)
    expect(dossier.matchedSkills.some((s) => s.skill.toLowerCase().includes("next"))).toBe(true)
    expect(dossier.weaknessesToCounteract).toContain("Needs deeper explanation of distributed locks")
    expect(dossier.links.github).toBe("https://github.com/alex")
  })

  it("builds fallback graph dynamically from profile if cached graph is missing", async () => {
    const mockProfile = {
      fullName: "Dev User",
      strengths: "Go, Kubernetes, Docker",
      bestProjects: [
        {
          name: "KubeDeploy",
          stack: "Go, Kubernetes",
          description: "Container orchestrator",
        },
      ],
    }

    vi.mocked(prisma.userProfile.findUnique as any).mockResolvedValueOnce(mockProfile)
    vi.mocked(prisma.user.findUnique as any).mockResolvedValueOnce({ name: "Dev User", email: "dev@test.com" })
    vi.mocked(knowledgeGraph.getCachedKnowledgeGraph).mockResolvedValueOnce(null)
    vi.mocked(memory.getUserWeaknesses).mockResolvedValueOnce([])

    const dossier = await assembleAgenticCandidateContext("u2", {
      jobTitle: "DevOps Engineer",
      companyName: "Acme Cloud",
      jdText: "Seeking a Kubernetes and Go specialist",
    })

    expect(dossier.candidateName).toBe("Dev User")
    expect(dossier.matchedSkills.length).toBeGreaterThan(0)
  })

  it("formats dossier into an unassailable prompt context with anti-hallucination rules", () => {
    const mockDossier = {
      candidateName: "Sarah Connor",
      candidateEmail: "sarah@resistance.org",
      targetRoles: ["Full Stack Lead"],
      links: { github: "https://github.com/sarah" },
      matchedSkills: [
        {
          skill: "TypeScript",
          canonicalName: "typescript",
          proofProjects: [{ projectName: "CyberSystem", metrics: ["Optimized throughput by 40%"] }],
        },
      ],
      missingSkills: ["Rust", "Solidity"],
      evidencePaths: [],
      matchScore: 92,
      bestProjects: [{ name: "CyberSystem" }],
      weaknessesToCounteract: ["Avoid over-generalizing systems"],
      adaptiveBoosts: ["TypeScript"],
      penalizedSkills: [],
      summaryContextText: "",
    }

    const formatted = formatDossierAsPromptContext(mockDossier)
    expect(formatted).toContain("Candidate Name: Sarah Connor")
    expect(formatted).toContain("CyberSystem")
    expect(formatted).toContain("Optimized throughput by 40%")
    expect(formatted).toContain("STRICT ANTI-HALLUCINATION RULES")
    expect(formatted).toContain("Rust, Solidity")
  })
})
