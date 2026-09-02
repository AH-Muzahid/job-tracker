/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the AI SDK and config modules
vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({ text: "Summary of the conversation." }),
}))

vi.mock("@/lib/ai/resilience", () => ({
  getFallbackModelCascade: vi.fn().mockResolvedValue([{ model: {}, name: "test" }]),
}))

// Mock Redis
const mockRedisGet = vi.fn()
const mockRedisSet = vi.fn()
vi.mock("@/lib/redis", () => ({
  getCachedJson: (...args: any[]) => mockRedisGet(...args),
  setCachedJson: (...args: any[]) => mockRedisSet(...args),
}))

// Mock Inngest
const mockInngestSend = vi.fn().mockResolvedValue({ ids: ["event-123"] })
vi.mock("@/inngest/client", () => ({
  inngest: {
    send: (...args: any[]) => mockInngestSend(...args),
  },
}))

import {
  summarizeConversation,
  buildOptimizedConversationHistory,
  getCachedSessionSummary,
  setCachedSessionSummary,
  triggerBackgroundSummarize,
} from "../conversation-summarizer"

describe("conversation-summarizer unit suite", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("summarizeConversation", () => {
    it("returns messages unchanged if within budget", async () => {
      const messages = [
        { role: "user", content: "Hi" },
        { role: "user", content: "Hello" },
      ]
      const result = await summarizeConversation(messages, 10_000)
      expect(result).toHaveLength(2)
    })

    it("summarizes middle messages when over budget", async () => {
      const messages = Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: "A longer message with more content to consume tokens quickly. ".repeat(10),
      }))
      const result = await summarizeConversation(messages, 200, "test-user-id")
      expect(result.length).toBeLessThan(messages.length)
      expect(result[0].content).toBe(messages[0].content)
    })

    it("always preserves first message", async () => {
      const messages = Array.from({ length: 8 }, (_, i) => ({
        role: "user",
        content: "Message with enough tokens to matter. ".repeat(10),
      }))
      const result = await summarizeConversation(messages, 150, "test-user-id")
      expect(result[0].content).toBe(messages[0].content)
    })

    it("falls back to trimming when userId is not provided", async () => {
      const messages = Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: "A longer message with more content to consume tokens quickly. ".repeat(10),
      }))
      const result = await summarizeConversation(messages, 200)
      expect(result.length).toBeLessThan(messages.length)
      expect(result[0].content).toBe(messages[0].content)
    })
  })

  describe("Adaptive Sliding Window & Redis Summary Caching", () => {
    it("returns messages directly when message count is <= threshold", async () => {
      const messages = Array.from({ length: 6 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Short message ${i}`,
      }))

      const result = await buildOptimizedConversationHistory(messages, {
        sessionId: "sess-123",
        userId: "user-123",
        threshold: 8,
      })

      expect(result).toHaveLength(6)
      expect(mockRedisGet).not.toHaveBeenCalled()
      expect(mockInngestSend).not.toHaveBeenCalled()
    })

    it("injects cached summary and preserves recent messages when cache hits", async () => {
      const messages = Array.from({ length: 12 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Message turn ${i + 1}`,
      }))

      mockRedisGet.mockResolvedValueOnce("User is applying to Google and Apple for Senior Engineer.")

      const result = await buildOptimizedConversationHistory(messages, {
        sessionId: "sess-123",
        userId: "user-123",
        threshold: 8,
        recentCount: 4,
      })

      expect(mockRedisGet).toHaveBeenCalledWith("session:summary:sess-123")
      // Should contain first message + summary message + last 4 messages = 6 messages
      expect(result).toHaveLength(6)
      expect(result[0].content).toBe(messages[0].content)
      expect(result[1].role).toBe("system")
      expect(result[1].content).toContain("Previous Conversation Context & Summary")
      expect(result[1].content).toContain("User is applying to Google and Apple")
      // Last 4 messages
      expect(result.slice(-4)).toEqual(messages.slice(-4))
    })

    it("triggers background summarization on cache miss when messages > threshold", async () => {
      const messages = Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Message turn ${i + 1}`,
      }))

      mockRedisGet.mockResolvedValueOnce(null) // cache miss

      const result = await buildOptimizedConversationHistory(messages, {
        sessionId: "sess-123",
        userId: "user-123",
        threshold: 8,
      })

      expect(mockRedisGet).toHaveBeenCalledWith("session:summary:sess-123")
      expect(mockInngestSend).toHaveBeenCalledWith({
        name: "career/chat.summarize",
        data: {
          sessionId: "sess-123",
          userId: "user-123",
          force: false,
        },
      })
      expect(result.length).toBeGreaterThan(0)
    })

    it("manages Redis cache reads and writes with TTL", async () => {
      mockRedisGet.mockResolvedValueOnce("Existing Summary")
      const summary = await getCachedSessionSummary("sess-abc")
      expect(summary).toBe("Existing Summary")

      mockRedisSet.mockResolvedValueOnce(true)
      const success = await setCachedSessionSummary("sess-abc", "New Summary", 3600)
      expect(success).toBe(true)
      expect(mockRedisSet).toHaveBeenCalledWith("session:summary:sess-abc", "New Summary", 3600)
    })

    it("safely triggers background summarization with error handling", async () => {
      mockInngestSend.mockRejectedValueOnce(new Error("Network Error"))
      const result = await triggerBackgroundSummarize("sess-xyz", "user-xyz")
      expect(result).toBe(false)
    })
  })
})
