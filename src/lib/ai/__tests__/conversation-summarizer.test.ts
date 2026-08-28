import { describe, it, expect, vi } from "vitest"

// Mock the AI SDK and config modules
vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({ text: "Summary of the conversation." }),
}))

vi.mock("@/lib/ai/config", () => ({
  getUserAIConfig: vi.fn().mockResolvedValue({}),
}))

vi.mock("@/lib/ai/resilience", () => ({
  getFallbackModelCascade: vi.fn().mockResolvedValue([{ model: {}, name: "test" }]),
}))

import { summarizeConversation } from "../conversation-summarizer"

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
    // Should have: first message + summary + last 4 messages
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
    // Should fall back to trimming (no summarization)
    expect(result.length).toBeLessThan(messages.length)
    expect(result[0].content).toBe(messages[0].content)
  })
})
