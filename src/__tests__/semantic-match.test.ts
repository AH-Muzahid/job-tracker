import { describe, it, expect } from "vitest"
import { computeSemanticSimilarity } from "@/lib/discovery/semantic-match"

describe("Semantic Vector Matching Engine (REC-17)", () => {
  it("detects strong semantic concept alignment between frontend background and UI Systems roles", () => {
    const candidate = {
      targetRoles: ["Frontend Developer", "React Engineer"],
      skills: ["react", "typescript", "nextjs", "css", "tailwind"],
      projectSummaries: ["Engineered accessible UI component library and client-side design system"],
    }

    const job = {
      title: "UI Systems Engineer",
      description: "Build scalable web design systems, client-side UI primitives, and browser experiences with modern frontend technologies.",
      tags: ["design systems", "web", "ui", "client"],
    }

    const result = computeSemanticSimilarity(candidate, job)

    expect(result.similarity).toBeGreaterThanOrEqual(0.60)
    expect(result.bonus).toBeGreaterThanOrEqual(5)
    expect(result.rationale).toBeDefined()
    expect(result.rationale).toContain("Semantic")
    expect(result.matchedConcepts.length).toBeGreaterThan(0)
  })

  it("identifies backend and microservices concept overlap across synonyms", () => {
    const candidate = {
      targetRoles: ["Backend Engineer"],
      skills: ["golang", "postgresql", "redis", "docker"],
      projectSummaries: ["Distributed microservices and high-throughput server architecture"],
    }

    const job = {
      title: "Distributed Systems & API Platform Engineer",
      description: "Scale core server infrastructure, high-throughput microservices, and database query latency.",
      tags: ["distributed", "server", "microservices"],
    }

    const result = computeSemanticSimilarity(candidate, job)

    expect(result.similarity).toBeGreaterThanOrEqual(0.50)
    expect(result.bonus).toBeGreaterThanOrEqual(2)
  })

  it("produces low similarity and negative penalty for divergent engineering domains", () => {
    const candidate = {
      targetRoles: ["Frontend Developer"],
      skills: ["react", "css", "html"],
      projectSummaries: ["Web design portfolio"],
    }

    const job = {
      title: "Hardware Firmware & Embedded Robotics Specialist",
      description: "FPGA low-level kernel driver development, soldering, and microcontroller timing registers.",
      tags: ["hardware", "fpga", "embedded"],
    }

    const result = computeSemanticSimilarity(candidate, job)

    expect(result.similarity).toBeLessThan(0.20)
    expect(result.bonus).toBeLessThanOrEqual(0)
  })

  it("handles empty candidate skills or job descriptions safely without NaN or crash", () => {
    const result = computeSemanticSimilarity(
      { targetRoles: [], skills: [] },
      { title: "Software Engineer" }
    )

    expect(result.similarity).toBeGreaterThanOrEqual(0)
    expect(result.similarity).toBeLessThanOrEqual(1)
    expect(Number.isNaN(result.similarity)).toBe(false)
  })
})
