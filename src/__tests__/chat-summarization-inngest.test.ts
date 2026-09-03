/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { summarizeChatSessionFunction } from "@/inngest/functions/chat-summarizer"
import { prisma } from "@/lib/prisma"
import * as resilience from "@/lib/ai/resilience"
import * as redis from "@/lib/redis"
import * as aiSdk from "ai"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatMessage: {
      findMany: vi.fn(),
    },
    chatSession: {
      update: vi.fn(),
    },
  },
  withDbRetry: vi.fn((fn) => fn()),
}))

vi.mock("@/lib/redis", () => ({
  setCachedJson: vi.fn().mockResolvedValue(true),
  getCachedJson: vi.fn(),
}))

vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({
    text: "User is a Principal Engineer targeting high-scale distributed systems roles at Stripe and Datadog.",
  }),
}))

describe("Inngest Asynchronous Conversation Summarization Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("skips summarization when message count is less than 8 and force is false", async () => {
    const mockMessages = Array.from({ length: 5 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Message ${i + 1}`,
    }))

    vi.mocked(prisma.chatMessage.findMany).mockResolvedValueOnce(mockMessages as any)

    const mockStep = {
      run: vi.fn(async (_name: string, fn: () => any) => fn()),
    }

    const handler = (summarizeChatSessionFunction as any)["fn"]
    const result = await handler({
      event: {
        data: {
          sessionId: "sess-short",
          userId: "user-test",
          force: false,
        },
      },
      step: mockStep,
    })

    expect(result.status).toBe("skipped")
    expect(result.reason).toContain("below threshold")
    expect(aiSdk.generateText).not.toHaveBeenCalled()
    expect(redis.setCachedJson).not.toHaveBeenCalled()
  })

  it("successfully summarizes long conversation history and stores summary in Redis", async () => {
    const mockMessages = Array.from({ length: 12 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Turn ${i + 1}: discussing career goals and interview preparations.`,
    }))

    vi.mocked(prisma.chatMessage.findMany).mockResolvedValueOnce(mockMessages as any)

    vi.spyOn(resilience, "getFallbackModelCascade").mockResolvedValueOnce([
      { model: {} as any, name: "gemini-2.5-flash", id: "gemini-flash", providerType: "google" },
    ])

    const mockStep = {
      run: vi.fn(async (_name: string, fn: () => any) => fn()),
    }

    const handler = (summarizeChatSessionFunction as any)["fn"]
    const result = await handler({
      event: {
        data: {
          sessionId: "sess-long-1",
          userId: "user-test",
        },
      },
      step: mockStep,
    })

    expect(result.status).toBe("completed")
    expect(result.sessionId).toBe("sess-long-1")
    expect(result.messagesSummarized).toBe(8) // 12 - 4 = 8
    expect(result.summaryLength).toBeGreaterThan(0)

    expect(aiSdk.generateText).toHaveBeenCalled()
    expect(redis.setCachedJson).toHaveBeenCalledWith(
      "session:summary:sess-long-1",
      expect.stringContaining("Principal Engineer"),
      7 * 24 * 3600
    )
  })

  it("handles missing parameters gracefully", async () => {
    const handler = (summarizeChatSessionFunction as any)["fn"]
    const result = await handler({
      event: {
        data: {
          sessionId: "",
          userId: "",
        },
      },
      step: { run: vi.fn() },
    })

    expect(result.status).toBe("error")
  })
})
