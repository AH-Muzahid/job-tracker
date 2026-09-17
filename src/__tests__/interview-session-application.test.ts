import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/auth", () => ({
  getInternalUserId: vi.fn().mockResolvedValue("user-test-123"),
}))

vi.mock("@/lib/ai/config", () => ({
  getUserAIConfig: vi.fn().mockResolvedValue({
    providerType: "google",
    model: "gemini-2.5-flash",
    apiKey: "test-api-key",
  }),
}))

vi.mock("@/lib/ai/provider", () => ({
  getProvider: vi.fn().mockReturnValue({
    model: vi.fn().mockReturnValue("mock-model"),
    defaultModel: "gemini-2.5-flash",
  }),
}))

vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({
    text: JSON.stringify({
      overallScore: 88,
      verdict: "Strong Hire",
      strengths: ["Strong system design"],
      improvementAreas: ["Minor cache invalidation details"],
      starBreakdown: {
        situation: "Good",
        task: "Clear",
        action: "Well structured",
        result: "Quantified",
      },
      knowledgeGaps: [],
      executiveSummary: "Great candidate",
    }),
  }),
}))

const mockCreate = vi.fn().mockResolvedValue({ id: "session-123" })
const mockFindFirst = vi.fn().mockResolvedValue({ id: "app-target-456" })

vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: {
      findFirst: (...args: any[]) => mockFindFirst(...args),
    },
    interviewSession: {
      create: (...args: any[]) => mockCreate(...args),
    },
  },
}))

import { POST } from "@/app/api/ai/mock-interview/report/route"
import { NextRequest } from "next/server"

describe("InterviewSession - Application Relational Linking (INT-07)", () => {
  it("links interview session to verified applicationId", async () => {
    mockCreate.mockClear()
    mockFindFirst.mockClear()

    const req = new NextRequest("http://localhost:3000/api/ai/mock-interview/report", {
      method: "POST",
      body: JSON.stringify({
        targetRole: "Staff Engineer",
        targetCompany: "Google",
        interviewType: "System Design",
        applicationId: "app-target-456",
        history: [
          { role: "interviewer", text: "How would you design a distributed cache?" },
          { role: "candidate", text: "I would use consistent hashing with virtual nodes." },
        ],
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "app-target-456", userId: "user-test-123" },
      })
    )

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-test-123",
          applicationId: "app-target-456",
          score: 88,
          verdict: "Strong Hire",
        }),
      })
    )
  })
})
