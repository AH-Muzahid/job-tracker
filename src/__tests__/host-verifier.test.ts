import { describe, it, expect } from "vitest"
import {
  verifySourceHost,
  isAtsLookalikeHost,
  OFFICIAL_ATS_APEXES,
  INSTALLED_PORTAL_HOSTS,
  type HostVerificationResult,
} from "@/lib/discovery/host-verifier"

describe("Host Verifier - Source Provenance Guard", () => {
  describe("Official ATS apex domain detection", () => {
    it.each([
      ["https://boards.greenhouse.io/acme/jobs/12345", "greenhouse.io"],
      ["https://job-boards.greenhouse.io/acme/jobs/12345", "greenhouse.io"],
      ["https://jobs.lever.co/corp/67890", "lever.co"],
      ["https://acme.myworkdayjobs.com/en-US/Careers/job/1", "myworkdayjobs.com"],
      ["https://acme.workday.com/en-US/Careers/job/1", "workday.com"],
      ["https://jobs.ashbyhq.com/startup/abc-123", "ashbyhq.com"],
      ["https://jobs.smartrecruiters.com/Enterprise/456", "smartrecruiters.com"],
      ["https://apply.workable.com/tech-corp/j/789/", "workable.com"],
    ])("classifies %s as official_ats (apex: %s)", (url, expectedApex) => {
      const result = verifySourceHost(url)
      expect(result.category).toBe("official_ats")
      expect(result.isTrustedAts).toBe(true)
      expect(result.apexDomain).toBe(expectedApex)
    })
  })

  describe("Installed portal host detection", () => {
    it.each([
      "https://www.linkedin.com/jobs/view/999999",
      "https://remoteok.com/remote-jobs/123",
      "https://www.indeed.com/viewjob?jk=abc",
      "https://jobicy.com/jobs/149527-web-frontend-engineer",
    ])("classifies %s as installed_portal", (url) => {
      const result = verifySourceHost(url)
      expect(result.category).toBe("installed_portal")
      expect(result.isTrustedAts).toBe(false)
    })
  })

  describe("Anti-spoofing: look-alike domains fail closed", () => {
    it.each([
      "https://evil-greenhouse.io/job/1",
      "https://boards.greenhouse.io.evil.com/job/1",
      "https://boards.greenhouse.io@evil-domain.com/job/1",
      "https://myworkdayjobs.com.phishing.net/login",
      "https://lever.co.attacker.org/apply",
      "https://greenhouse.io.example.com/job",
      "https://fakeashbyhq.com/job/1",
      "https://notsmartrecruiters.com/job/1",
    ])("rejects spoofed URL %s as unverified", (url) => {
      const result = verifySourceHost(url)
      expect(result.category).toBe("unverified")
      expect(result.isTrustedAts).toBe(false)
      expect(result.warning).toBeDefined()
    })
  })

  describe("Edge cases", () => {
    it("handles invalid URLs gracefully", () => {
      const result = verifySourceHost("not-a-url")
      expect(result.category).toBe("unverified")
      expect(result.isTrustedAts).toBe(false)
      expect(result.warning).toContain("Invalid URL")
    })

    it("handles empty string", () => {
      const result = verifySourceHost("")
      expect(result.category).toBe("unverified")
      expect(result.isTrustedAts).toBe(false)
    })

    it("handles bare apex domain with protocol", () => {
      const result = verifySourceHost("https://greenhouse.io")
      expect(result.category).toBe("official_ats")
      expect(result.isTrustedAts).toBe(true)
    })

    it("classifies unknown domains as unverified with warning", () => {
      const result = verifySourceHost("https://unknown-board.example.com/posting/123")
      expect(result.category).toBe("unverified")
      expect(result.warning).toContain("Unverified source host")
    })
  })

  describe("isAtsLookalikeHost - anti-spoofing substring guard", () => {
    it("flags look-alike domains that embed an official apex as a substring", () => {
      expect(isAtsLookalikeHost("evil-greenhouse.io")).toBe(true)
      expect(isAtsLookalikeHost("greenhouse.io.evil.com")).toBe(true)
      expect(isAtsLookalikeHost("greenhouse-io.com")).toBe(true)
      expect(isAtsLookalikeHost("fakelever.co")).toBe(true)
      expect(isAtsLookalikeHost("myworkdayjobs.com.phishing.net")).toBe(true)
    })

    it("does NOT flag legitimate apex or subdomain hosts", () => {
      expect(isAtsLookalikeHost("greenhouse.io")).toBe(false)
      expect(isAtsLookalikeHost("boards.greenhouse.io")).toBe(false)
      expect(isAtsLookalikeHost("jobs.lever.co")).toBe(false)
      expect(isAtsLookalikeHost("acme.myworkdayjobs.com")).toBe(false)
    })

    it("does NOT flag unrelated hosts", () => {
      expect(isAtsLookalikeHost("remoteok.com")).toBe(false)
      expect(isAtsLookalikeHost("jobicy.com")).toBe(false)
      expect(isAtsLookalikeHost("linkedin.com")).toBe(false)
    })
  })

  describe("Constants validation", () => {
    it("exports at least 7 official ATS apex domains", () => {
      expect(OFFICIAL_ATS_APEXES.length).toBeGreaterThanOrEqual(7)
    })

    it("includes all required ATS apexes", () => {
      const required = ["greenhouse.io", "lever.co", "myworkdayjobs.com", "workday.com", "ashbyhq.com", "smartrecruiters.com", "workable.com"]
      for (const apex of required) {
        expect(OFFICIAL_ATS_APEXES).toContain(apex)
      }
    })
  })
})
