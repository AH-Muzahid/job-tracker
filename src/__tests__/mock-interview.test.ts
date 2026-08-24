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

  it("validates KnowledgeGapItem structure with 10/10 ideal answer and STAR breakdown", () => {
    const gapSample = {
      id: "gap-redis-cache",
      topic: "Distributed Cache Stampede & Invalidation",
      type: "technical" as const,
      severity: "high" as const,
      questionAsked: "How do you handle cache invalidation during flash sales?",
      candidateAnswerSummary: "Mentioned simple Redis TTL but did not address race conditions.",
      weaknessReason: "Lacked proactive distributed lock (mutex) and probabilistic early expiration (XFetch algorithm).",
      idealAnswer:
        "To prevent cache stampede during flash sales, I employ the Cache-Aside pattern coupled with distributed mutex locking using Redlock and probabilistic early recomputation (XFetch algorithm). Keys are assigned a jittered TTL to avoid synchronized expiration.",
      starBreakdown: {
        situation: "Flash sales drove 100k req/s causing DB thundering herd spikes.",
        task: "Eliminate DB lock contention on expired cached product rows.",
        action: "Implemented Redlock distributed mutexes and asynchronous cache warming background jobs.",
        result: "Reduced DB load spikes by 92% and kept cache hit ratio above 99.4%.",
      },
      keyTakeaways: [
        "Always jitter TTLs to prevent synchronized expiration",
        "Use distributed mutex locking for hot key recomputation",
        "Implement proactive background cache warming",
      ],
      followUpPracticePrompt: "How would you handle cache stampede across multi-region replica clusters?",
    }

    expect(gapSample.id).toBe("gap-redis-cache")
    expect(gapSample.severity).toBe("high")
    expect(gapSample.starBreakdown.action).toContain("Implemented Redlock")
    expect(gapSample.keyTakeaways.length).toBe(3)
  })
})
