import { describe, it, expect } from "vitest"
import { buildResumePdfBuffer } from "@/lib/pdf/generator"
import { verifyPdfLayoutBuffer } from "@/lib/pdf/layout-verifier"
import { validateResumePdfBuffer } from "@/lib/pdf/ats-validator"
import type { TailoredResumeData } from "@/types/tailored-resume"

describe("PDF Vector Layout Verifier Engine", () => {
  const sampleData: TailoredResumeData = {
    header: {
      fullName: "Alex Doe",
      title: "Senior Full Stack Engineer",
      email: "alex.doe@example.com",
      phone: "+1-555-0199",
      location: "San Francisco, CA",
      linkedinUrl: "https://linkedin.com/in/alexdoe",
      githubUrl: "https://github.com/alexdoe",
    },
    summary:
      "Experienced software engineer with extensive background in distributed systems, real-time message buses, and modern full-stack web applications.",
    skillsByDomain: [
      {
        domain: "Languages & Frameworks",
        skills: ["TypeScript", "Go", "React", "Next.js", "Node.js"],
      },
      {
        domain: "Databases & Cloud",
        skills: ["PostgreSQL", "Redis", "Docker", "AWS", "Kubernetes"],
      },
    ],
    experience: [
      {
        role: "Senior Software Engineer",
        company: "Acme Corp",
        duration: "2021 - Present",
        location: "Remote",
        bullets: [
          "Architected high-throughput message processing pipeline handling 50k events/second.",
          "Optimized core database queries reducing p99 latency from 450ms to 110ms.",
        ],
      },
      {
        role: "Software Engineer",
        company: "Beta Systems",
        duration: "2019 - 2021",
        location: "San Francisco, CA",
        bullets: [
          "Implemented customer onboarding dashboard in React and Tailwind CSS.",
          "Integrated automated testing suite achieving 95% line coverage.",
        ],
      },
    ],
    projects: [
      {
        name: "CareerTrack AI",
        stack: ["Next.js", "TypeScript", "LangGraph", "PostgreSQL"],
        bullets: [
          "Engineered autonomous multi-agent job application orchestrator with sub-second response times.",
        ],
      },
    ],
    education: [
      {
        degree: "B.S. in Computer Science",
        institution: "University of California, Berkeley",
        year: "2019",
      },
    ],
  }

  it("verifies clean vector PDF layout without orphan titles or footer collisions", async () => {
    const { buildResumePdfWithLayout } = await import("@/lib/pdf/generator")
    const { verifyPdfLayoutBuffer } = await import("@/lib/pdf/layout-verifier")

    const result = await buildResumePdfWithLayout(sampleData, { density: "normal" })
    expect(result.buffer).toBeInstanceOf(Buffer)
    expect(result.buffer.length).toBeGreaterThan(1000)

    // Verify direct vector layout tree report
    expect(result.layoutReport.pageCount).toBe(1)
    expect(result.layoutReport.passed).toBe(true)
    expect(result.layoutReport.violations).toHaveLength(0)

    // Verify page metrics computed correctly from Yoga bounding boxes
    const treePage1 = result.layoutReport.pageMetrics[0]
    expect(treePage1.height).toBeGreaterThan(800) // ~841.89pt A4
    expect(treePage1.width).toBeGreaterThan(500) // ~595.28pt A4
    expect(treePage1.lineCount).toBeGreaterThan(5)
    expect(treePage1.bodyBottomPt).toBeGreaterThan(treePage1.bodyTopPt)
    expect(treePage1.bottomSpacePt).toBeGreaterThan(0)

    // Verify buffer-level parsing verifier also passes cleanly
    const bufferReport = await verifyPdfLayoutBuffer(result.buffer)
    expect(bufferReport.passed).toBe(true)
    expect(bufferReport.violations).toHaveLength(0)
  })

  it("supports compact density mode for strict single-page budget", async () => {
    const { buildResumePdfWithLayout } = await import("@/lib/pdf/generator")

    const compactResult = await buildResumePdfWithLayout(sampleData, { density: "compact" })
    const normalResult = await buildResumePdfWithLayout(sampleData, { density: "normal" })
    const spaciousResult = await buildResumePdfWithLayout(sampleData, { density: "spacious" })

    expect(compactResult.layoutReport.passed).toBe(true)
    expect(normalResult.layoutReport.passed).toBe(true)
    expect(spaciousResult.layoutReport.passed).toBe(true)

    const compactHeight = compactResult.layoutReport.pageMetrics[0].bodyBottomPt
    const normalHeight = normalResult.layoutReport.pageMetrics[0].bodyBottomPt
    const spaciousHeight = spaciousResult.layoutReport.pageMetrics[0].bodyBottomPt

    // Compact mode must consume less vertical space than normal, and normal less than spacious
    expect(compactHeight).toBeLessThan(normalHeight)
    expect(normalHeight).toBeLessThan(spaciousHeight)
  })

  it("integrates with validateResumePdfBuffer to yield combined ATS + Layout report", async () => {
    const { buildResumePdfWithLayout } = await import("@/lib/pdf/generator")
    const { validateResumePdfBuffer } = await import("@/lib/pdf/ats-validator")

    const result = await buildResumePdfWithLayout(sampleData, { density: "compact" })
    const atsReport = await validateResumePdfBuffer(result.buffer, {
      expectedEmail: "alex.doe@example.com",
      layoutTree: result.layoutTree,
    })

    expect(atsReport.layoutReport).toBeDefined()
    expect(atsReport.layoutReport?.passed).toBe(true)
    expect(atsReport.estimatedPages).toBe(1)
    expect(atsReport.passed).toBe(true)
  })
})
