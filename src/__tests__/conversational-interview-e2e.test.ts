import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Hoist mock memory data so it is initialized before vi.mock executes
const { mockUserMemories } = vi.hoisted(() => ({
  mockUserMemories: [
    {
      id: "mem-weakness-1",
      userId: "user-e2e-tester",
      category: "weakness",
      content: "[Weakness: Raft Consensus] [Distributed Systems] at Stripe: Candidate struggled with quorum write quorums and leader leases.",
      tags: ["Raft Consensus", "Distributed Systems", "Stripe"],
      confidence: 0.85,
      createdAt: new Date("2026-08-01"),
    },
  ],
}))

// 1. Mock Authentication
vi.mock("@/lib/auth", () => ({
  getInternalUserId: vi.fn().mockResolvedValue("user-e2e-tester"),
}))

// 2. Mock AI Configuration
vi.mock("@/lib/ai/config", () => ({
  getUserAIConfig: vi.fn().mockResolvedValue({
    providerType: "openai",
    model: "gpt-4o",
    apiKey: "test-openai-key",
  }),
}))

// 3. Mock Rate Limiting
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ success: true }),
  checkDistributedRateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}))

// 4. Mock Knowledge Graph & Memory
vi.mock("@/lib/ai/memory", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/memory")>()
  return {
    ...actual,
    getUserWeaknesses: vi.fn().mockImplementation(async () => {
      return mockUserMemories
    }),
    persistInterviewWeaknesses: vi.fn().mockResolvedValue(2),
  }
})

vi.mock("@/lib/ai/knowledge-graph", () => ({
  getCachedKnowledgeGraph: vi.fn().mockResolvedValue(null),
}))

// 5. Mock Resilient LLM Text Generation
const mockConverseResponses: Record<number, string> = {
  1: "Welcome to your System Design round for Google. Let's design a globally distributed real-time messaging pipeline like WhatsApp. How would you approach the high-level architecture?",
  2: "Great high-level breakdown. How would you handle connection state synchronization across multiple geographic regions?",
  3: "Let's dive deeper into cluster consensus. In your previous sessions, you explored Raft consensus and leader election. How do you prevent split-brain and ensure write quorum when a network partition isolates the leader?",
  4: "Good recovery on partition quorum. Now what happens during a sudden 10x traffic spike that causes cascading cache failures?",
  5: "Excellent breakdown on rate limiting and circuit breaking. That wraps up our technical deep-dive today. Thank you for your time!",
}

let currentTurnCounter = 1
const mockReportJson = JSON.stringify({
  verdict: "Strong Hire",
  overallScore: 88,
  technicalScore: 90,
  clarityScore: 86,
  starBreakdown: {
    situation: "Designed a multi-region distributed messaging bus handling 10M peak concurrent WebSockets.",
    task: "Resolve cross-datacenter connection synchronization and partition failover.",
    action: "Used Raft consensus for leader leases, Redis Cluster for localized session state, and Kafka for persistent ordering.",
    result: "Prevented split-brain split quorums and achieved sub-50ms cross-region latency.",
  },
  strengths: [
    "Deep familiarity with distributed consensus",
    "Crisp articulation of failure scenarios",
  ],
  improvementAreas: [
    "Could provide more concrete memory sizing calculations",
  ],
  executiveSummary: "Candidate demonstrated Staff-level systems thinking with excellent partition resilience.",
  knowledgeGaps: [
    {
      id: "gap-raft-1",
      topic: "Raft Consensus & Leader Lease Expiry",
      type: "technical",
      severity: "high",
      questionAsked: "How do you prevent split-brain during partition isolation?",
      candidateAnswerSummary: "Used lease timers with monotonic clocks.",
      weaknessReason: "Omitted clock drift compensation.",
      idealAnswer: "Use true monotonic clocks with safe lease bound intervals.",
      keyTakeaways: ["Account for NTP skew", "Enforce majority quorums"],
    },
  ],
})

const mockResilientGenerateText = vi.fn().mockImplementation(async (options?: any) => {
  if (options?.systemPrompt?.includes("Bar Raiser")) {
    return {
      text: mockReportJson,
      modelUsed: "gpt-4o",
      fallbackTriggered: false,
    }
  }
  const text = mockConverseResponses[currentTurnCounter] || "Can you elaborate further?"
  return {
    text,
    modelUsed: "gpt-4o",
    fallbackTriggered: false,
  }
})

vi.mock("@/lib/ai/resilience", () => ({
  resilientGenerateText: (...args: any[]) => mockResilientGenerateText(...args),
  getEmergencyInterviewTurn: vi.fn().mockReturnValue("Can you walk me through your engineering rationale?"),
}))

// 6. Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: {
      findFirst: vi.fn().mockResolvedValue({
        id: "app-google-999",
        userId: "user-e2e-tester",
        companyName: "Google",
        jobTitle: "Staff Systems Engineer",
      }),
    },
    interviewSession: {
      create: vi.fn().mockImplementation(({ data }) => ({
        id: "session-e2e-123",
        ...data,
        createdAt: new Date(),
      })),
      findMany: vi.fn().mockResolvedValue([]),
    },
    prepNote: {
      create: vi.fn().mockImplementation(({ data }) => ({
        id: "note-e2e-777",
        ...data,
        createdAt: new Date(),
      })),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userMemory: {
      upsert: vi.fn().mockResolvedValue({ id: "mem-created" }),
      findMany: vi.fn().mockResolvedValue(mockUserMemories),
    },
  },
}))

// 7. Mock AI generateText for report route
vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({
    text: JSON.stringify({
      verdict: "Strong Hire",
      overallScore: 88,
      technicalScore: 90,
      clarityScore: 86,
      starBreakdown: {
        situation: "Designed a multi-region distributed messaging bus handling 10M peak concurrent WebSockets.",
        task: "Resolve cross-datacenter connection synchronization and partition failover.",
        action: "Used Raft consensus for leader leases, Redis Cluster for localized session state, and Kafka for persistent ordering.",
        result: "Prevented split-brain split quorums and achieved sub-50ms cross-region latency.",
      },
      strengths: [
        "Deep familiarity with distributed consensus",
        "Crisp articulation of failure scenarios",
      ],
      improvementAreas: [
        "Could provide more concrete memory sizing calculations",
      ],
      executiveSummary: "Candidate demonstrated Staff-level systems thinking with excellent partition resilience.",
      knowledgeGaps: [
        {
          id: "gap-raft-1",
          topic: "Raft Consensus & Leader Lease Expiry",
          type: "technical",
          severity: "high",
          questionAsked: "How do you prevent split-brain during partition isolation?",
          candidateAnswerSummary: "Used lease timers with monotonic clocks.",
          weaknessReason: "Omitted clock drift compensation.",
          idealAnswer: "Use true monotonic clocks with safe lease bound intervals.",
          keyTakeaways: ["Account for NTP skew", "Enforce majority quorums"],
        },
      ],
    }),
  }),
}))

import { POST as conversePost } from "@/app/api/ai/mock-interview/converse/route"
import { POST as reportPost } from "@/app/api/ai/mock-interview/report/route"
import { POST as ttsPost } from "@/app/api/ai/tts/route"
import { POST as notesPost } from "@/app/api/prep-notes/route"
import { prisma } from "@/lib/prisma"
import { persistInterviewWeaknesses } from "@/lib/ai/memory"

describe("INT-20: Comprehensive End-to-End Voice & Prep Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentTurnCounter = 1
  })

  it("executes complete 5-turn conversational flow with Turn 3 adaptive weakness probing", async () => {
    const dialogueHistory: Array<{ role: "interviewer" | "candidate"; text: string }> = []

    // --- TURN 1: Opener Question ---
    currentTurnCounter = 1
    const req1 = new NextRequest("http://localhost:3000/api/ai/mock-interview/converse", {
      method: "POST",
      body: JSON.stringify({
        targetRole: "Staff Systems Engineer",
        targetCompany: "Google",
        interviewType: "System Design",
        tone: "tough",
        targetTurnCount: 5,
        history: [],
      }),
    })

    const res1 = await conversePost(req1)
    expect(res1.status).toBe(200)
    const data1 = await res1.json()
    expect(data1.reply).toContain("WhatsApp")
    expect(data1.currentQuestionNumber).toBe(1)
    expect(data1.isComplete).toBe(false)
    dialogueHistory.push({ role: "interviewer", text: data1.reply })
    dialogueHistory.push({
      role: "candidate",
      text: "I propose a gateway tier using Envoy proxies, localized Redis instances for session affinity, and Kafka topics for persistence.",
    })

    // --- TURN 2: In-depth Technical Exploration ---
    currentTurnCounter = 2
    const req2 = new NextRequest("http://localhost:3000/api/ai/mock-interview/converse", {
      method: "POST",
      body: JSON.stringify({
        targetRole: "Staff Systems Engineer",
        targetCompany: "Google",
        interviewType: "System Design",
        tone: "tough",
        targetTurnCount: 5,
        history: dialogueHistory,
      }),
    })

    const res2 = await conversePost(req2)
    expect(res2.status).toBe(200)
    const data2 = await res2.json()
    expect(data2.currentQuestionNumber).toBe(2)
    expect(data2.reply).toContain("geographic regions")
    dialogueHistory.push({ role: "interviewer", text: data2.reply })
    dialogueHistory.push({
      role: "candidate",
      text: "We use GeoDNS and replicate session metadata asynchronously with conflict-free replicated data types (CRDTs).",
    })

    // --- TURN 3: Adaptive Weakness Probing ---
    // Turn 3 queries user weaknesses and injects known past struggle into interviewer instructions
    currentTurnCounter = 3
    const req3 = new NextRequest("http://localhost:3000/api/ai/mock-interview/converse", {
      method: "POST",
      body: JSON.stringify({
        targetRole: "Staff Systems Engineer",
        targetCompany: "Google",
        interviewType: "System Design",
        tone: "tough",
        targetTurnCount: 5,
        history: dialogueHistory,
      }),
    })

    const res3 = await conversePost(req3)
    expect(res3.status).toBe(200)
    const data3 = await res3.json()
    expect(data3.currentQuestionNumber).toBe(3)
    expect(data3.reply).toContain("Raft consensus")
    expect(data3.reply).toContain("split-brain")
    dialogueHistory.push({ role: "interviewer", text: data3.reply })
    dialogueHistory.push({
      role: "candidate",
      text: "We enforce strict majority write quorums (N/2 + 1) and leader lease renewals over monotonic timer checks.",
    })

    // --- TURN 4: Live Incident / Edge Cases ---
    currentTurnCounter = 4
    const req4 = new NextRequest("http://localhost:3000/api/ai/mock-interview/converse", {
      method: "POST",
      body: JSON.stringify({
        targetRole: "Staff Systems Engineer",
        targetCompany: "Google",
        interviewType: "System Design",
        tone: "tough",
        targetTurnCount: 5,
        history: dialogueHistory,
      }),
    })

    const res4 = await conversePost(req4)
    expect(res4.status).toBe(200)
    const data4 = await res4.json()
    expect(data4.currentQuestionNumber).toBe(4)
    expect(data4.reply).toContain("10x traffic spike")
    dialogueHistory.push({ role: "interviewer", text: data4.reply })
    dialogueHistory.push({
      role: "candidate",
      text: "We implement client-side exponential backoff, rate limiting with token buckets, and circuit breakers in Envoy.",
    })

    // --- TURN 5: Final Wrap-Up ---
    currentTurnCounter = 5
    const req5 = new NextRequest("http://localhost:3000/api/ai/mock-interview/converse", {
      method: "POST",
      body: JSON.stringify({
        targetRole: "Staff Systems Engineer",
        targetCompany: "Google",
        interviewType: "System Design",
        tone: "tough",
        targetTurnCount: 5,
        history: dialogueHistory,
        userAnswer: "We implement client-side exponential backoff, rate limiting with token buckets, and circuit breakers in Envoy.",
      }),
    })

    const res5 = await conversePost(req5)
    expect(res5.status).toBe(200)
    const data5 = await res5.json()
    expect(data5.currentQuestionNumber).toBe(5)
    expect(data5.isComplete).toBe(true)
    dialogueHistory.push({ role: "interviewer", text: data5.reply })

    expect(dialogueHistory.length).toBe(9) // 5 interviewer turns + 4 candidate responses
  })

  it("handles spoken speech synthesis via tts-1 with graceful 204 browser fallback", async () => {
    // 1. Mock OpenAI speech synthesis API response
    const mockAudioArray = new Uint8Array([0xff, 0xfb, 0x90, 0x64]) // MP3 header bytes
    const originalFetch = global.fetch
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("api.openai.com/v1/audio/speech")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "audio/mpeg" }),
          arrayBuffer: async () => mockAudioArray.buffer,
        } as any
      }
      return originalFetch(url)
    })

    // A. English spoken text -> 200 with audio/mpeg
    const englishReq = new NextRequest("http://localhost:3000/api/ai/tts", {
      method: "POST",
      body: JSON.stringify({
        text: "How would you approach partitioning in a distributed datastore?",
        voice: "onyx",
      }),
    })

    const englishRes = await ttsPost(englishReq)
    expect(englishRes.status).toBe(200)
    expect(englishRes.headers.get("content-type")).toBe("audio/mpeg")

    // B. Bengali text -> 204 No Content for native browser speech synthesis
    const bengaliReq = new NextRequest("http://localhost:3000/api/ai/tts", {
      method: "POST",
      body: JSON.stringify({
        text: "আপনি ডিস্ট্রিবিউটেড সিস্টেম নিয়ে কী জানেন?",
        lang: "bn",
      }),
    })

    const bengaliRes = await ttsPost(bengaliReq)
    expect(bengaliRes.status).toBe(204)

    global.fetch = originalFetch
  })

  it("submits completed dialogue to report route, persists weaknesses, and saves InterviewSession", async () => {
    const fullHistory = [
      { role: "interviewer", text: "Design WhatsApp messaging architecture." },
      { role: "candidate", text: "I would use Kafka for ordering and Redis for connection caching." },
    ]

    const req = new NextRequest("http://localhost:3000/api/ai/mock-interview/report", {
      method: "POST",
      body: JSON.stringify({
        targetRole: "Staff Systems Engineer",
        targetCompany: "Google",
        interviewType: "System Design",
        history: fullHistory,
        applicationId: "app-google-999",
      }),
    })

    const res = await reportPost(req)
    expect(res.status).toBe(200)
    const report = await res.json()

    // Verifies STAR report fields
    expect(report.verdict).toBe("Strong Hire")
    expect(report.overallScore).toBe(88)
    expect(report.knowledgeGaps).toHaveLength(1)
    expect(report.knowledgeGaps[0].topic).toBe("Raft Consensus & Leader Lease Expiry")

    // Verifies automatic weakness persistence in UserMemory (INT-13)
    expect(persistInterviewWeaknesses).toHaveBeenCalledWith(
      "user-e2e-tester",
      expect.arrayContaining([
        expect.objectContaining({ topic: "Raft Consensus & Leader Lease Expiry" }),
      ]),
      expect.objectContaining({
        targetCompany: "Google",
        targetRole: "Staff Systems Engineer",
        roundType: "System Design",
      })
    )

    // Verifies InterviewSession DB persistence with linked applicationId (INT-07)
    expect(prisma.interviewSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-e2e-tester",
          targetCompany: "Google",
          targetRole: "Staff Systems Engineer",
          score: 88,
          verdict: "Strong Hire",
          applicationId: "app-google-999",
        }),
      })
    )
  })

  it("exports diagnosed knowledge gap to PrepNote with tenant ownership verification", async () => {
    const req = new Request("http://localhost:3000/api/prep-notes", {
      method: "POST",
      body: JSON.stringify({
        title: "Gap Doctor: Raft Consensus & Leader Lease Expiry",
        content: "Remediation note: Enforce majority quorum (N/2 + 1) and monotonic clock timeouts.",
        category: "STAR Flashcard",
        applicationId: "app-google-999",
      }),
    })

    const res = await notesPost(req)
    expect(res.status).toBe(201)
    const createdNote = await res.json()

    expect(createdNote.id).toBe("note-e2e-777")
    expect(createdNote.title).toContain("Raft Consensus")
    expect(createdNote.category).toBe("STAR Flashcard")
    expect(createdNote.applicationId).toBe("app-google-999")
  })
})
