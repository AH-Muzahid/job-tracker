/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  formatWeaknessMitigationForResume,
  buildWeaknessProbingInstruction,
  type WeaknessMemory,
} from "@/lib/ai/memory"
import { POST as reportRouteHandler } from "@/app/api/ai/mock-interview/report/route"
import { POST as tailorRouteHandler } from "@/app/api/resumes/tailor/route"
import { generateApplicationMaterialsAgent } from "@/lib/discovery/cover-letter-agent"
import { runInterviewCoachPipeline } from "@/lib/ai/graph/workflows/interview-coach"
import { prisma } from "@/lib/prisma"
vi.mock("ai", () => ({
  generateText: vi.fn(),
}))

vi.mock("@/lib/ai/client", () => ({
  getProvider: vi.fn(() => ({
    model: vi.fn((m) => m),
    defaultModel: "gemini-1.5-flash",
  })),
}))

import { generateText } from "ai"
import { NextRequest } from "next/server"
import * as resilienceModule from "@/lib/ai/resilience"
import * as configModule from "@/lib/ai/config"
import * as authModule from "@/lib/auth"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    userProfile: {
      findUnique: vi.fn(),
    },
    resume: {
      findFirst: vi.fn(),
    },
    userMemory: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "mem-1" }),
    },
    application: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    applicationAnalysis: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    interviewSession: {
      create: vi.fn(),
    },
    notification: {
      create: vi.fn().mockResolvedValue({ id: "notif-1" }),
    },
    careerKnowledgeGraph: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
  withDbRetry: vi.fn((fn) => fn()),
}))

vi.mock("@/lib/redis", () => ({
  invalidateCache: vi.fn().mockResolvedValue(true),
  getCachedJson: vi.fn().mockResolvedValue(null),
  setCachedJson: vi.fn().mockResolvedValue(true),
}))

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ success: true }),
  rateLimitResponse: vi.fn(),
}))

vi.mock("@/lib/ai/agents/company-dossier-agent", () => ({
  compileCompanyDossier: vi.fn().mockResolvedValue({
    success: true,
    dossier: {
      companyOverview: "Stripe powers internet commerce.",
      techStackHighlights: ["Ruby", "Go", "TypeScript"],
      curatedInterviewQuestions: ["Idempotency in payments"],
    },
  }),
}))

describe("CAG-14: Bi-directional Interview Feedback Loop", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(authModule, "getInternalUserId").mockResolvedValue("user-123")
  })

  describe("Memory Utilities", () => {
    it("formats historical interview weaknesses into actionable resume tailoring instructions", () => {
      const mockWeaknesses: WeaknessMemory[] = [
        {
          id: "mem-1",
          userId: "user-123",
          category: "weakness",
          content: "[Weakness: Kafka Partitions] [System Design] at Stripe: Lacked partition key strategy",
          confidence: 0.95,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "mem-2",
          userId: "user-123",
          category: "weakness",
          content: "[Weakness: STAR Results] [Behavioral]: Omitted measurable latency/cost metrics",
          confidence: 0.8,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      const promptDirective = formatWeaknessMitigationForResume(mockWeaknesses)
      expect(promptDirective).toContain("CANDIDATE HISTORICAL INTERVIEW WEAKNESSES TO PROACTIVELY COUNTERACT")
      expect(promptDirective).toContain("Kafka Partitions")
      expect(promptDirective).toContain("STAR Results")
      expect(promptDirective).toContain("weaknessMitigations")
    })

    it("returns empty string when no weaknesses are recorded", () => {
      expect(formatWeaknessMitigationForResume([])).toBe("")
    })
  })

  describe("Mock Interview Report -> ApplicationAnalysis & Application Sync", () => {
    it("persists knowledge gaps to UserMemory and updates ApplicationAnalysis gapAnalysis", async () => {
      vi.mocked(prisma.application.findFirst).mockResolvedValueOnce({ id: "app-stripe-1" } as any)
      vi.mocked(prisma.interviewSession.create).mockResolvedValueOnce({ id: "session-1" } as any)
      vi.mocked(prisma.userMemory.findMany).mockResolvedValueOnce([])
      vi.mocked(prisma.userMemory.create).mockResolvedValue({ id: "mem-new" } as any)
      vi.mocked(prisma.applicationAnalysis.findUnique).mockResolvedValueOnce({ id: "analysis-1" } as any)
      vi.mocked(prisma.applicationAnalysis.update).mockResolvedValueOnce({} as any)
      vi.mocked(prisma.application.update).mockResolvedValueOnce({} as any)

      vi.spyOn(resilienceModule, "resilientGenerateText").mockResolvedValueOnce({
        text: JSON.stringify({
          verdict: "Hire",
          overallScore: 88,
          technicalScore: 85,
          clarityScore: 90,
          starBreakdown: {
            situation: "Payment processing at scale",
            task: "Prevent double-charge anomalies",
            action: "Implemented distributed locking with Redis Redlock",
            result: "Zero duplicate charges across 10M transactions",
          },
          strengths: ["Strong systems intuition"],
          improvementAreas: ["Elaborate on network partition trade-offs"],
          executiveSummary: "Solid technical performance with clear communication.",
          knowledgeGaps: [
            {
              id: "gap-1",
              topic: "Network Partitions in Redlock",
              type: "technical",
              severity: "high",
              questionAsked: "What happens when Redis nodes partition?",
              candidateAnswerSummary: "Mentioned consensus but glossed over split-brain edge cases.",
              weaknessReason: "Did not evaluate Martin Kleppmann's timing assumption critique.",
              idealAnswer: "Acknowledge asynchronous replication trade-offs and use monotonic fencing tokens.",
              starBreakdown: {
                situation: "Split-brain partition",
                task: "Ensure mutual exclusion",
                action: "Validated fencing tokens at storage level",
                result: "Guaranteed linearizability",
              },
              keyTakeaways: ["Always use fencing tokens"],
              followUpPracticePrompt: "How do fencing tokens prevent stale leader writes?",
            },
          ],
        }),
      } as any)

      const request = new NextRequest("http://localhost:3000/api/ai/mock-interview/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole: "Staff Backend Engineer",
          targetCompany: "Stripe",
          interviewType: "System Design",
          applicationId: "app-stripe-1",
          history: [
            { role: "interviewer", text: "How do you design a payment gateway?" },
            { role: "candidate", text: "I would use idempotent request tokens and distributed locks." },
          ],
        }),
      })

      const response = await reportRouteHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.verdict).toBe("Hire")
      expect(data.overallScore).toBe(88)

      // Verified knowledge gap stored to UserMemory
      expect(prisma.userMemory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-123",
            category: "weakness",
            source: "interview",
            content: expect.stringContaining("Network Partitions in Redlock"),
          }),
        })
      )

      // Verified ApplicationAnalysis was updated with gapAnalysis
      expect(prisma.applicationAnalysis.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { applicationId: "app-stripe-1" },
          data: expect.objectContaining({
            gapAnalysis: expect.objectContaining({
              interviewScore: 88,
              verdict: "Hire",
              interviewType: "System Design",
              knowledgeGaps: expect.any(Array),
            }),
          }),
        })
      )

      // Verified Application interviewNotes updated
      expect(prisma.application.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "app-stripe-1" },
          data: expect.objectContaining({
            interviewNotes: expect.stringContaining("Score: 88/100, Verdict: Hire"),
          }),
        })
      )
    })
  })

  describe("Resume Tailoring Engine -> Weakness Mitigation", () => {
    it("fetches historical weaknesses and outputs weaknessMitigations in tailored resume payload", async () => {
      vi.spyOn(configModule, "getUserAIConfig").mockResolvedValueOnce({
        providerType: "google",
        apiKey: "test-gemini-key",
        model: "gemini-1.5-flash",
      } as any)

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        name: "Alex Candidate",
        email: "alex@example.com",
      } as any)
      vi.mocked(prisma.userProfile.findUnique).mockResolvedValueOnce({
        targetRoles: ["Staff Software Engineer"],
        strengths: "TypeScript, Distributed Systems, Go",
      } as any)
      vi.mocked(prisma.resume.findFirst).mockResolvedValueOnce({
        title: "Default Resume",
        fileName: "resume.pdf",
        textContent: "Experienced Staff Engineer building scalable microservices.",
      } as any)

      // Return historical interview weakness
      vi.mocked(prisma.userMemory.findMany).mockResolvedValueOnce([
        {
          id: "mem-weakness-1",
          userId: "user-123",
          category: "weakness",
          content: "[Weakness: Kafka Partitions] [System Design] at Stripe: Lacked partition key strategy",
          confidence: 0.95,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any)

      vi.mocked(generateText).mockResolvedValueOnce({
        text: JSON.stringify({
          header: {
            fullName: "Alex Candidate",
            title: "Staff Software Engineer",
            email: "alex@example.com",
          },
          summary: "Staff Engineer specializing in distributed message queues and fault-tolerant architecture.",
          skillsByDomain: [
            { domain: "Languages", skills: ["Go", "TypeScript"] },
            { domain: "Distributed Systems", skills: ["Kafka", "Redis", "PostgreSQL"] },
          ],
          experience: [
            {
              role: "Senior Backend Engineer",
              company: "Fintech Corp",
              duration: "2023 - Present",
              bullets: [
                "Designed deterministic Kafka partition key hashing strategy eliminating hot-partition skew across 50,000 req/s.",
              ],
            },
          ],
          projects: [
            {
              name: "High-Throughput Ingestion Engine",
              stack: ["Kafka", "Go", "Kubernetes"],
              bullets: ["Engineered partition-aware message batching reducing consumer lag by 80%."],
            },
          ],
          education: [{ degree: "B.S. Computer Science", institution: "Tech University" }],
          weaknessMitigations: [
            {
              weaknessTopic: "Kafka Partitions",
              mitigationStrategy:
                "Added explicit experience bullet demonstrating deterministic partition key hashing and hot-spot elimination with measurable throughput metrics.",
            },
          ],
        }),
      } as any)

      const request = new NextRequest("http://localhost:3000/api/resumes/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jdText: "We are seeking a Staff Backend Engineer with deep Apache Kafka and high-throughput microservices experience.",
          targetCompany: "Uber",
          targetRole: "Staff Backend Engineer",
        }),
      })

      const response = await tailorRouteHandler(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data).toBeDefined()
      expect(body.data.weaknessMitigations).toBeDefined()
      expect(body.data.weaknessMitigations.length).toBeGreaterThan(0)
      expect(body.data.weaknessMitigations[0].weaknessTopic).toContain("Kafka Partitions")
    })
  })

  describe("Cover Letter Agent -> Weakness Context Integration", () => {
    it("queries user weaknesses and injects them to avoid overpromising and focus on strengths", async () => {
      vi.spyOn(configModule, "getUserAIConfig").mockResolvedValueOnce({
        providerType: "google",
        apiKey: "test-gemini-key",
      } as any)

      vi.mocked(prisma.userProfile.findUnique).mockResolvedValueOnce({
        fullName: "Alex Dev",
        targetRoles: ["Fullstack Engineer"],
        strengths: "React, TypeScript, Node.js",
        bestProjects: [{ name: "CareerTrack", stack: "Next.js, PostgreSQL" }],
      } as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ name: "Alex Dev" } as any)

      vi.mocked(prisma.userMemory.findMany).mockResolvedValueOnce([
        {
          id: "mem-w-1",
          userId: "user-123",
          category: "weakness",
          content: "[Weakness: CSS Grid] Struggles with responsive column layouts",
        },
      ] as any)

      vi.mocked(generateText).mockResolvedValueOnce({
        text: JSON.stringify({
          coverLetter: "Dear Team, I am excited to apply...",
          highlights: ["Demonstrated fullstack execution with React and TypeScript"],
          outreachPitch: "Hi! I built CareerTrack with Next.js.",
          strategyTip: "Emphasize proven TypeScript backend architecture.",
          atsKeywords: ["TypeScript", "Next.js", "React"],
        }),
      } as any)

      vi.mocked(prisma.applicationAnalysis.upsert).mockResolvedValueOnce({} as any)

      const materials = await generateApplicationMaterialsAgent("user-123", "app-test-1", {
        jobTitle: "Frontend Engineer",
        companyName: "Vercel",
      })

      expect(materials).toBeDefined()
      expect(materials.coverLetter).toContain("Dear Team")

      // Verify generateText was called with weakness notes in prompt
      const promptArg = (vi.mocked(generateText).mock.calls[0][0] as any).prompt
      expect(promptArg).toContain("Areas of Prior Technical Weakness / Feedback")
      expect(promptArg).toContain("CSS Grid")
    })
  })

  describe("Interview Coach Subgraph -> Longitudinal Tracking & Analysis Sync", () => {
    it("synchronizes evaluation findings to ApplicationAnalysis during full cycle execution", async () => {
      vi.mocked(prisma.userMemory.findMany).mockResolvedValueOnce([])
      vi.mocked(prisma.applicationAnalysis.findUnique).mockResolvedValueOnce({ id: "analysis-stripe" } as any)
      vi.mocked(prisma.applicationAnalysis.update).mockResolvedValueOnce({} as any)

      const sampleDialogue = [
        { role: "interviewer", text: "How do you ensure data integrity in payment systems?" },
        {
          role: "candidate",
          text: "I implement two-phase commit transactions and idempotent request tokens with unique UUIDs.",
        },
      ]

      const result = await runInterviewCoachPipeline({
        userId: "user-123",
        applicationId: "app-stripe-99",
        targetCompany: "Stripe",
        targetRole: "Staff Software Engineer",
        roundType: "System Design",
        dialogue: sampleDialogue,
      })

      expect(result.status).toBe("completed")
      expect(result.evaluationReport).toBeDefined()

      // Verified ApplicationAnalysis was updated via longitudinalTrackingNode
      expect(prisma.applicationAnalysis.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { applicationId: "app-stripe-99" },
          data: expect.objectContaining({
            gapAnalysis: expect.objectContaining({
              interviewScore: expect.any(Number),
              verdict: expect.any(String),
              interviewType: "System Design",
            }),
          }),
        })
      )
    })
  })
})
