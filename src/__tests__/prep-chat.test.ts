import { describe, it, expect, vi } from "vitest"
import { NextRequest } from "next/server"

// Mock internal auth and AI dependencies
vi.mock("@/lib/auth", () => ({
  getInternalUserId: vi.fn(),
}))

vi.mock("@/lib/ai/config", () => ({
  getUserAIConfig: vi.fn(),
}))

vi.mock("@/lib/ai/knowledge-graph", () => ({
  getCachedKnowledgeGraph: vi.fn().mockResolvedValue({
    nodes: [{ type: "skill", name: "TypeScript" }, { type: "skill", name: "Next.js" }],
    edges: [],
  }),
}))

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ success: true }),
  rateLimitResponse: vi.fn(),
}))

vi.mock("@/lib/ai/resilience", () => ({
  resilientGenerateText: vi.fn().mockResolvedValue({
    text: "### React Server Components (RSC)\n\n**Mental Model**: RSC execute only on the server.\n\n**Production Example**:\n```tsx\nexport async function ProductPage() { ... }\n```",
    modelUsed: "gemini-2.5-flash",
    fallbackTriggered: false,
  }),
}))

import { getInternalUserId } from "@/lib/auth"
import { getUserAIConfig } from "@/lib/ai/config"
import { POST } from "@/app/api/ai/prep-chat/route"

describe("Concept Lab / Prep-Chat Route & Integration", () => {
  it("rejects unauthenticated requests with 401", async () => {
    vi.mocked(getInternalUserId).mockResolvedValueOnce(null)
    const req = new NextRequest("http://localhost:3000/api/ai/prep-chat", {
      method: "POST",
      body: JSON.stringify({ question: "How does React Fiber work?" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("handles missing user AI key gracefully with 400", async () => {
    vi.mocked(getInternalUserId).mockResolvedValueOnce("user-123")
    vi.mocked(getUserAIConfig).mockResolvedValueOnce(null)
    const req = new NextRequest("http://localhost:3000/api/ai/prep-chat", {
      method: "POST",
      body: JSON.stringify({ question: "What is database sharding?" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe("AI_KEY_REQUIRED")
  })

  it("successfully responds with both answer and explanation for ConceptLabTab compatibility", async () => {
    vi.mocked(getInternalUserId).mockResolvedValueOnce("user-123")
    vi.mocked(getUserAIConfig).mockResolvedValueOnce({
      providerType: "google",
      modelName: "gemini-2.5-flash",
      apiKey: "test-key",
    } as any)

    const req = new NextRequest("http://localhost:3000/api/ai/prep-chat", {
      method: "POST",
      body: JSON.stringify({
        question: "Explain React Server Components",
        topic: "React & Next.js",
        language: "mixed",
        history: [
          { role: "user", content: "What is SSR?" },
          { role: "assistant", content: "SSR renders HTML on every request." },
        ],
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.answer).toContain("React Server Components")
    expect(json.explanation).toBe(json.answer)
    expect(json.topic).toBe("React & Next.js")
    expect(Array.isArray(json.suggestedNextQuestions)).toBe(true)
    expect(json.suggestedNextQuestions.length).toBeGreaterThanOrEqual(3)
  })
})
