/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  fetchGreenhouseJobs,
  fetchLeverJobs,
  TECH_ROLE_FILTER_REGEX,
  extractTechTagsFromText,
} from "@/lib/discovery/scrapers"

describe("Greenhouse & Lever Direct ATS Ingestion Pipeline", () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  describe("TECH_ROLE_FILTER_REGEX", () => {
    it("matches genuine technical engineering and developer titles", () => {
      const techTitles = [
        "Software Engineer",
        "Senior Frontend Developer",
        "Staff Backend Engineer",
        "Full Stack Developer",
        "DevOps / SRE Engineer",
        "Machine Learning Engineer",
        "Lead AI Scientist",
        "Data Engineer",
        "Cloud Infrastructure Architect",
        "iOS Mobile Developer",
        "QA Automation Engineer",
        "Security Architect",
      ]

      for (const title of techTitles) {
        expect(TECH_ROLE_FILTER_REGEX.test(title)).toBe(true)
      }
    })

    it("rejects non-technical administrative, sales, HR, and legal roles", () => {
      const nonTechTitles = [
        "Account Executive - Enterprise Sales",
        "Senior Recruiter, EMEA",
        "Head of People & Culture",
        "Corporate Legal Counsel",
        "Customer Success Manager",
        "Office Coordinator",
        "Sales Development Representative (SDR)",
        "Chief Financial Officer",
      ]

      for (const title of nonTechTitles) {
        expect(TECH_ROLE_FILTER_REGEX.test(title)).toBe(false)
      }
    })
  })

  describe("extractTechTagsFromText", () => {
    it("extracts relevant tech tags from combined text and title", () => {
      const tags = extractTechTagsFromText("Senior Fullstack Engineer with React, TypeScript, Next.js, and Node.js experience")
      expect(tags).toContain("fullstack")
      expect(tags).toContain("react")
      expect(tags).toContain("typescript")
      expect(tags).toContain("nextjs")
      expect(tags).toContain("nodejs")
    })

    it("extracts cloud and AI tags properly", () => {
      const tags = extractTechTagsFromText("DevOps Engineer - AWS, Kubernetes, Terraform & AI pipelines")
      expect(tags).toContain("devops")
      expect(tags).toContain("aws")
      expect(tags).toContain("kubernetes")
      expect(tags).toContain("ai")
    })
  })

  describe("fetchGreenhouseJobs", () => {
    it("fetches and normalizes tech jobs from Greenhouse boards", async () => {
      const mockGreenhousePayload = {
        jobs: [
          {
            id: 101,
            title: "Senior Full Stack Engineer",
            absolute_url: "https://boards.greenhouse.io/vercel/jobs/101",
            location: { name: "Remote - US" },
            updated_at: "2026-03-01T10:00:00Z",
          },
          {
            id: 102,
            title: "Frontend Architect",
            absolute_url: "https://boards.greenhouse.io/vercel/jobs/102",
            location: { name: "San Francisco, CA" },
            updated_at: "2026-03-02T10:00:00Z",
          },
          {
            id: 103,
            title: "Enterprise Account Executive",
            absolute_url: "https://boards.greenhouse.io/vercel/jobs/103",
            location: { name: "New York, NY" },
            updated_at: "2026-03-02T10:00:00Z",
          },
        ],
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockGreenhousePayload,
      } as any)

      const jobs = await fetchGreenhouseJobs({
        boardTokens: ["vercel"],
        limitPerBoard: 10,
      })

      // The non-tech title (Account Executive) should be rejected
      expect(jobs).toHaveLength(2)

      const [first, second] = jobs
      expect(first.id).toBe("gh-vercel-101")
      expect(first.title).toBe("Senior Full Stack Engineer")
      expect(first.company).toBe("Vercel")
      expect(first.location).toBe("Remote - US")
      expect(first.url).toBe("https://boards.greenhouse.io/vercel/jobs/101")
      expect(first.sourceBoard).toBe("greenhouse")
      expect(first.tags).toContain("fullstack")

      expect(second.id).toBe("gh-vercel-102")
      expect(second.title).toBe("Frontend Architect")
      expect(second.sourceBoard).toBe("greenhouse")
    })

    it("filters Greenhouse jobs when a query is provided", async () => {
      const mockGreenhousePayload = {
        jobs: [
          {
            id: 201,
            title: "Backend Engineer - Go/Rust",
            absolute_url: "https://boards.greenhouse.io/cloudflare/jobs/201",
            location: { name: "Remote" },
          },
          {
            id: 202,
            title: "Frontend Engineer - React",
            absolute_url: "https://boards.greenhouse.io/cloudflare/jobs/202",
            location: { name: "London, UK" },
          },
        ],
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockGreenhousePayload,
      } as any)

      const backendOnly = await fetchGreenhouseJobs({
        boardTokens: ["cloudflare"],
        query: "backend",
      })

      expect(backendOnly).toHaveLength(1)
      expect(backendOnly[0].title).toBe("Backend Engineer - Go/Rust")
    })

    it("gracefully handles network failures and HTTP errors without throwing", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network connection reset"))

      const jobs = await fetchGreenhouseJobs({
        boardTokens: ["stripe"],
      })

      expect(jobs).toEqual([])
    })
  })

  describe("fetchLeverJobs", () => {
    it("fetches and normalizes tech jobs from Lever postings API", async () => {
      const mockLeverPayload = [
        {
          id: "lev-501",
          text: "Staff Software Engineer, Platform",
          hostedUrl: "https://jobs.lever.co/spotify/lev-501",
          categories: {
            location: "Stockholm, Sweden",
            team: "Infrastructure & Cloud",
          },
          workplaceType: "hybrid",
          descriptionPlain: "Build core audio streaming pipelines using Java, Go and Kubernetes.",
        },
        {
          id: "lev-502",
          text: "Senior Recruiter - Tech & Engineering",
          hostedUrl: "https://jobs.lever.co/spotify/lev-502",
          categories: {
            location: "New York, NY",
            team: "Talent Acquisition",
          },
          workplaceType: "remote",
        },
      ]

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockLeverPayload,
      } as any)

      const jobs = await fetchLeverJobs({
        companySlugs: ["spotify"],
        limitPerCompany: 10,
      })

      // Recruiter role should be filtered out
      expect(jobs).toHaveLength(1)

      const job = jobs[0]
      expect(job.id).toBe("lever-spotify-lev-501")
      expect(job.title).toBe("Staff Software Engineer, Platform")
      expect(job.company).toBe("Spotify")
      expect(job.location).toBe("Stockholm, Sweden")
      expect(job.url).toBe("https://jobs.lever.co/spotify/lev-501")
      expect(job.sourceBoard).toBe("lever")
      expect(job.tags).toContain("developer")
      expect(job.description).toContain("Build core audio streaming pipelines")
    })

    it("defaults to Remote when location category is missing but workplaceType is remote", async () => {
      const mockLeverPayload = [
        {
          id: "lev-601",
          text: "Frontend Developer",
          hostedUrl: "https://jobs.lever.co/kinsta/lev-601",
          categories: {},
          workplaceType: "remote",
          descriptionPlain: "React and Next.js frontend development.",
        },
      ]

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockLeverPayload,
      } as any)

      const jobs = await fetchLeverJobs({
        companySlugs: ["kinsta"],
      })

      expect(jobs).toHaveLength(1)
      expect(jobs[0].location).toBe("Remote")
    })

    it("gracefully returns empty array on HTTP 404/500 responses", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as any)

      const jobs = await fetchLeverJobs({
        companySlugs: ["nonexistent-slug-xyz"],
      })

      expect(jobs).toEqual([])
    })
  })
})
