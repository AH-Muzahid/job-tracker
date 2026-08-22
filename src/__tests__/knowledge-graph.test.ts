/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest"
import {
  toCanonical,
  buildCareerGraphFromText,
  traverseGraphForJD,
} from "@/lib/ai/knowledge-graph"
import { createAiTools } from "@/lib/ai/tools"
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

  it("builds structured knowledge graph with domains, skills, projects, and metric edges", () => {
    const rawResume = `
      Experienced Senior Fullstack Engineer.
      Skills: Go, TypeScript, React, Next.js, PostgreSQL, Redis, Docker, Kubernetes.
      Work Experience:
      - Built a high-throughput ingestion engine using Go and Redis that processed 50k req/s with 40% latency reduction.
      - Migrated legacy database to PostgreSQL cutting query times by 65%.
    `

    const mockProfile = {
      targetRoles: ["Senior Backend Engineer"],
      strengths: "Go, PostgreSQL, Distributed Systems",
      bestProjects: [
        {
          name: "High-Throughput Ingestion Engine",
          stack: "Go, Redis, Docker",
          description: "Distributed streaming engine",
        },
      ],
    }

    const graph = buildCareerGraphFromText(rawResume, mockProfile)

    expect(graph.nodes.length).toBeGreaterThan(5)
    expect(graph.edges.length).toBeGreaterThan(3)

    // Check specific nodes exist
    const goNode = graph.nodes.find((n) => n.canonicalName === "go")
    const projectNode = graph.nodes.find((n) => n.name === "High-Throughput Ingestion Engine")
    
    expect(goNode).toBeDefined()
    expect(projectNode).toBeDefined()

    // Check edge between Go and the project
    const hasAppliedEdge = graph.edges.some(
      (e) => e.source === goNode?.id && e.target === projectNode?.id && e.relation === "APPLIED_IN"
    )
    expect(hasAppliedEdge).toBe(true)
  })

  it("traverses knowledge graph for a target JD and produces verified evidence paths", () => {
    const rawResume = `
      Skills: Go, Redis, Docker, PostgreSQL, TypeScript.
      - Developed ingestion platform in Go and Redis with 50k req/s throughput.
    `
    const mockProfile = {
      bestProjects: [
        {
          name: "Realtime Pipeline",
          stack: "Go, Redis",
          description: "Data platform",
        },
      ],
    }

    const graph = buildCareerGraphFromText(rawResume, mockProfile)

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

  it("exposes queryCareerKnowledgeGraph and syncCareerKnowledgeGraph tools", async () => {
    const tools = createAiTools(testUserId) as any
    expect(tools.queryCareerKnowledgeGraph).toBeDefined()
    expect(tools.syncCareerKnowledgeGraph).toBeDefined()

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

    const result = await tools.syncCareerKnowledgeGraph.execute({})
    expect(result.success).toBe(true)
    expect(result.nodeCount).toBeGreaterThan(0)
  })
})
