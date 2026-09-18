/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  synthesizeLinkedInSearchQueries,
  harvestLinkedInOpportunities,
  ingestLinkedInOpportunitiesToCatalog,
  type CandidateSearchProfile,
} from "@/lib/discovery/linkedin-harvester"
import * as scrapers from "@/lib/discovery/scrapers"
import * as embeddingModule from "@/lib/discovery/embedding"
import { prisma } from "@/lib/prisma"

describe("LinkedIn Social Post & Opening Harvester", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("synthesizeLinkedInSearchQueries", () => {
    it("synthesizes targeted junior Bangladesh & Remote queries for a junior BD developer", () => {
      const profile: CandidateSearchProfile = {
        skills: ["React", "Next.js", "TypeScript", "TailwindCSS"],
        targetRoles: ["Frontend Developer", "Junior React Developer"],
        experienceLevel: "junior",
        location: "Rajshahi, Bangladesh",
        workPreference: "remote",
      }

      const queries = synthesizeLinkedInSearchQueries(profile)
      expect(queries.length).toBeGreaterThanOrEqual(4)

      // Bangladesh regional targets
      const bdQueries = queries.filter((q) => q.location === "Bangladesh").map((q) => q.query.toLowerCase())
      expect(bdQueries).toContain("junior react developer")
      expect(bdQueries).toContain("intern software engineer")
      expect(bdQueries).toContain("trainee software engineer")
      expect(bdQueries).toContain("next.js developer")

      // Remote targets
      const remoteQueries = queries.filter((q) => q.location === "Remote").map((q) => q.query.toLowerCase())
      expect(remoteQueries).toContain("junior react developer")
      expect(remoteQueries).toContain("software engineer intern")
    })

    it("synthesizes non-junior queries for an experienced senior developer", () => {
      const profile: CandidateSearchProfile = {
        skills: ["React", "Node.js", "System Architecture"],
        targetRoles: ["Full Stack Engineer"],
        experienceLevel: "senior",
        location: "Remote",
        workPreference: "remote",
      }

      const queries = synthesizeLinkedInSearchQueries(profile)
      const allQueryStrings = queries.map((q) => q.query.toLowerCase())

      // Should not contain intern or trainee queries
      expect(allQueryStrings.some((q) => q.includes("intern"))).toBe(false)
      expect(allQueryStrings.some((q) => q.includes("trainee"))).toBe(false)
      expect(allQueryStrings.some((q) => q.includes("junior"))).toBe(false)
      expect(allQueryStrings).toContain("react developer")
    })

    it("deduplicates identical query/location combinations", () => {
      const profile: CandidateSearchProfile = {
        skills: ["React"],
        targetRoles: ["Frontend Developer"],
        experienceLevel: "junior",
        location: "Dhaka, Bangladesh",
      }

      const queries = synthesizeLinkedInSearchQueries(profile)
      const keys = queries.map((q) => `${q.query.toLowerCase()}|${q.location.toLowerCase()}`)
      const uniqueKeys = new Set(keys)
      expect(keys.length).toBe(uniqueKeys.size)
    })
  })

  describe("harvestLinkedInOpportunities", () => {
    it("harvests LinkedIn jobs, rejects non-tech, and filters senior roles for junior candidates", async () => {
      const mockRawGuestJobs = [
        {
          id: "li-1",
          title: "Junior React Developer",
          company: "Snapform",
          location: "Dhaka, Bangladesh",
          isRemote: false,
          url: "https://bd.linkedin.com/jobs/view/4172449101",
          tags: ["react", "frontend"],
          description: "Junior React developer opening.",
        },
        {
          id: "li-2",
          title: "Senior Staff Engineer (10+ years)",
          company: "Enterprise Corp",
          location: "Remote",
          isRemote: true,
          url: "https://www.linkedin.com/jobs/view/4172449102",
          tags: ["react"],
          description: "Senior staff architectural role.",
        },
        {
          id: "li-3",
          title: "Medical Receptionist",
          company: "Health Clinic",
          location: "Dhaka, Bangladesh",
          isRemote: false,
          url: "https://bd.linkedin.com/jobs/view/4172449103",
          tags: [],
          description: "Receptionist role.",
        },
        {
          id: "li-4",
          title: "Software Engineer Intern",
          company: "Next Solution Lab",
          location: "Dhaka, Bangladesh",
          isRemote: false,
          url: "https://bd.linkedin.com/jobs/view/4172449104",
          tags: ["react", "intern"],
          description: "Intern opening for aspiring developers.",
        },
      ]

      vi.spyOn(scrapers, "fetchLinkedInGuestJobs").mockResolvedValue(mockRawGuestJobs as any)

      const profile: CandidateSearchProfile = {
        skills: ["React"],
        targetRoles: ["Frontend Developer"],
        experienceLevel: "junior",
        location: "Bangladesh",
      }

      const results = await harvestLinkedInOpportunities(profile, { maxQueries: 2 })

      // Senior staff role and medical receptionist must be disqualified
      const titles = results.map((r) => r.title)
      expect(titles).toContain("Junior React Developer")
      expect(titles).toContain("Software Engineer Intern")
      expect(titles).not.toContain("Senior Staff Engineer (10+ years)")
      expect(titles).not.toContain("Medical Receptionist")

      // All harvested opportunities should be tagged with sourceBoard = "linkedin_post"
      results.forEach((r) => {
        expect(r.sourceBoard).toBe("linkedin_post")
      })
    })
  })

  describe("ingestLinkedInOpportunitiesToCatalog", () => {
    it("batch embeds jobs and upserts into CanonicalJob catalog with 1536-dim vector", async () => {
      const mockJobs = [
        {
          id: "test-li-1",
          title: "Junior React Developer",
          company: "Snapform Tech",
          location: "Dhaka, Bangladesh",
          isRemote: false,
          url: "https://bd.linkedin.com/jobs/view/123456789",
          sourceBoard: "linkedin_post" as const,
          tags: ["react", "javascript"],
          description: "We are hiring junior React developer.",
        },
      ]

      const mockEmbedding = new Array(1536).fill(0.05)
      vi.spyOn(embeddingModule, "generateBatchJobEmbeddings").mockResolvedValue([mockEmbedding])

      const upsertSpy = vi.spyOn(prisma.canonicalJob, "upsert").mockResolvedValue({
        id: "canonical-li-123",
        fingerprint: "fp-snapform-123",
        title: "Junior React Developer",
      } as any)

      const rawUnsafeSpy = vi.spyOn(prisma, "$executeRawUnsafe").mockResolvedValue(1 as any)

      const result = await ingestLinkedInOpportunitiesToCatalog(mockJobs as any)

      expect(result.total).toBe(1)
      expect(result.upserted).toBe(1)
      expect(upsertSpy).toHaveBeenCalledTimes(1)
      expect(rawUnsafeSpy).toHaveBeenCalledTimes(1)
      expect(rawUnsafeSpy).toHaveBeenCalledWith(
        expect.stringContaining(`UPDATE "CanonicalJob" SET embedding = $1::vector WHERE id = $2`),
        expect.stringContaining(`[0.05,`),
        "canonical-li-123"
      )
    })
  })
})
