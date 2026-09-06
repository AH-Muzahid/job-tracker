/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { isValidJobPostingUrl } from "@/lib/discovery/matching"
import {
  formatJobForEmbedding,
  formatCandidateForEmbedding,
  generateJobEmbedding,
  generateCandidateEmbedding,
  EMBEDDING_DIMENSION,
} from "@/lib/discovery/embedding"
import { retrieveCandidateJobsTier1, VectorCandidateJob } from "@/lib/discovery/vector-retrieval"
import { deepReRankCandidateJobs } from "@/lib/discovery/ai-reranker"
import { parseMatchRationale } from "@/components/discovery/types"
import { prisma } from "@/lib/prisma"
import { generateObject } from "ai"

vi.mock("ai", () => ({
  generateObject: vi.fn(),
  embed: vi.fn(),
  embedMany: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    userProfile: { findUnique: vi.fn() },
    userJobMatch: { findMany: vi.fn(), updateMany: vi.fn() },
    canonicalJob: { findMany: vi.fn(), count: vi.fn() },
    resume: { findFirst: vi.fn() },
  },
  withDbRetry: vi.fn((fn) => fn()),
}))

vi.mock("@/lib/discovery/preferences", () => ({
  getUserImplicitPreferences: vi.fn().mockResolvedValue({
    dislikedRoles: { devops: 2.5, "site reliability": 2.0 },
    negativeSkills: ["kubernetes"],
  }),
  invalidateUserImplicitPreferences: vi.fn(),
}))

describe("Two-Tier Hybrid RecSys Engine Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Checklist 2: Dead Link & Generic Directory Elimination", () => {
    it("rejects bare aggregator and company domain roots", () => {
      expect(isValidJobPostingUrl("https://jobicy.com")).toBe(false)
      expect(isValidJobPostingUrl("https://jobicy.com/")).toBe(false)
      expect(isValidJobPostingUrl("https://remoteok.com")).toBe(false)
      expect(isValidJobPostingUrl("https://remoteok.com/")).toBe(false)
      expect(isValidJobPostingUrl("https://weworkremotely.com/")).toBe(false)
      expect(isValidJobPostingUrl("http://company.com")).toBe(false)
    })

    it("rejects generic /careers directory pages without specific posting IDs", () => {
      expect(isValidJobPostingUrl("https://stripe.com/careers")).toBe(false)
      expect(isValidJobPostingUrl("https://stripe.com/careers/")).toBe(false)
      expect(isValidJobPostingUrl("https://company.io/jobs")).toBe(false)
      expect(isValidJobPostingUrl("https://example.com/about/careers")).toBe(false)
      expect(isValidJobPostingUrl("https://startup.com/work-with-us")).toBe(false)
      expect(isValidJobPostingUrl("https://agency.com/open-roles")).toBe(false)
    })

    it("rejects invalid or malformed URLs", () => {
      expect(isValidJobPostingUrl(null)).toBe(false)
      expect(isValidJobPostingUrl(undefined)).toBe(false)
      expect(isValidJobPostingUrl("")).toBe(false)
      expect(isValidJobPostingUrl("not-a-url")).toBe(false)
      expect(isValidJobPostingUrl("ftp://files.example.com/job")).toBe(false)
    })

    it("accepts genuine, deep direct job posting URLs", () => {
      expect(isValidJobPostingUrl("https://job-boards.greenhouse.io/vercel/jobs/6122437004")).toBe(true)
      expect(isValidJobPostingUrl("https://boards.greenhouse.io/cloudflare/jobs/5829103")).toBe(true)
      expect(isValidJobPostingUrl("https://jobs.lever.co/sentry/78726588-43bb-46f3-98bf")).toBe(true)
      expect(isValidJobPostingUrl("https://jobicy.com/jobs/92831-senior-frontend-engineer")).toBe(true)
      expect(isValidJobPostingUrl("https://remoteok.com/remote-jobs/remote-react-developer-stripe")).toBe(true)
      expect(isValidJobPostingUrl("https://www.linkedin.com/jobs/view/4102938472")).toBe(true)
    })
  })

  describe("Dense Embedding Formatter & Dimension Guard", () => {
    it("formats job details cleanly into structured text within character limits", () => {
      const job = {
        title: "Staff Frontend Engineer",
        company: "Vercel",
        tags: ["React", "Next.js", "TypeScript", "Tailwind"],
        description: "Leading frontend infrastructure and high-performance UI components for Next.js app router.",
      }
      const formatted = formatJobForEmbedding(job)
      expect(formatted).toContain("Role: Staff Frontend Engineer")
      expect(formatted).toContain("Company: Vercel")
      expect(formatted).toContain("Technologies: React, Next.js, TypeScript, Tailwind")
      expect(formatted).toContain("Summary: Leading frontend infrastructure")
    })

    it("formats candidate profile with demonstrated projects and target roles", () => {
      const candidate = {
        targetRoles: ["Frontend Engineer", "Full Stack Developer"],
        skills: ["React", "TypeScript", "Node.js", "PostgreSQL"],
        projects: [
          { name: "CodeArena", stack: "Next.js, Tailwind", description: "Collaborative real-time coding platform" },
          { name: "CareerTrack", stack: "React, Prisma", description: "AI job application management OS" },
        ],
        preferredWorkMode: "Remote",
      }
      const formatted = formatCandidateForEmbedding(candidate)
      expect(formatted).toContain("Candidate Target Roles: Frontend Engineer, Full Stack Developer")
      expect(formatted).toContain("Skills: React, TypeScript, Node.js, PostgreSQL")
      expect(formatted).toContain("Demonstrated Projects: CodeArena (Next.js, Tailwind): Collaborative real-time coding platform | CareerTrack (React, Prisma): AI job application management OS")
      expect(formatted).toContain("Work Mode: Remote")
    })

    it("guarantees 1536-dimensional embeddings with dimension guard fallback", async () => {
      const vector = await generateJobEmbedding({
        title: "Frontend Engineer",
        company: "Acme",
      })
      expect(Array.isArray(vector)).toBe(true)
      expect(vector.length).toBe(EMBEDDING_DIMENSION)

      const candidateVec = await generateCandidateEmbedding({
        targetRoles: ["Full Stack Developer"],
        skills: ["React", "Node.js"],
        projects: [],
      })
      expect(Array.isArray(candidateVec)).toBe(true)
      expect(candidateVec.length).toBe(EMBEDDING_DIMENSION)
    })
  })

  describe("Tier 1: Dense Vector Retrieval with Negative Aversion Subtraction", () => {
    it("executes vector distance query and subtracts penalty for disliked role tokens", async () => {
      const mockJobs = [
        {
          id: "job-fe-1",
          title: "Senior Frontend Engineer",
          company: "Vercel",
          location: "Remote",
          isRemote: true,
          url: "https://job-boards.greenhouse.io/vercel/jobs/6122437004",
          salary: "$140k - $170k",
          salaryMin: 140000,
          salaryMax: 170000,
          tags: ["react", "typescript"],
          description: "Build Next.js web applications",
          postedAt: new Date(),
          visaSponsorship: "available",
          similarity: 0.88,
        },
        {
          id: "job-devops-1",
          title: "DevOps / Infrastructure Engineer",
          company: "CloudScale",
          location: "Remote",
          isRemote: true,
          url: "https://boards.greenhouse.io/cloudscale/jobs/12345",
          salary: "$150k",
          salaryMin: 150000,
          salaryMax: 150000,
          tags: ["kubernetes", "terraform"],
          description: "Maintain cluster infrastructure",
          postedAt: new Date(),
          visaSponsorship: "unknown",
          similarity: 0.65, // Will receive -0.25 penalty because 'DevOps' is in dislikedRoles -> 0.40 -> excluded
        },
        {
          id: "job-dead-url",
          title: "Frontend Developer",
          company: "FakeCo",
          location: "Remote",
          isRemote: true,
          url: "https://jobicy.com", // Dead root URL -> will be rejected
          salary: null,
          salaryMin: null,
          salaryMax: null,
          tags: ["react"],
          description: "Fake role",
          postedAt: new Date(),
          visaSponsorship: "unknown",
          similarity: 0.90,
        },
      ]

      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce(mockJobs as any)

      const results = await retrieveCandidateJobsTier1({
        userId: "user-test-1",
        targetRoles: ["Frontend Engineer"],
        userSkills: ["React", "TypeScript"],
        projects: [{ name: "CodeArena", stack: "React, Next.js", description: "Realtime app" }],
        limit: 10,
      })

      // 1. Dead URL was eliminated
      expect(results.some((r) => r.id === "job-dead-url")).toBe(false)

      // 2. High match role is preserved
      const feJob = results.find((r) => r.id === "job-fe-1")
      expect(feJob).toBeDefined()
      expect(feJob?.cosineSimilarity).toBeCloseTo(0.88, 2)

      // 3. Disliked DevOps role was heavily penalized
      const devOpsJob = results.find((r) => r.id === "job-devops-1")
      expect(devOpsJob).toBeUndefined() // Dropped to <= 0.40 and excluded
    })
  })

  describe("Tier 2: Deep Cross-Encoder Re-Ranking & Match Proofs", () => {
    it("Checklist 3: penalizes mismatched domains (Frontend Dev vs DevOps role)", async () => {
      const candidateProfile = {
        targetRoles: ["Frontend Engineer", "React Developer"],
        skills: ["React", "JavaScript", "TypeScript", "CSS", "Next.js"],
        experienceLevel: "mid",
        location: "Remote",
        projects: [
          { name: "CodeArena", stack: "React, TypeScript", description: "Web UI code editor" },
        ],
      }

      const inputJobs: VectorCandidateJob[] = [
        {
          id: "job-kubernetes-lead",
          title: "Lead Kubernetes / Site Reliability Engineer",
          company: "InfraCorp",
          location: "Remote",
          isRemote: true,
          url: "https://boards.greenhouse.io/infracorp/jobs/991",
          salary: "$180k",
          salaryMin: 180000,
          salaryMax: 180000,
          tags: ["kubernetes", "aws", "terraform", "sre"],
          description: "Manage large scale multi-cloud Kubernetes clusters and CI/CD pipelines.",
          postedAt: new Date(),
          visaSponsorship: "unknown",
          cosineSimilarity: 0.62,
        },
      ]

      // Mock generateObject return for mismatched domain
      vi.mocked(generateObject).mockResolvedValueOnce({
        object: {
          rankings: [
            {
              jobId: "job-kubernetes-lead",
              fitScore: 28, // < 40% fit
              roleMatchScore: 4, // <= 5/25 for mismatched specialization
              skillMatchScore: 8,
              locationMatchScore: 10,
              seniorityMatchScore: 6,
              projectMatchProof: "No project matches Kubernetes or SRE domain",
              matchRationale: "Domain mismatch: candidate specializes in Frontend, role requires Cloud/K8s infrastructure.",
              missingCriticalSkills: ["Kubernetes", "Terraform", "AWS SRE"],
            },
          ],
        },
      } as any)

      const reRanked = await deepReRankCandidateJobs({
        candidateProfile,
        jobs: inputJobs,
      })

      expect(reRanked.length).toBe(1)
      const devOpsResult = reRanked[0]
      expect(devOpsResult.fitScore).toBeLessThan(40)
      expect(devOpsResult.scoreBreakdown.role).toBeLessThanOrEqual(5)
      expect(devOpsResult.matchRationale).toContain("Domain mismatch")
    })

    it("Checklist 4: validates project match proof and parses breakdown", async () => {
      const candidateProfile = {
        targetRoles: ["Senior Full Stack Engineer"],
        skills: ["React", "Next.js", "Node.js", "PostgreSQL", "Docker"],
        experienceLevel: "senior",
        location: "Remote",
        projects: [
          {
            name: "CodeArena",
            stack: "Next.js, Node.js, Docker, WebSockets",
            description: "Collaborative multiplayer code execution engine with real-time Docker sandbox.",
          },
        ],
      }

      const inputJobs: VectorCandidateJob[] = [
        {
          id: "job-fullstack-1",
          title: "Senior Full Stack Engineer",
          company: "Vercel",
          location: "Remote",
          isRemote: true,
          url: "https://job-boards.greenhouse.io/vercel/jobs/6122437004",
          salary: "$160k",
          salaryMin: 160000,
          salaryMax: 160000,
          tags: ["nextjs", "react", "node", "docker"],
          description: "Build realtime cloud development environments and collaborative SDKs.",
          postedAt: new Date(),
          visaSponsorship: "available",
          cosineSimilarity: 0.92,
        },
      ]

      vi.mocked(generateObject).mockResolvedValueOnce({
        object: {
          rankings: [
            {
              jobId: "job-fullstack-1",
              fitScore: 95,
              roleMatchScore: 24,
              skillMatchScore: 38,
              locationMatchScore: 20,
              seniorityMatchScore: 13,
              projectMatchProof: "CodeArena project validates Docker & real-time systems proficiency",
              matchRationale: "Exceptional alignment with full stack collaborative platforms.",
              missingCriticalSkills: [],
            },
          ],
        },
      } as any)

      const reRanked = await deepReRankCandidateJobs({
        candidateProfile,
        jobs: inputJobs,
      })

      expect(reRanked.length).toBe(1)
      const matched = reRanked[0]
      expect(matched.fitScore).toBe(95)
      expect(matched.matchRationale).toContain("Proof: CodeArena project validates Docker & real-time systems proficiency")

      // Verify parseMatchRationale parses this correctly in the UI
      const parsed = parseMatchRationale(matched.matchRationale)
      expect(parsed.skillsScore).toBe("38/40")
      expect(parsed.roleScore).toBe("24/25")
      expect(parsed.locationScore).toBe("20/20")
      expect(parsed.seniorityScore).toBe("13/15")

      const proofPoint = parsed.allPoints.find((p) => p.title === "Project Match Proof")
      expect(proofPoint).toBeDefined()
      expect(proofPoint?.content).toContain("CodeArena project validates Docker")
    })

    it("gracefully falls back to vector similarity if Tier 2 LLM call fails", async () => {
      vi.mocked(generateObject).mockRejectedValueOnce(new Error("Google Gemini API Quota Exceeded"))

      const inputJobs: VectorCandidateJob[] = [
        {
          id: "job-fallback-1",
          title: "Frontend Developer",
          company: "TechHub",
          location: "Remote",
          isRemote: true,
          url: "https://job-boards.greenhouse.io/techhub/jobs/101",
          salary: "$120k",
          salaryMin: 120000,
          salaryMax: 120000,
          tags: ["react"],
          description: "Frontend developer role",
          postedAt: new Date(),
          visaSponsorship: "unknown",
          cosineSimilarity: 0.85,
        },
      ]

      const results = await deepReRankCandidateJobs({
        candidateProfile: {
          targetRoles: ["Frontend Developer"],
          skills: ["React"],
          experienceLevel: "mid",
          location: "Remote",
          projects: [],
        },
        jobs: inputJobs,
      })

      expect(results.length).toBe(1)
      expect(results[0].fitScore).toBe(Math.round(0.85 * 95))
      expect(results[0].matchRationale).toBe("Direct semantic vector match")
      expect(results[0].scoreBreakdown.skills).toBe(25)
    })
  })
})
