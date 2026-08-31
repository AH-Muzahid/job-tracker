/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest"
import {
  toCanonical,
  buildCareerGraphFromText,
  traverseGraphForJD,
} from "@/lib/ai/knowledge-graph"
import { executeSyncCareerKnowledgeGraph } from "@/lib/ai/graph/tools/resume-tools"
import { prisma } from "@/lib/prisma"

describe("Vectorless Career Knowledge Graph & Graph-RAG Engine", () => {
  const testUserId = "test-user-graph-123"

  it("canonicalizes skill aliases accurately", () => {
    expect(toCanonical("k8s")).toBe("kubernetes")
    expect(toCanonical("Golang")).toBe("go")
    expect(toCanonical("TS")).toBe("typescript")
    expect(toCanonical("Next.js")).toBe("nextjs")
    expect(toCanonical("Postgres")).toBe("postgresql")
    expect(toCanonical("Tailwind")).toBe("tailwindcss")
  })

  it("builds structured knowledge graph with domains, skills, and metric edges", () => {
    const rawResume = `
      Experienced Senior Fullstack Engineer.
      Skills: Go, TypeScript, React, Next.js, PostgreSQL, Redis, Docker, Kubernetes.
      Work Experience:
      - Built a high-throughput ingestion engine using Go and Redis that processed 50k req/s with 40% latency reduction.
      - Migrated legacy database to PostgreSQL cutting query times by 65%.
    `

    const graph = buildCareerGraphFromText(rawResume)

    expect(graph.nodes.length).toBeGreaterThanOrEqual(4)
    expect(graph.edges.length).toBeGreaterThanOrEqual(2)

    const skillNodes = graph.nodes.filter((n) => n.type === "skill")
    const metricNodes = graph.nodes.filter((n) => n.type === "metric")
    const domainNodes = graph.nodes.filter((n) => n.type === "domain")

    expect(skillNodes.length).toBeGreaterThan(0)
    expect(metricNodes.length).toBeGreaterThan(0)
    expect(domainNodes.length).toBeGreaterThan(0)
  })

  it("traverses knowledge graph to find deterministic proof paths for job description", () => {
    const rawResume = `
      Senior Backend Engineer.
      Skills: Go, Redis, PostgreSQL, Docker, AWS.
      Projects:
      - Architected low-latency distributed cache using Go and Redis handling 100k req/s.
    `

    const graph = buildCareerGraphFromText(rawResume)

    const sampleJD = `
      We are looking for a Senior Backend Engineer proficient in Go (Golang) and Redis.
      Experience with PostgreSQL and Docker is required.
    `

    const matchResult = traverseGraphForJD(graph, sampleJD)

    expect(matchResult.matchScore).toBeGreaterThan(70)
    expect(matchResult.matchedSkills.length).toBeGreaterThanOrEqual(2)
    expect(matchResult.evidencePaths.length).toBeGreaterThanOrEqual(1)
    expect(matchResult.evidencePaths[0]).toContain("Go")
  })

  it("executes syncCareerKnowledgeGraph tool cleanly", async () => {
    vi.spyOn((prisma as any).resume, "findFirst").mockResolvedValueOnce({
      id: "res_1",
      userId: testUserId,
      isDefault: true,
      textContent: "Skilled in Go, React, PostgreSQL, Inngest",
    })
    vi.spyOn((prisma as any).userProfile, "findUnique").mockResolvedValueOnce({
      userId: testUserId,
      strengths: "Go, PostgreSQL",
    })
    vi.spyOn((prisma as any).careerKnowledgeGraph, "upsert").mockResolvedValueOnce({
      id: "kg_1",
      userId: testUserId,
      nodes: [],
      edges: [],
    })

    const result = await executeSyncCareerKnowledgeGraph(testUserId)
    expect(result.success).toBe(true)
    expect(result.nodeCount).toBeGreaterThan(0)
  })
})
