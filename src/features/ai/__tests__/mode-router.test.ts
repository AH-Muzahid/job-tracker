import { describe, it, expect } from "vitest"
import { classifyMode } from "@/features/ai"

describe("AI Mode Router", () => {
  it("classifies long job description text as jd-scan", () => {
    const jdText = `
      We are looking for a Senior Full Stack Engineer.
      Responsibilities:
      - Build scalable APIs using Node.js and TypeScript.
      - Collaborate with product team to deliver features.
      Requirements & Qualifications:
      - 3+ years experience with React and Node.
      - Strong knowledge of PostgreSQL and Prisma.
      Key skills: React, Next.js, Node.js, SQL.
    `
    expect(classifyMode(jdText)).toBe("jd-scan")
  })

  it("classifies application requests as application mode", () => {
    expect(classifyMode("Please generate cover letter and outreach email for this role")).toBe("application")
  })

  it("classifies application tracking updates as tracker mode", () => {
    expect(classifyMode("I just applied to Google today")).toBe("tracker")
  })

  it("classifies interview preparation queries as interview mode", () => {
    expect(classifyMode("Help me prepare for live coding and technical interview")).toBe("interview")
  })

  it("classifies weekly planning queries as weekly mode", () => {
    expect(classifyMode("Let's review my weekly goals for this week")).toBe("weekly")
  })

  it("classifies rejection/frustration messages as recovery mode", () => {
    expect(classifyMode("I keep getting rejected and feeling stuck")).toBe("recovery")
  })
})
