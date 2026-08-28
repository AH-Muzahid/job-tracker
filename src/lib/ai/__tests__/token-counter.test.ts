import { describe, it, expect } from "vitest"
import { countTokens, countMessageTokens, trimToTokenBudget } from "../token-counter"

describe("countTokens", () => {
  it("counts tokens in simple text", () => {
    const tokens = countTokens("Hello, world!")
    expect(tokens).toBeGreaterThan(0)
    expect(tokens).toBeLessThan(10)
  })

  it("returns 0 for empty string", () => {
    expect(countTokens("")).toBe(0)
  })

  it("handles longer text", () => {
    const text = "This is a longer piece of text that should have more tokens than a simple greeting."
    expect(countTokens(text)).toBeGreaterThan(10)
  })
})

describe("countMessageTokens", () => {
  it("counts tokens with message overhead", () => {
    const messages = [{ role: "user", content: "Hello" }]
    const tokens = countMessageTokens(messages)
    expect(tokens).toBeGreaterThan(4) // at least the overhead
  })

  it("sums multiple messages", () => {
    const messages = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there" },
    ]
    const single = countMessageTokens([messages[0]])
    const double = countMessageTokens(messages)
    expect(double).toBeGreaterThan(single)
  })
})

describe("trimToTokenBudget", () => {
  it("returns all messages if within budget", () => {
    const messages = [
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello" },
    ]
    const result = trimToTokenBudget(messages, 10_000)
    expect(result).toHaveLength(1)
  })

  it("always keeps first message", () => {
    const messages = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "A longer message with more tokens to consume budget quickly ".repeat(5),
    }))
    const result = trimToTokenBudget(messages, 200)
    expect(result[0].content).toBe(messages[0].content)
  })

  it("trims older messages when budget exceeded", () => {
    const messages = [
      { role: "user", content: "First message" },
      { role: "assistant", content: "Second message" },
      { role: "user", content: "Third message" },
      { role: "assistant", content: "Fourth message" },
    ]
    const budget = countMessageTokens([messages[0]]) + 10 // small budget
    const result = trimToTokenBudget(messages, budget)
    expect(result[0].content).toBe(messages[0].content)
    expect(result.length).toBeLessThanOrEqual(messages.length)
  })
})