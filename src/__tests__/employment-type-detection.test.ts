import { describe, it, expect } from "vitest"
import { detectEmploymentType } from "@/lib/discovery/matching"
import { getEmploymentType } from "@/components/discovery/types"

describe("detectEmploymentType Engine", () => {
  describe("Internship & Trainee Detection", () => {
    it("detects intern from various title variations", () => {
      expect(detectEmploymentType({ title: "Intern Software Engineer" })).toBe("intern")
      expect(detectEmploymentType({ title: "Software Engineering Intern (Summer 2026)" })).toBe("intern")
      expect(detectEmploymentType({ title: "Trainee Software Engineer" })).toBe("intern")
      expect(detectEmploymentType({ title: "Frontend Developer Apprentice" })).toBe("intern")
      expect(detectEmploymentType({ title: "Software Engineer Co-op" })).toBe("intern")
      expect(detectEmploymentType({ title: "AI Research Fellow" })).toBe("intern")
    })

    it("detects intern from tags when title is generic", () => {
      expect(detectEmploymentType({ title: "Software Engineer", tags: ["react", "internship"] })).toBe("intern")
      expect(detectEmploymentType({ title: "Frontend Developer", tags: ["trainee", "javascript"] })).toBe("intern")
    })

    it("detects intern from description when title is ambiguous", () => {
      expect(
        detectEmploymentType({
          title: "Junior Software Engineer",
          description: "We are excited to announce our 2026 summer internship program for university graduates.",
        })
      ).toBe("intern")

      expect(
        detectEmploymentType({
          title: "Web Developer",
          description: "Join as an intern alongside senior engineering mentors. Paid internship stipend provided.",
        })
      ).toBe("intern")
    })

    it("detects intern from explicit ATS commitment metadata (e.g. Lever)", () => {
      expect(
        detectEmploymentType({
          title: "Software Engineer",
          commitment: "Internship",
        })
      ).toBe("intern")
    })
  })

  describe("Contract, Freelance & Temporary Detection", () => {
    it("detects contract from title keywords", () => {
      expect(detectEmploymentType({ title: "Frontend Developer (Contractor)" })).toBe("contract")
      expect(detectEmploymentType({ title: "Full Stack Engineer - Contractual" })).toBe("contract")
      expect(detectEmploymentType({ title: "Freelance React Developer" })).toBe("contract")
      expect(detectEmploymentType({ title: "Cloud Consultant" })).toBe("contract")
      expect(detectEmploymentType({ title: "Temporary DevOps Engineer" })).toBe("contract")
    })

    it("detects contract from description phrases", () => {
      expect(
        detectEmploymentType({
          title: "React Developer",
          description: "This is a 6-month contract role with possibility of extension.",
        })
      ).toBe("contract")

      expect(
        detectEmploymentType({
          title: "Backend Engineer",
          description: "Accepting 1099 or C2C corp-to-corp candidates.",
        })
      ).toBe("contract")
    })

    it("detects contract from ATS commitment", () => {
      expect(
        detectEmploymentType({
          title: "Software Engineer",
          commitment: "Contract",
        })
      ).toBe("contract")
    })
  })

  describe("Part-Time Detection", () => {
    it("detects part-time from title", () => {
      expect(detectEmploymentType({ title: "Part-time Frontend Engineer" })).toBe("part-time")
      expect(detectEmploymentType({ title: "Part Time React Developer" })).toBe("part-time")
      expect(detectEmploymentType({ title: "Fractional Engineering Lead" })).toBe("part-time")
    })

    it("detects part-time from description", () => {
      expect(
        detectEmploymentType({
          title: "Junior Developer",
          description: "Expect around 20 hours per week on a flexible part-time schedule.",
        })
      ).toBe("part-time")
    })
  })

  describe("Full-Time Default", () => {
    it("defaults to full-time for standard permanent roles", () => {
      expect(detectEmploymentType({ title: "Senior Software Engineer" })).toBe("full-time")
      expect(detectEmploymentType({ title: "Full Stack Developer", tags: ["react", "node"] })).toBe("full-time")
      expect(detectEmploymentType({ title: "Staff Backend Engineer", description: "Permanent full time engineering role" })).toBe("full-time")
    })
  })

  describe("UI Component getEmploymentType Integration", () => {
    it("produces correct badge label and color for intern roles", () => {
      const badge = getEmploymentType({
        title: "Intern Software Engineer",
        tags: ["react", "node"],
        employmentType: "intern",
      })
      expect(badge.label).toBe("Intern")
      expect(badge.color).toContain("text-purple-600")
    })

    it("produces correct badge label and color for contract roles", () => {
      const badge = getEmploymentType({
        title: "Senior Developer (Contractor)",
        employmentType: "contract",
      })
      expect(badge.label).toBe("Contract")
      expect(badge.color).toContain("text-amber-600")
    })

    it("produces correct badge label and color for full-time roles", () => {
      const badge = getEmploymentType({
        title: "Frontend Engineer",
        employmentType: "full-time",
      })
      expect(badge.label).toBe("Full-time")
      expect(badge.color).toContain("text-emerald-600")
    })
  })
})
