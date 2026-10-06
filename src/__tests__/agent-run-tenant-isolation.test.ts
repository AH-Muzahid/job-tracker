/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock internal auth
vi.mock("@/lib/auth", () => ({
  getInternalUserId: vi.fn(),
}))

// Mock AI config
vi.mock("@/lib/ai/config", () => ({
  getUserAIConfig: vi.fn(),
}))

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatSession: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    chatMessage: {
      create: vi.fn(),
      count: vi.fn().mockResolvedValue(1),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
  withDbRetry: vi.fn((cb: any) => cb()),
}))

// Mock Redis
vi.mock("@/lib/redis", () => ({
  invalidateCache: vi.fn().mockResolvedValue(true),
  getCachedJson: vi.fn().mockResolvedValue(null),
  setCachedJson: vi.fn().mockResolvedValue(true),
}))

// Mock LangGraph agent workflow
vi.mock("@/lib/ai/graph/workflow", () => ({
  buildCareerAgentGraph: vi.fn().mockReturnValue({
    stream: vi.fn().mockImplementation(async function* () {
      yield { responder: { responseContent: "Hello" } }
    }),
    getState: vi.fn().mockResolvedValue({
      values: { responseContent: "Hello" },
    }),
  }),
}))

// Mock ops and telemetry
vi.mock("@/lib/ops/app-logger", () => ({
  appLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock("@/lib/ops/telemetry-ring", () => ({
  recordLLMCallToRing: vi.fn(),
  recordAgentStepToRing: vi.fn(),
}))
vi.mock("@/lib/ai/conversation-summarizer", () => ({
  triggerBackgroundSummarize: vi.fn(),
  getCachedSessionSummary: vi.fn().mockResolvedValue(null),
}))
vi.mock("@/lib/ai/title-generator", () => ({
  generateAndSaveSessionTitle: vi.fn(),
}))
vi.mock("@/lib/ai/token-counter", () => ({
  countTokens: vi.fn().mockReturnValue(10),
}))
vi.mock("@/lib/ai/graph/telemetry", () => ({
  trackGraphExecution: vi.fn(),
  createLangfuseCallbackHandler: vi.fn().mockReturnValue(null),
  flushLangfuse: vi.fn(),
}))

import { getInternalUserId } from "@/lib/auth"
import { getUserAIConfig } from "@/lib/ai/config"
import { prisma } from "@/lib/prisma"
import { POST } from "@/app/api/agent/run/route"

describe("Chat Session Tenant Isolation & Ownership Guard (/api/agent/run)", () => {
  const currentUserId = "user-alice-123"
  const victimUserId = "user-bob-999"
  const targetSessionId = "session-victim-777"

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getInternalUserId).mockResolvedValue(currentUserId)
    vi.mocked(getUserAIConfig).mockResolvedValue({
      provider: "google",
      modelName: "gemini-2.5-flash",
      apiKey: "test-api-key",
      temperature: 0.2,
      maxOutputTokens: 2048,
    } as any)
  })

  it("blocks cross-tenant access with 403 when session belongs to another user", async () => {
    // Session exists and belongs to Bob
    vi.mocked(prisma.chatSession.findUnique).mockResolvedValue({
      userId: victimUserId,
    } as any)

    const req = new NextRequest("http://localhost:3000/api/agent/run", {
      method: "POST",
      body: JSON.stringify({
        sessionId: targetSessionId,
        message: "Inject unauthorized prompt into Bob's session",
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe("Forbidden: Session belongs to another user")

    // Verify no chat message was appended and session was not updated
    expect(prisma.chatSession.upsert).not.toHaveBeenCalled()
    expect(prisma.chatMessage.create).not.toHaveBeenCalled()
  })

  it("allows execution and upserts session when session belongs to the current user", async () => {
    // Session exists and belongs to Alice
    vi.mocked(prisma.chatSession.findUnique).mockResolvedValue({
      userId: currentUserId,
    } as any)
    vi.mocked(prisma.chatSession.upsert).mockResolvedValue({
      id: targetSessionId,
      userId: currentUserId,
    } as any)
    vi.mocked(prisma.chatMessage.create).mockResolvedValue({
      id: "msg-1",
      sessionId: targetSessionId,
      role: "user",
      content: "Hello agent",
    } as any)

    const req = new NextRequest("http://localhost:3000/api/agent/run", {
      method: "POST",
      body: JSON.stringify({
        sessionId: targetSessionId,
        message: "Hello agent",
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(prisma.chatSession.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: targetSessionId },
      })
    )
    expect(prisma.chatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sessionId: targetSessionId,
          content: "Hello agent",
        }),
      })
    )
  })

  it("allows creation when session does not exist yet", async () => {
    // Session does not exist in DB yet
    vi.mocked(prisma.chatSession.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.chatSession.upsert).mockResolvedValue({
      id: "new-session-id",
      userId: currentUserId,
    } as any)
    vi.mocked(prisma.chatMessage.create).mockResolvedValue({
      id: "msg-1",
      sessionId: "new-session-id",
      role: "user",
      content: "New session prompt",
    } as any)

    const req = new NextRequest("http://localhost:3000/api/agent/run", {
      method: "POST",
      body: JSON.stringify({
        sessionId: "new-session-id",
        message: "New session prompt",
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(prisma.chatSession.upsert).toHaveBeenCalled()
    expect(prisma.chatMessage.create).toHaveBeenCalled()
  })
})
