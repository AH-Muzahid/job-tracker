// Regression tests converted from the audit defect reproductions.
import { describe, expect, it, vi } from "vitest"
import { auditFactualGrounding } from "@/lib/ai/factual-grounding"
import { runEvaluatorOptimizer } from "@/lib/ai/evaluator-optimizer"
import { validateSafePublicUrl } from "@/lib/ssrf"

const mocks = vi.hoisted(() => ({
  createResume: vi.fn().mockImplementation(async ({ data }) => ({ id: "audit-resume", ...data })),
  updateAnalysis: vi.fn().mockResolvedValue({}),
  persistGaps: vi.fn().mockResolvedValue(1),
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: { findFirst: vi.fn().mockResolvedValue(null) },
    resume: { findFirst: vi.fn().mockResolvedValue(null), create: mocks.createResume },
    userProfile: { findUnique: vi.fn().mockResolvedValue(null) },
    user: { findUnique: vi.fn().mockResolvedValue({ name: "Audit Candidate", email: "audit@example.test" }) },
    applicationAnalysis: {
      findUnique: vi.fn().mockResolvedValue({ applicationId: "foreign-application" }),
      update: mocks.updateAnalysis,
    },
  },
  withDbRetry: (fn: () => unknown) => fn(),
}))
vi.mock("@/lib/ai/knowledge-graph", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getCachedKnowledgeGraph: vi.fn().mockResolvedValue(null),
  buildCareerGraphFromText: vi.fn().mockReturnValue({ nodes: [], edges: [] }),
  traverseGraphForJD: vi.fn().mockReturnValue({ matchedSkills: [], matchScore: 0 }),
}))
vi.mock("@/lib/ai/learning-engine", () => ({ generateAdaptivePromptWeights: vi.fn().mockResolvedValue(null) }))
vi.mock("@/lib/ai/memory", () => ({
  getUserWeaknesses: vi.fn().mockResolvedValue([]), persistInterviewWeaknesses: mocks.persistGaps,
}))
vi.mock("@/lib/ai/agents/company-dossier-agent", () => ({
  compileCompanyDossier: vi.fn().mockRejectedValue(new Error("Not owned")),
}))
vi.mock("@/lib/ai/resilience", () => ({ resilientGenerateText: vi.fn().mockRejectedValue(new Error("Provider offline")) }))

describe("AI audit regression tests (no live services)", () => {
  it("rejects IPv4-mapped IPv6 loopback URLs through the SSRF guard", () => {
    expect(validateSafePublicUrl("http://[::ffff:127.0.0.1]/").isValid).toBe(false)
  })
  it("rejects a made-up employer and low percentage metric with empty evidence", () => {
    const audit = auditFactualGrounding("I worked at Acme for five years and reduced latency by 35%.", {})
    expect(audit.isFullyGrounded).toBe(false)
    expect(audit.unsupportedClaims.length).toBeGreaterThan(0)
  })
  it("withholds an invented conversion score when the semantic judge fails", async () => {
    const result = await runEvaluatorOptimizer({
      generator: async () => "Hello hiring team", rubric: { minCharacters: 5 },
      semanticJudge: async () => { throw new Error("Judge unavailable") },
    })
    expect(result.passed).toBe(false)
    expect(result.conversionScore).toBeUndefined()
    expect(result.conversionJudge).toBeNull()
  })
  it("does not save a resume without an owned application", async () => {
    const { executeTailorResumeForJob } = await import("@/lib/ai/graph/tools/resume-tools")
    const result = await executeTailorResumeForJob("audit-user", { jobDescription: "Seeking a backend software engineer" })
    expect(result.success).toBe(false)
    expect(mocks.createResume).not.toHaveBeenCalled()
  })
  it("rejects foreign application before evaluation or memory writes", async () => {
    const { runInterviewCoachPipeline } = await import("@/lib/ai/graph/workflows/interview-coach")
    await expect(runInterviewCoachPipeline({ userId: "audit-user", applicationId: "foreign-application", targetRole: "Engineer", targetCompany: "Acme", dialogue: [{ role: "assistant", text: "Explain caching" }, { role: "user", text: "I do not know" }] })).rejects.toThrow("Application not found")
    expect(mocks.updateAnalysis).not.toHaveBeenCalled()
    expect(mocks.persistGaps).not.toHaveBeenCalled()
  })
})
