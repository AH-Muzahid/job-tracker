import { describe, it, expect, afterEach } from "vitest"
import {
  detectVisaSponsorship,
  calculateJobFreshness,
} from "@/lib/discovery/matching"
import { getVisaBadge } from "@/components/discovery/types"

describe("REC-12: Visa Sponsorship & Work Auth Detection", () => {
  describe("detectVisaSponsorship", () => {
    it("correctly flags verified positive visa sponsorship patterns as 'available'", () => {
      const positiveSamples = [
        {
          title: "Senior Full Stack Engineer",
          description: "We are proud to provide visa sponsorship and relocation support for qualified candidates worldwide.",
        },
        {
          title: "Backend Engineer (H-1B transfer welcome)",
          description: "Candidate must have 4+ years of Go experience. H-1B transfer supported.",
        },
        {
          title: "AI Research Scientist",
          description: "Visa sponsorship is available for this role. Competitive salary + equity.",
        },
        {
          title: "Frontend Developer",
          description: "We offer visa sponsorship and comprehensive international health insurance.",
        },
        {
          title: "Cloud Infrastructure Architect",
          description: "Our company is open to visa sponsoring talented engineers globally.",
        },
        {
          title: "Distributed Systems Developer",
          description: "Relocation and visa sponsorship offered for relocation to our London engineering hub.",
        },
      ]

      for (const sample of positiveSamples) {
        const result = detectVisaSponsorship(sample.description, sample.title)
        expect(result).toBe("available")
      }
    })

    it("correctly flags restrictive work authorization and citizenship requirements as 'not_available'", () => {
      const negativeSamples = [
        {
          title: "Cloud Security Specialist",
          description: "Must be a US Citizen. Active secret clearance required for government contracts.",
        },
        {
          title: "Senior Full Stack Developer",
          description: "Unfortunately, no visa sponsorship is available for this position now or in the future.",
        },
        {
          title: "DevOps Engineer",
          description: "Must be legally authorized to work in the United States without company sponsorship.",
        },
        {
          title: "Platform Engineer",
          description: "Candidates must have the right to work in the UK without sponsorship.",
        },
        {
          title: "Software Engineer - Government Tech",
          description: "US citizenship required. Only US citizens and green card holders will be considered.",
        },
        {
          title: "Core Infrastructure Developer",
          description: "We cannot offer visa sponsorship at this time. Work authorization without restriction required.",
        },
      ]

      for (const sample of negativeSamples) {
        const result = detectVisaSponsorship(sample.description, sample.title)
        expect(result).toBe("not_available")
      }
    })

    it("prioritizes negative disqualifications over ambiguous positive mentions", () => {
      const conflictingText =
        "While we normally provide visa sponsorship for specialized teams, for this specific contractor opening no visa sponsorship is available."
      const result = detectVisaSponsorship(conflictingText, "Frontend Contractor")
      expect(result).toBe("not_available")
    })

    it("returns 'unknown' when no work auth or visa mentions are present", () => {
      const standardText =
        "We are looking for a Next.js and TypeScript developer with experience building performant dashboard interfaces."
      const result = detectVisaSponsorship(standardText, "React Developer")
      expect(result).toBe("unknown")
    })

    it("returns 'unknown' on empty or whitespace input", () => {
      expect(detectVisaSponsorship("", "")).toBe("unknown")
      expect(detectVisaSponsorship(undefined, undefined)).toBe("unknown")
    })
  })

  describe("getVisaBadge UI helper", () => {
    it("returns appropriate badge metadata for available status", () => {
      const badge = getVisaBadge("available")
      expect(badge).not.toBeNull()
      expect(badge?.label).toBe("Visa Sponsor")
      expect(badge?.color).toContain("emerald")
    })

    it("returns appropriate badge metadata for not_available status", () => {
      const badge = getVisaBadge("not_available")
      expect(badge).not.toBeNull()
      expect(badge?.label).toBe("No Visa")
      expect(badge?.color).toContain("zinc")
    })

    it("returns null for unknown or undefined status", () => {
      expect(getVisaBadge("unknown")).toBeNull()
      expect(getVisaBadge(undefined)).toBeNull()
    })
  })
})

describe("REC-15: Posted Date & Freshness Tracking", () => {
  const referenceTime = new Date("2026-09-04T12:00:00.000Z")

  it("awards a +3 boost and '<24h' label for jobs posted within 24 hours", () => {
    const postDate = new Date("2026-09-04T04:00:00.000Z") // 8 hours ago
    const result = calculateJobFreshness(postDate, referenceTime)

    expect(result.scoreDelta).toBe(3)
    expect(result.label).toBe("Just posted (<24h)")
    expect(result.ageDays).toBe(0)
  })

  it("awards a +2 boost and '1d ago' / '2d ago' label for postings 24-72 hours old", () => {
    const oneDayAgo = new Date("2026-09-03T08:00:00.000Z") // 28 hours ago
    const res1 = calculateJobFreshness(oneDayAgo, referenceTime)
    expect(res1.scoreDelta).toBe(2)
    expect(res1.label).toBe("1d ago")
    expect(res1.ageDays).toBe(1)

    const twoDaysAgo = new Date("2026-09-02T10:00:00.000Z") // 50 hours ago
    const res2 = calculateJobFreshness(twoDaysAgo, referenceTime)
    expect(res2.scoreDelta).toBe(2)
    expect(res2.label).toBe("2d ago")
    expect(res2.ageDays).toBe(2)
  })

  it("assigns 0 delta for normal active postings (3 to 14 days old)", () => {
    const fiveDaysAgo = new Date("2026-08-30T12:00:00.000Z") // 5 days ago
    const res1 = calculateJobFreshness(fiveDaysAgo, referenceTime)
    expect(res1.scoreDelta).toBe(0)
    expect(res1.label).toBe("5d ago")
    expect(res1.ageDays).toBe(5)

    const nineDaysAgo = new Date("2026-08-26T12:00:00.000Z") // 9 days ago
    const res2 = calculateJobFreshness(nineDaysAgo, referenceTime)
    expect(res2.scoreDelta).toBe(0)
    expect(res2.label).toBe("1w ago")
    expect(res2.ageDays).toBe(9)
  })

  it("applies a -2 decay penalty for postings 15 to 30 days old", () => {
    const twentyDaysAgo = new Date("2026-08-15T12:00:00.000Z") // 20 days ago
    const result = calculateJobFreshness(twentyDaysAgo, referenceTime)
    expect(result.scoreDelta).toBe(-2)
    expect(result.label).toBe("2w ago")
    expect(result.ageDays).toBe(20)
  })

  it("applies a -5 penalty for stale postings over 30 days old", () => {
    const fortyDaysAgo = new Date("2026-07-26T12:00:00.000Z") // 40 days ago
    const result = calculateJobFreshness(fortyDaysAgo, referenceTime)
    expect(result.scoreDelta).toBe(-5)
    expect(result.label).toBe("30d+ ago")
    expect(result.ageDays).toBe(40)
  })

  it("handles string date timestamps smoothly", () => {
    const isoString = "2026-09-04T08:30:00.000Z"
    const result = calculateJobFreshness(isoString, referenceTime)
    expect(result.scoreDelta).toBe(3)
    expect(result.label).toBe("Just posted (<24h)")
  })

  it("handles missing or invalid dates gracefully without throwing", () => {
    const resNull = calculateJobFreshness(null, referenceTime)
    expect(resNull.scoreDelta).toBe(0)
    expect(resNull.label).toBe("Active")

    const resUndefined = calculateJobFreshness(undefined, referenceTime)
    expect(resUndefined.scoreDelta).toBe(0)
    expect(resUndefined.label).toBe("Active")

    const resInvalid = calculateJobFreshness("invalid-date-string", referenceTime)
    expect(resInvalid.scoreDelta).toBe(0)
    expect(resInvalid.label).toBe("Active")
  })
})

describe("Scrapers postedAt & visaSponsorship normalization", () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it("extracts postedAt and visaSponsorship in fetchRemoteOkJobs", async () => {
    const { fetchRemoteOkJobs } = await import("@/lib/discovery/scrapers")

    global.fetch = async () =>
      new Response(
        JSON.stringify([
          { legal: "notice" },
          {
            id: 991,
            position: "Full Stack Engineer",
            company: "Acme Cloud",
            location: "Remote",
            tags: ["react", "typescript"],
            date: "2026-09-03T10:00:00Z",
            description: "We provide visa sponsorship for international hires to join our engineering hub.",
          },
        ]),
        { status: 200, headers: { "content-type": "application/json" } }
      )

    const jobs = await fetchRemoteOkJobs("react")
    expect(jobs.length).toBe(1)
    expect(jobs[0].postedAt).toBe("2026-09-03T10:00:00.000Z")
    expect(jobs[0].visaSponsorship).toBe("available")
  })

  it("extracts postedAt and visaSponsorship in fetchJobicyJobs", async () => {
    const { fetchJobicyJobs } = await import("@/lib/discovery/scrapers")

    global.fetch = async () =>
      new Response(
        JSON.stringify({
          jobs: [
            {
              id: "jb-101",
              jobTitle: "Senior Go Developer",
              companyName: "GovSecurity",
              jobGeo: "Remote",
              pubDate: "2026-09-02T14:30:00Z",
              jobDescription: "US citizenship required. Must be authorized without sponsorship.",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )

    const jobs = await fetchJobicyJobs()
    expect(jobs.length).toBe(1)
    expect(jobs[0].postedAt).toBe("2026-09-02T14:30:00.000Z")
    expect(jobs[0].visaSponsorship).toBe("not_available")
  })

  it("extracts unix timestamp postedAt in fetchArbeitnowJobs", async () => {
    const { fetchArbeitnowJobs } = await import("@/lib/discovery/scrapers")

    global.fetch = async () =>
      new Response(
        JSON.stringify({
          data: [
            {
              slug: "berlin-node-dev",
              title: "Backend Node.js Developer",
              company_name: "BerlinTech",
              remote: true,
              tags: ["node", "typescript"],
              created_at: 1725450000, // Unix epoch seconds
              description: "H-1B transfer welcome and EU Blue Card visa sponsorship supported.",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )

    const jobs = await fetchArbeitnowJobs("developer")
    expect(jobs.length).toBe(1)
    expect(jobs[0].postedAt).toBe(new Date(1725450000 * 1000).toISOString())
    expect(jobs[0].visaSponsorship).toBe("available")
  })

  it("extracts millisecond timestamp postedAt in fetchLeverJobs", async () => {
    const { fetchLeverJobs } = await import("@/lib/discovery/scrapers")

    global.fetch = async () =>
      new Response(
        JSON.stringify([
          {
            id: "lev-88",
            text: "Senior Software Engineer",
            categories: { location: "Remote", team: "Engineering" },
            createdAt: 1725400000000, // ms
            descriptionPlain: "Build cloud distributed services. Visa sponsorship available.",
          },
        ]),
        { status: 200, headers: { "content-type": "application/json" } }
      )

    const jobs = await fetchLeverJobs({ companies: ["netflix"], limitPerCompany: 5 })
    expect(jobs.length).toBe(1)
    expect(jobs[0].postedAt).toBe(new Date(1725400000000).toISOString())
    expect(jobs[0].visaSponsorship).toBe("available")
  })
})

