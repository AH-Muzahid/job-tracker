import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  buildInterviewCoachGraph,
  runInterviewCoachPipeline,
} from "@/lib/ai/graph/workflows/interview-coach"
import { getUserWeaknesses, persistInterviewWeaknesses } from "@/lib/ai/memory"
import { compileCompanyDossier } from "@/lib/ai/agents/company-dossier-agent"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userMemory: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "mem-1" }),
    },
    application: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
  withDbRetry: vi.fn((fn) => fn()),
}))

vi.mock("@/lib/ai/memory", () => ({
  getUserWeaknesses: vi.fn().mockResolvedValue([
    {
      id: "weakness-1",
      userId: "user-123",
      category: "weakness",
      content: "[Weakness: Kafka Partitions] Struggles with partition key selection",
      confidence: 0.9,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  persistInterviewWeaknesses: vi.fn().mockResolvedValue(1),
}))

vi.mock("@/lib/ai/agents/company-dossier-agent", () => ({
  compileCompanyDossier: vi.fn().mockResolvedValue({
    success: true,
    dossier: {
      companyOverview: "OpenAI is an AI research and deployment company.",
      techStackHighlights: ["Python", "Kubernetes", "Triton"],
      curatedInterviewQuestions: ["Scaling GPU clusters"],
      questionsToAskPanel: ["How do you handle node failure?"],
      rawMarkdownCheatsheet: "### 🏢 Company Overview: OpenAI",
    },
  }),
}))

describe("INT-18: LangGraph Subgraph for End-to-End Interview Coach", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("compiles the InterviewCoach StateGraph successfully", () => {
    const graph = buildInterviewCoachGraph()
    expect(graph).toBeDefined()
    expect(typeof graph.invoke).toBe("function")
  })

  it("executes Preparation Mode: Dossier Gathering -> Weakness Retrieval -> Question Formulation", async () => {
    const result = await runInterviewCoachPipeline({
      userId: "user-123",
      applicationId: "app-openai-1",
      targetCompany: "OpenAI",
      targetRole: "Research Infrastructure Engineer",
      roundType: "System Design",
      dialogue: [], // Empty dialogue: triggers preparation flow
    })

    expect(result.status).toBe("ready")
    expect(result.formulatedQuestions.length).toBe(4)
    expect(result.dossier).toBeDefined()
    expect(result.dossier?.companyOverview).toContain("OpenAI")
    expect(result.pastWeaknesses.length).toBe(1)

    // Verify adaptive weakness probing in Turn 3
    const turn3 = result.formulatedQuestions[2]
    expect(turn3.question).toContain("Kafka Partitions")
    expect(turn3.probingWeakness).toBe(
      "[Weakness: Kafka Partitions] Struggles with partition key selection"
    )

    // Verify audit logs
    const actions = result.auditLog.map((log: any) => log.action)
    expect(actions).toContain("DOSSIER_GATHERING")
    expect(actions).toContain("WEAKNESS_RETRIEVAL")
    expect(actions).toContain("QUESTION_FORMULATION")
  })

  it("executes Full Cycle Mode with dialogue: STAR Evaluation & Longitudinal Memory Tracking", async () => {
    const sampleDialogue = [
      {
        role: "interviewer",
        text: "Tell me about a time you scaled a system under heavy traffic load.",
      },
      {
        role: "candidate",
        text: "At my last company, our API gateway faced 100k QPS spikes during flash sales. I introduced Redis cluster rate limiting with token bucket algorithms, mitigating load spikes and keeping p99 latency below 35ms.",
      },
    ]

    const result = await runInterviewCoachPipeline({
      userId: "user-123",
      targetCompany: "Datadog",
      targetRole: "Staff Backend Engineer",
      roundType: "Technical",
      dialogue: sampleDialogue,
    })

    expect(result.status).toBe("completed")
    expect(result.evaluationReport).toBeDefined()
    expect(result.evaluationReport?.verdict).toBeDefined()
    expect(result.evaluationReport?.overallScore).toBeGreaterThan(0)
    expect(result.evaluationReport?.starBreakdown).toBeDefined()

    // Verify longitudinal tracking was called
    expect(persistInterviewWeaknesses).toHaveBeenCalledWith(
      "user-123",
      expect.any(Array),
      expect.objectContaining({
        targetCompany: "Datadog",
        targetRole: "Staff Backend Engineer",
        roundType: "Technical",
      })
    )

    // Verify full audit log lifecycle
    const actions = result.auditLog.map((log: any) => log.action)
    expect(actions).toContain("STAR_EVALUATION")
    expect(actions).toContain("LONGITUDINAL_TRACKING")
  })
})
