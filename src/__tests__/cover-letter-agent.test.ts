/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { generateApplicationMaterialsAgent } from "@/lib/discovery/cover-letter-agent"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    applicationAnalysis: {
      upsert: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
  withDbRetry: vi.fn((cb) => cb()),
}))

vi.mock("@/lib/ai/config", () => ({
  getUserAIConfig: vi.fn(),
}))

vi.mock("@/lib/ai/client", () => ({
  getProvider: vi.fn(() => ({
    model: vi.fn((m) => m),
    defaultModel: "gpt-4o-mini",
  })),
}))

vi.mock("ai", () => ({
  generateText: vi.fn(),
}))

import { prisma } from "@/lib/prisma"
import { getUserAIConfig } from "@/lib/ai/config"
import { generateText } from "ai"

describe("Autonomous Cover Letter & Application Materials Agent (REC-16)", () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("generates deterministic materials and persists analysis when no AI config is set", async () => {
    ;(getUserAIConfig as any).mockResolvedValue(null)
    ;(prisma.userProfile.findUnique as any).mockResolvedValue({
      fullName: "Alex Rivera",
      strengths: "TypeScript, React, Next.js, Node.js",
      targetRoles: ["Full Stack Engineer"],
      bestProjects: [
        {
          name: "E-Commerce Microservices",
          stack: "TypeScript, Next.js, PostgreSQL",
          description: "High volume distributed retail engine",
        },
      ],
    })
    ;(prisma.user.findUnique as any).mockResolvedValue({
      name: "Alex Rivera",
    })
    ;(prisma.applicationAnalysis.upsert as any).mockResolvedValue({ id: "analysis-123" })
    ;(prisma.notification.create as any).mockResolvedValue({ id: "notif-123" })

    const result = await generateApplicationMaterialsAgent("user-1", "app-100", {
      companyName: "Vercel",
      jobTitle: "Senior Frontend Engineer",
      location: "Remote",
    })

    expect(result).toBeDefined()
    expect(result.coverLetter).toContain("Dear Hiring Team at Vercel")
    expect(result.coverLetter).toContain("Senior Frontend Engineer")
    expect(result.coverLetter).toContain("E-Commerce Microservices")
    expect(result.coverLetter).toContain("Alex Rivera")
    expect(result.highlights.length).toBeGreaterThanOrEqual(1)
    expect(result.outreachPitch).toContain("Senior Frontend Engineer at Vercel")

    // Verify DB persistence
    expect(prisma.applicationAnalysis.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { applicationId: "app-100" },
        create: expect.objectContaining({
          applicationId: "app-100",
          matchScore: 85,
          rawAnalysis: expect.stringContaining("Dear Hiring Team at Vercel"),
        }),
      })
    )

    // Verify notification creation
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          type: "APPLICATION_MATERIALS",
          title: "Application Draft Generated",
        }),
      })
    )
  })

  it("uses LLM when user AI config is present and properly parses JSON output", async () => {
    ;(getUserAIConfig as any).mockResolvedValue({
      provider: "openai",
      apiKey: "sk-test",
      model: "gpt-4o-mini",
    })
    ;(prisma.userProfile.findUnique as any).mockResolvedValue({
      fullName: "Sarah Chen",
      strengths: "Python, FastAPI, PyTorch",
    })
    ;(prisma.user.findUnique as any).mockResolvedValue({
      name: "Sarah Chen",
    })
    ;(generateText as any).mockResolvedValue({
      text: JSON.stringify({
        coverLetter: "Dear OpenAI team, I am excited to apply for AI Engineer...",
        highlights: ["Built scalable LLM inference pipelines"],
        outreachPitch: "Hi! I saw the AI Engineer opening at OpenAI.",
        strategyTip: "Emphasize evaluation metrics and latency reduction.",
        atsKeywords: ["python", "pytorch", "transformers"],
      }),
    })
    ;(prisma.applicationAnalysis.upsert as any).mockResolvedValue({ id: "analysis-456" })

    const result = await generateApplicationMaterialsAgent("user-2", "app-200", {
      companyName: "OpenAI",
      jobTitle: "AI Engineer",
    })

    expect(result.coverLetter).toContain("Dear OpenAI team")
    expect(result.highlights).toContain("Built scalable LLM inference pipelines")
    expect(result.strategyTip).toContain("Emphasize evaluation metrics")
    expect(generateText).toHaveBeenCalled()
    expect(prisma.applicationAnalysis.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { applicationId: "app-200" },
        create: expect.objectContaining({
          applicationId: "app-200",
          rawAnalysis: "Dear OpenAI team, I am excited to apply for AI Engineer...",
        }),
      })
    )
  })

  it("resiliently falls back to deterministic materials if LLM call fails or times out", async () => {
    ;(getUserAIConfig as any).mockResolvedValue({
      provider: "openai",
      apiKey: "sk-invalid",
    })
    ;(prisma.userProfile.findUnique as any).mockResolvedValue({
      fullName: "Jordan Lee",
      strengths: "Go, Kubernetes",
    })
    ;(prisma.user.findUnique as any).mockResolvedValue({
      name: "Jordan Lee",
    })
    ;(generateText as any).mockRejectedValue(new Error("API Rate Limit Exceeded"))
    ;(prisma.applicationAnalysis.upsert as any).mockResolvedValue({ id: "analysis-789" })

    const result = await generateApplicationMaterialsAgent("user-3", "app-300", {
      companyName: "Stripe",
      jobTitle: "Backend Infrastructure Engineer",
    })

    expect(result).toBeDefined()
    expect(result.coverLetter).toContain("Dear Hiring Team at Stripe")
    expect(result.coverLetter).toContain("Jordan Lee")
    expect(prisma.applicationAnalysis.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { applicationId: "app-300" },
      })
    )
  })
})
