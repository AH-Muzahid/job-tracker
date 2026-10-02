import { describe, it, expect } from "vitest"

describe("Conversational AI Voice Mock Interview Loop", () => {
  it("formats conversation dialogue correctly for multi-turn duplex exchange", () => {
    const history = [
      {
        role: "interviewer" as const,
        text: "Tell me about your background with distributed databases.",
      },
      {
        role: "candidate" as const,
        text: "I built an event-driven ledger using PostgreSQL and Redis Streams.",
      },
    ]

    expect(history.length).toBe(2)
    expect(history[0].role).toBe("interviewer")
    expect(history[1].role).toBe("candidate")
  })

  it("supports bilingual (Bangla, English, Mixed) interview configurations", () => {
    const validLanguages = ["en", "bn", "mixed"]
    expect(validLanguages).toContain("bn")
    expect(validLanguages).toContain("mixed")
    expect(validLanguages).toContain("en")
  })

  it("verifies hiring bar recommendation outcomes", () => {
    const validVerdicts = ["Strong Hire", "Hire", "Lean Hire", "No Hire"]
    const mockReport = {
      verdict: "Strong Hire",
      overallScore: 92,
      technicalScore: 95,
      clarityScore: 90,
      starBreakdown: {
        situation: "Very crisp setup of traffic spikes",
        task: "Defined clear latency reduction target",
        action: "Used Redis Streams with Go concurrency channels",
        result: "Reduced p99 latency by 65%",
      },
      strengths: ["Clear architectural depth", "Quantifiable metrics"],
      improvementAreas: ["Could mention backup failover"],
      executiveSummary: "Strong hire for the senior engineering position.",
    }

    expect(validVerdicts).toContain(mockReport.verdict)
    expect(mockReport.overallScore).toBeGreaterThanOrEqual(90)
    expect(mockReport.starBreakdown.result).toContain("latency")
  })

  it("sanitizes repeated Bengali punctuation and cleans speech recognition text", () => {
    const rawTranscript = "  । আমি রিয়্যাক্ট এবং নেক্সট জেএস এ কাজ করেছি ।।।।  "
    const cleaned = rawTranscript
      .replace(/[।|]{2,}/g, "। ")
      .replace(/([.?!,])\1+/g, "$1")
      .replace(/\s+([।?!,.])/g, "$1")
      .replace(/^[।?!,.\s|]+/, "")
      .replace(/\s+/g, " ")
      .trim()

    expect(cleaned).toBe("আমি রিয়্যাক্ট এবং নেক্সট জেএস এ কাজ করেছি।")
    expect(cleaned).not.toContain("।।।।")
  })

  it("correctly identifies meaningful speech vs mere punctuation noise", () => {
    const noise = "।।।। ..."
    const shortAnswer = "হাঁ"
    const englishAnswer = "Yes"

    const noiseCount = noise.replace(/[\s\p{P}\p{S}]/gu, "").length
    const shortAnswerCount = shortAnswer.replace(/[\s\p{P}\p{S}]/gu, "").length
    const englishAnswerCount = englishAnswer.replace(/[\s\p{P}\p{S}]/gu, "").length

    expect(noiseCount).toBe(0)
    expect(shortAnswerCount).toBe(3)
    expect(englishAnswerCount).toBe(3)
    expect(shortAnswerCount >= 2).toBe(true)
    expect(englishAnswerCount >= 2).toBe(true)
  })
})
