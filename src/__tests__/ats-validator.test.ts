import { describe, it, expect } from "vitest"
import {
  sanitizeUnicodeForATS,
  findNonAsciiDateRanges,
  validateResumeText,
  NON_ASCII_DASHES,
  type ATSValidationReport,
} from "@/lib/pdf/ats-validator"

describe("ATS Text-Layer & Layout Verification Engine", () => {
  describe("sanitizeUnicodeForATS - Unicode dash/quote normalization", () => {
    it("converts en-dash (U+2013) to ASCII hyphen", () => {
      expect(sanitizeUnicodeForATS("2016\u20132024")).toBe("2016-2024")
    })

    it("converts em-dash (U+2014) to ASCII hyphen", () => {
      expect(sanitizeUnicodeForATS("experience\u2014leadership")).toBe("experience-leadership")
    })

    it("converts all Unicode dash variants to ASCII hyphen", () => {
      const dashes = "\u2010\u2011\u2012\u2013\u2014\u2015"
      expect(sanitizeUnicodeForATS(dashes)).toBe("------")
    })

    it("converts curly single quotes to straight quotes", () => {
      expect(sanitizeUnicodeForATS("Master\u2019s degree")).toBe("Master's degree")
      expect(sanitizeUnicodeForATS("\u2018quoted\u2019")).toBe("'quoted'")
    })

    it("converts curly double quotes to straight quotes", () => {
      expect(sanitizeUnicodeForATS("\u201CHello\u201D")).toBe('"Hello"')
    })

    it("converts non-breaking space to regular space", () => {
      expect(sanitizeUnicodeForATS("word\u00A0another")).toBe("word another")
    })

    it("leaves ASCII text unchanged", () => {
      const ascii = "Regular text with normal hyphens-dashes 2016-2024"
      expect(sanitizeUnicodeForATS(ascii)).toBe(ascii)
    })

    it("handles empty string", () => {
      expect(sanitizeUnicodeForATS("")).toBe("")
    })
  })

  describe("findNonAsciiDateRanges - ATS date field guard", () => {
    it("detects en-dash between years (Workday killer)", () => {
      const text = "Software Engineer at Acme Corp\n2016\u20132024"
      const hits = findNonAsciiDateRanges(text)
      expect(hits.length).toBeGreaterThan(0)
      expect(hits[0].dash).toBe("\u2013")
    })

    it("detects en-dash after year with space", () => {
      const text = "Mar 2019 \u2013 Jul 2022"
      const hits = findNonAsciiDateRanges(text)
      expect(hits.length).toBeGreaterThan(0)
    })

    it("detects em-dash in date range", () => {
      const text = "2020\u20142024"
      const hits = findNonAsciiDateRanges(text)
      expect(hits.length).toBeGreaterThan(0)
      expect(hits[0].dash).toBe("\u2014")
    })

    it("passes clean ASCII date ranges", () => {
      const text = "Software Engineer at Acme Corp\n2016-2024\nJan 2019 - Present"
      const hits = findNonAsciiDateRanges(text)
      expect(hits).toHaveLength(0)
    })

    it("ignores non-date number ranges (EUR 600k-1M)", () => {
      const text = "Salary range: EUR 600k\u20131M revenue"
      // This should NOT match because there's no year pattern
      // But \u2013 next to a non-year number IS fine
      // The regex only triggers when a 4-digit year (19xx/20xx) is adjacent to a Unicode dash
      const hits = findNonAsciiDateRanges(text)
      expect(hits).toHaveLength(0)
    })

    it("detects multiple violations in same text", () => {
      const text = "2016\u20132019\nSenior Dev\n2020\u20142024"
      const hits = findNonAsciiDateRanges(text)
      expect(hits.length).toBe(2)
    })
  })

  describe("validateResumeText - comprehensive resume validation", () => {
    it("passes a clean, well-formatted resume text", () => {
      const cleanResume = [
        "AH Muzahid",
        "muzahid@example.com | +880-1234-567890",
        "https://github.com/muzahid",
        "",
        "Software Engineer at Acme Corp",
        "Jan 2020 - Present",
        "- Built scalable React applications serving 100k users",
        "- Reduced API latency by 40% through query optimization",
      ].join("\n")

      const report = validateResumeText(cleanResume, { expectedEmail: "muzahid@example.com" })
      expect(report.passed).toBe(true)
      expect(report.score).toBeGreaterThanOrEqual(80)
      expect(report.hasUnicodeDashes).toBe(false)
      expect(report.hasLiteralContactInfo.email).toBe(true)
      expect(report.hasLiteralContactInfo.phone).toBe(true)
      expect(report.hasLiteralContactInfo.links).toBe(true)
    })

    it("flags Unicode dashes in date ranges", () => {
      const badResume = "Engineer\n2020\u20132024\nmuzahid@test.com"
      const report = validateResumeText(badResume)
      expect(report.hasUnicodeDashes).toBe(true)
      expect(report.issues.length).toBeGreaterThan(0)
      expect(report.issues.some(i => i.includes("Unicode dash"))).toBe(true)
    })

    it("warns when email is missing from text", () => {
      const noEmail = "AH Muzahid\nSoftware Engineer\n2020-2024"
      const report = validateResumeText(noEmail, { expectedEmail: "muzahid@test.com" })
      expect(report.hasLiteralContactInfo.email).toBe(false)
      expect(report.issues.some(i => i.includes("email"))).toBe(true)
    })

    it("warns when phone number is missing", () => {
      const noPhone = "AH Muzahid\nmuzahid@test.com\n2020-2024"
      const report = validateResumeText(noPhone)
      expect(report.hasLiteralContactInfo.phone).toBe(false)
    })

    it("detects page overflow for single-page budget", () => {
      // Simulate very long text (> ~3500 chars suggests 2+ pages)
      const longText = "A".repeat(8000) + "\nmuzahid@test.com\n+1-555-0100"
      const report = validateResumeText(longText, { maxPages: 1 })
      expect(report.issues.some(i => i.includes("page"))).toBe(true)
    })

    it("returns sanitized text with Unicode replaced", () => {
      const text = "2020\u20132024 Master\u2019s"
      const report = validateResumeText(text)
      expect(report.sanitizedText).toBe("2020-2024 Master's")
      expect(report.sanitizedText).not.toContain("\u2013")
      expect(report.sanitizedText).not.toContain("\u2019")
    })

    it("gives perfect score for ideal resume", () => {
      const perfect = [
        "AH Muzahid",
        "muzahid@example.com",
        "+880-1234-567890",
        "https://linkedin.com/in/muzahid | https://github.com/muzahid",
        "",
        "Software Engineer",
        "Acme Corp | Jan 2020 - Present",
        "- Built Next.js application serving 500k monthly users",
      ].join("\n")

      const report = validateResumeText(perfect, { expectedEmail: "muzahid@example.com" })
      expect(report.score).toBe(100)
      expect(report.passed).toBe(true)
      expect(report.issues).toHaveLength(0)
    })
  })
})
