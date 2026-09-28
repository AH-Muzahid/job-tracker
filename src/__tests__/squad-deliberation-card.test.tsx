import { describe, it, expect } from "vitest"
import React from "react"
import { renderToString } from "react-dom/server"
import { SquadDeliberationCard } from "@/components/applications/SquadDeliberationCard"
import type { SquadTraceDeliberation } from "@/lib/applications/package-engine"

describe("SquadDeliberationCard Component (AGT-03)", () => {
  const mockSquadTrace: SquadTraceDeliberation = {
    scoutSummary: {
      company: "Stripe",
      role: "Staff Backend Engineer",
      techStackDetected: ["Go", "Kubernetes", "PostgreSQL", "Kafka"],
    },
    strategistBrief: {
      targetRole: "Staff Backend Engineer",
      positioningPitch: "Emphasize high-throughput distributed systems experience and payment reliability track record.",
      matchedSkills: [
        { skill: "Go", proofProject: "Distributed Engine", metric: "99.999% uptime" },
        { skill: "Kafka", proofProject: "Event Pipeline", metric: "50k evt/sec" },
      ],
      cautionSkills: ["Ruby"],
    },
    criticAudit: {
      approved: true,
      rounds: 2,
      feedback: ["Replaced generic intro with verified project metric"],
    },
  }

  it("renders all three squad roles (Scout, Strategist, Critic)", () => {
    const html = renderToString(<SquadDeliberationCard squadTrace={mockSquadTrace} />)
    expect(html).toContain("Autonomous Squad Deliberation Trace")
    expect(html).toContain("1. Scout")
    expect(html).toContain("Staff Backend Engineer")
    expect(html).toContain("Stripe")
    expect(html).toContain("2. Strategist")
    expect(html).toContain("Emphasize high-throughput distributed systems")
    expect(html).toContain("3. Critic &amp; Scribe")
    expect(html).toContain("Critic Approved")
    expect(html).toContain("Round")
  })

  it("returns null if trace is empty", () => {
    const html = renderToString(<SquadDeliberationCard squadTrace={{}} />)
    expect(html).toBe("")
  })

  it("renders detected tech tags from scout", () => {
    const html = renderToString(<SquadDeliberationCard squadTrace={mockSquadTrace} />)
    expect(html).toContain("Go")
    expect(html).toContain("Kubernetes")
    expect(html).toContain("PostgreSQL")
  })
})
