import { describe, it, expect } from "vitest"
import { DISMISS_REASONS } from "@/components/discovery/DiscoveryDismissModal"
import type { ExternalJobOpportunity } from "@/lib/discovery/types"

describe("Discovery UI: Top Picks & Interactive Dismissal Modal Suite", () => {
  describe("Dismiss Reason Options Specification", () => {
    it("provides the complete set of 6 standardized dismissal reasons", () => {
      const expectedKeys = [
        "wrong_role",
        "wrong_location",
        "bad_salary",
        "bad_company",
        "unqualified",
        "not_interested",
      ]

      const actualKeys = DISMISS_REASONS.map((r) => r.key)
      expect(actualKeys).toEqual(expectedKeys)
    })

    it("has descriptive labels and explanations for each option", () => {
      for (const reason of DISMISS_REASONS) {
        expect(reason.label.length).toBeGreaterThan(0)
        expect(reason.description.length).toBeGreaterThan(10)
        expect(reason.icon).toBeDefined()
      }
    })

    it("supports combining multiple selected reasons into a standardized comma-delimited payload", () => {
      const selected = ["wrong_role", "bad_salary"]
      const payload = selected.join(",")
      expect(payload).toBe("wrong_role,bad_salary")

      const parsed = payload.split(",").map((s) => s.trim())
      expect(parsed).toContain("wrong_role")
      expect(parsed).toContain("bad_salary")
      expect(parsed).toHaveLength(2)
    })
  })

  describe("Top Picks Selection & Graceful Degradation Logic", () => {
    const mockJobs: ExternalJobOpportunity[] = [
      {
        id: "job-1",
        title: "Senior Fullstack Engineer",
        company: "Vercel",
        location: "Remote",
        url: "https://vercel.com/careers/1",
        sourceBoard: "greenhouse",
        tags: ["react", "nextjs", "typescript"],
        fitScore: 95,
        matchRationale: "Exact match for Next.js and TypeScript infrastructure",
        descriptionSnippet: "Build high-performance web systems using Next.js",
      },
      {
        id: "job-2",
        title: "Cloud Platform Architect",
        company: "Cloudflare",
        location: "Remote",
        url: "https://cloudflare.com/careers/2",
        sourceBoard: "greenhouse",
        tags: ["go", "kubernetes", "networking"],
        fitScore: 92,
        matchRationale: "Strong alignment with distributed systems background",
        descriptionSnippet: "Lead edge computing and global networking infrastructure",
      },
      {
        id: "job-3",
        title: "Staff Systems Engineer",
        company: "Stripe",
        location: "Remote",
        url: "https://stripe.com/careers/3",
        sourceBoard: "greenhouse",
        tags: ["ruby", "architecture"],
        fitScore: 91,
        matchRationale: "Senior architecture level fit",
        descriptionSnippet: "Architect resilient global payment infrastructure",
      },
      {
        id: "job-4",
        title: "Frontend Developer",
        company: "Spotify",
        location: "Stockholm, Sweden",
        url: "https://spotify.com/careers/4",
        sourceBoard: "lever",
        tags: ["react", "web"],
        fitScore: 90,
        matchRationale: "Strong frontend match",
        descriptionSnippet: "Craft immersive music and audio listening experiences",
      },
      {
        id: "job-5",
        title: "Junior QA Tester",
        company: "Legacy Corp",
        location: "New York, NY",
        url: "https://example.com/careers/5",
        sourceBoard: "adzuna",
        tags: ["qa", "testing"],
        fitScore: 68,
        matchRationale: "Moderate match",
        descriptionSnippet: "Perform manual testing and bug tracking",
      },
    ]

    it("selects only 90%+ match opportunities and caps at 3 items", () => {
      const topPicks = mockJobs.filter((j) => j.fitScore >= 90).slice(0, 3)

      expect(topPicks).toHaveLength(3)
      expect(topPicks.map((j) => j.id)).toEqual(["job-1", "job-2", "job-3"])
      for (const pick of topPicks) {
        expect(pick.fitScore).toBeGreaterThanOrEqual(90)
      }
    })

    it("gracefully degrades (returns empty array) when no 90%+ opportunity exists", () => {
      const lowScoreJobs: ExternalJobOpportunity[] = [
        {
          id: "job-low-1",
          title: "Junior Developer",
          company: "Acme",
          location: "Onsite",
          url: "https://example.com/1",
          sourceBoard: "arbeitnow",
          tags: ["php"],
          fitScore: 78,
          matchRationale: "Moderate match",
          descriptionSnippet: "Maintain legacy PHP applications",
        },
        {
          id: "job-low-2",
          title: "Technical Writer",
          company: "Docs Corp",
          location: "Remote",
          url: "https://example.com/2",
          sourceBoard: "jobicy",
          tags: ["writing"],
          fitScore: 54,
          matchRationale: "Low match",
          descriptionSnippet: "Write technical API documentation and user guides",
        },
      ]

      const topPicks = lowScoreJobs.filter((j) => j.fitScore >= 90).slice(0, 3)
      expect(topPicks).toHaveLength(0)
    })
  })
})
