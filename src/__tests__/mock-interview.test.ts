import { describe, it, expect } from "vitest"
import { MockInterviewEvaluationSchema } from "@/lib/ai/structured-output"

describe("AI Voice Mock Interview Evaluator & STAR Framework", () => {
  it("validates well-formed STAR mock interview evaluations", () => {
    const validSample = {
      overallScore: 88,
      technicalScore: 92,
      clarityScore: 85,
      starBreakdown: {
        situation: "Explained high-traffic latency spikes in the payment pipeline accurately.",
        task: "Led the migration of transactional logs to Redis Streams.",
        action: "Designed asynchronous batching workers in Go and configured backpressure buffers.",
        result: "Reduced p99 latency by 65% and scaled throughput to 50k req/s.",
      },
      strengths: [
        "Concrete architectural choices and tools named",
        "Clear quantifiable business metrics in the result",
      ],
      improvementAreas: [
        "Could elaborate on fault recovery during network partitions",
      ],
      idealModelAnswer:
        "When our payment system faced 2-second p99 latency spikes during flash sales, my objective was to decouple synchronous DB writes without risking message loss. I designed an asynchronous batch worker in Go using Redis Streams for durable queuing and configured exponential backpressure. As a result, p99 latency dropped by 65% and we handled 50,000 req/s with zero dropped events.",
    }

    const parsed = MockInterviewEvaluationSchema.safeParse(validSample)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.overallScore).toBe(88)
      expect(parsed.data.starBreakdown.result).toContain("Reduced p99 latency")
      expect(parsed.data.strengths.length).toBe(2)
    }
  })

  it("enforces numeric range constraints on scores (0-100)", () => {
    const invalidSample = {
      overallScore: 120, // out of range
      technicalScore: -10, // out of range
      clarityScore: 80,
      starBreakdown: {
        situation: "Context",
        task: "Goal",
        action: "Action",
        result: "Result",
      },
      strengths: ["Strength 1"],
      improvementAreas: ["Area 1"],
      idealModelAnswer: "Model answer",
    }

    const parsed = MockInterviewEvaluationSchema.safeParse(invalidSample)
    expect(parsed.success).toBe(false)
  })

  it("requires all 4 STAR dimensions in the evaluation breakdown", () => {
    const incompleteSample = {
      overallScore: 80,
      technicalScore: 80,
      clarityScore: 80,
      starBreakdown: {
        situation: "Context",
        // missing task, action, result
      },
      strengths: ["Strength"],
      improvementAreas: ["Area"],
      idealModelAnswer: "Answer",
    }

    const parsed = MockInterviewEvaluationSchema.safeParse(incompleteSample)
    expect(parsed.success).toBe(false)
  })
})
