import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET as getSalaryRoute } from "@/app/api/companies/salary/route"
import { GET as getUpskillRoute, POST as postUpskillRoute } from "@/app/api/career/upskill/route"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getInternalUserId } from "@/lib/auth"

vi.mock("@/lib/auth", () => ({
  getInternalUserId: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    salaryBenchmark: {
      findMany: vi.fn(),
    },
    careerKnowledgeGraph: {
      findUnique: vi.fn(),
    },
    userMemory: {
      findMany: vi.fn(),
    },
    userJobMatch: {
      findMany: vi.fn(),
    },
    application: {
      findMany: vi.fn(),
    },
    canonicalJob: {
      findUnique: vi.fn(),
    },
  },
  withDbRetry: vi.fn((fn: any) => fn()),
}))

describe("Salary & Upskill API Routes", () => {
  const mockUserId = "user-123"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /api/companies/salary", () => {
    it("returns 401 when user is not authenticated", async () => {
      vi.mocked(getInternalUserId).mockResolvedValueOnce(null)
      const req = new NextRequest("http://localhost:3000/api/companies/salary?company=Stripe")
      const res = await getSalaryRoute(req)
      expect(res.status).toBe(401)
    })

    it("returns 400 when company query param is missing", async () => {
      vi.mocked(getInternalUserId).mockResolvedValueOnce(mockUserId)
      const req = new NextRequest("http://localhost:3000/api/companies/salary")
      const res = await getSalaryRoute(req)
      expect(res.status).toBe(400)
    })

    it("returns benchmark and computed assessment when offeredSalary is provided", async () => {
      vi.mocked(getInternalUserId).mockResolvedValueOnce(mockUserId)
      vi.mocked(prisma.salaryBenchmark.findMany).mockResolvedValueOnce([
        {
          id: "sb-1",
          company: "Stripe",
          role: "Senior Software Engineer",
          location: "Remote",
          salaryMin: 180000,
          salaryMax: 240000,
          salaryMedian: 200000,
          salaryIndex: 120,
          currency: "USD",
          sampleSize: 50,
          source: "Levels.fyi",
          confidence: 0.95,
          category: "Engineering",
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any)

      const req = new NextRequest(
        "http://localhost:3000/api/companies/salary?company=Stripe&offeredSalary=$220,000"
      )
      const res = await getSalaryRoute(req)
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.benchmark.salaryMedian).toBe(200000)
      expect(body.assessment).toBeDefined()
      expect(body.assessment.index).toBe(110)
      expect(body.assessment.band).toBe("above_market")
    })
  })

  describe("GET /api/career/upskill (Aggregate Mode)", () => {
    it("returns 401 when unauthorized", async () => {
      vi.mocked(getInternalUserId).mockResolvedValueOnce(null)
      const res = await getUpskillRoute()
      expect(res.status).toBe(401)
    })

    it("aggregates skill gaps from matches, apps, and dismissals against candidate graph", async () => {
      vi.mocked(getInternalUserId).mockResolvedValueOnce(mockUserId)

      // Mock knowledge graph with known skills
      vi.mocked(prisma.careerKnowledgeGraph.findUnique).mockResolvedValueOnce({
        id: "kg-1",
        userId: mockUserId,
        nodes: [
          { name: "TypeScript", canonicalName: "typescript" },
          { name: "React", canonicalName: "react" },
        ],
        edges: [],
        summary: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      vi.mocked(prisma.userMemory.findMany).mockResolvedValueOnce([])

      // Mock saved matches with required skills
      vi.mocked(prisma.userJobMatch.findMany)
        .mockResolvedValueOnce([
          {
            id: "m-1",
            fitScore: 60,
            job: {
              id: "j-1",
              title: "Senior Backend Engineer",
              company: "Stripe",
              tags: ["Kubernetes", "Kafka", "TypeScript"],
              description: "Cloud platform scaling",
            },
          },
        ] as any) // saved matches
        .mockResolvedValueOnce([]) // unqualified dismissals

      vi.mocked(prisma.application.findMany).mockResolvedValueOnce([])

      const res = await getUpskillRoute()
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.heatmap).toBeDefined()
      
      // TypeScript is known by candidate -> should NOT be in heatmap
      expect(body.heatmap.some((g: any) => g.canonical === "typescript")).toBe(false)
      
      // Kubernetes and Kafka should be identified
      expect(body.heatmap.some((g: any) => g.canonical === "kubernetes")).toBe(true)
      expect(body.roadmap.length).toBeGreaterThan(0)
    })
  })

  describe("POST /api/career/upskill (Targeted Mode)", () => {
    it("analyzes single job description and diffs against candidate skills", async () => {
      vi.mocked(getInternalUserId).mockResolvedValueOnce(mockUserId)
      vi.mocked(prisma.careerKnowledgeGraph.findUnique).mockResolvedValueOnce({
        id: "kg-1",
        userId: mockUserId,
        nodes: [{ name: "Go", canonicalName: "go" }],
        edges: [],
        summary: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      const req = new NextRequest("http://localhost:3000/api/career/upskill", {
        method: "POST",
        body: JSON.stringify({
          jobDescription: "We need an engineer experienced with Go, Kubernetes, and Terraform.",
        }),
      })

      const res = await postUpskillRoute(req)
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.targeted.coveredSkills.map((s: any) => s.canonical)).toContain("go")
      expect(body.targeted.missingSkills.map((s: any) => s.canonical)).toContain("kubernetes")
      expect(body.targeted.missingSkills.map((s: any) => s.canonical)).toContain("terraform")
      expect(body.roadmap.length).toBeGreaterThan(0)
    })
  })
})
