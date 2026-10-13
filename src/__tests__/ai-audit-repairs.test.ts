import { beforeEach, describe, expect, it, vi } from "vitest"
import { assertContextBudget } from "@/lib/ai/context-budget"
import { redactTelemetry } from "@/lib/ai/telemetry-redaction"
import { InterviewReportSchema } from "@/lib/ai/interview-report-schema"
import { ResumeRequestSchema, buildVerifiedResume } from "@/lib/ai/verified-resume"
import { withExecutionLock, acquireAgentLease } from "@/lib/ai/execution-lock"
import { deduplicateDelivery, sideEffectKey } from "@/lib/ai/side-effect-dedup"
import { getLangChainChatModel } from "@/lib/ai/graph/llm"
import { ChatAnthropic } from "@langchain/anthropic"
import { auditFactualGrounding, extractEvidenceTechMentions } from "@/lib/ai/factual-grounding"

const db = vi.hoisted(() => ({
  owned: vi.fn(), user: vi.fn(), profile: vi.fn(), resume: vi.fn(), upsert: vi.fn(), existing: vi.fn(),
  lock: vi.fn(), transaction: vi.fn(), redis: vi.fn(),
}))
vi.mock("@/lib/prisma", () => ({ prisma: {
  application: { findFirst: db.owned }, user: { findUnique: db.user }, userProfile: { findUnique: db.profile }, resume: { findFirst: db.resume },
  applicationAnalysis: { upsert: db.upsert, findUnique: db.existing }, $executeRaw: db.upsert, $transaction: db.transaction,
}, withDbRetry: (task: () => unknown) => task() }))
vi.mock("@/lib/redis", () => ({ getRedisClient: db.redis }))

describe("AI audit release regression gate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db.owned.mockResolvedValue({ id: "app", userId: "owner", companyName: "Acme", jobTitle: "Engineer" })
    db.user.mockResolvedValue({ name: "Candidate", email: "candidate@example.test" })
    db.profile.mockResolvedValue(null); db.resume.mockResolvedValue(null); db.existing.mockResolvedValue(null)
    db.lock.mockResolvedValue([{ acquired: true }]); db.upsert.mockResolvedValue(1)
    db.transaction.mockImplementation(async (task) => task({ $queryRaw: db.lock }))
    db.redis.mockReturnValue(null)
  })
  it("rejects foreign resume assets before candidate reads or writes", async () => {
    db.owned.mockResolvedValue(null)
    await expect(buildVerifiedResume("owner", { jdText: "Looking for an engineer", applicationId: "foreign" })).rejects.toThrow("Application not found")
    expect(db.resume).not.toHaveBeenCalled(); expect(db.upsert).not.toHaveBeenCalled()
  })
  it("rejects empty evidence rather than filling sections with invented facts", async () => {
    await expect(buildVerifiedResume("owner", { jdText: "Looking for an engineer", applicationId: "app" })).rejects.toThrow("Add your resume")
    expect(db.upsert).not.toHaveBeenCalled()
  })
  it("does not turn learning goals or negative statements into skill proof", () => {
    expect(extractEvidenceTechMentions("I am learning Rust.\nNo experience in Kubernetes.\nMy project uses React.")).toEqual(["react"])
    expect(auditFactualGrounding("Expert in Rust", { profile: { strengths: "React" } }).isFullyGrounded).toBe(false)
    expect(auditFactualGrounding("আমি React ব্যবহার করেছি এবং latency ৩৫% কমিয়েছি।", { profile: { strengths: "React" } }).isFullyGrounded).toBe(false)
  })
  it("copies only supplied skills/projects into an application-owned package", async () => {
    db.profile.mockResolvedValue({ strengths: "React", bestProjects: [{ name: "Portfolio", stack: "React", description: "A React portfolio" }] })
    const result = await buildVerifiedResume("owner", { jdText: "We need React and Kubernetes", applicationId: "app" })
    expect(result.data.experience).toEqual([]); expect(result.data.education).toEqual([])
    expect(result.data.skillsByDomain[0].skills).toEqual(["react"])
    expect(result.data.projects[0].name).toBe("Portfolio")
    expect(db.upsert.mock.calls[0].slice(1)).toContain("app")
    expect(db.upsert.mock.calls[0].slice(1)).toContain("owner")
  })
  it("keeps unlinked previews transient and unknown fit unscored", async () => {
    db.profile.mockResolvedValue({ strengths: "React" })
    const result = await buildVerifiedResume("owner", { jdText: "General role without technical tags" })
    expect(result.previewOnly).toBe(true); expect(result.matchScore).toBeUndefined(); expect(db.upsert).not.toHaveBeenCalled()
  })
  it("bounds payloads and validates generated assessments", () => {
    expect(ResumeRequestSchema.safeParse({ jdText: "x".repeat(30001) }).success).toBe(false)
    expect(InterviewReportSchema.safeParse({ verdict: "Hire", overallScore: 150 }).success).toBe(false)
    expect(() => assertContextBudget("", [{ content: "x".repeat(100000) }])).toThrow()
  })
  it("redacts nested identity, secrets, email addresses and graph instructions", () => {
    const result = JSON.stringify(redactTelemetry({ nested: { apiKey: "sk-secret-key-123456", candidateName: "Jane", contact: "jane@example.test", body: "private experience", plan: [{ token: "secret" }] } }))
    expect(result).not.toContain("Jane"); expect(result).not.toContain("jane@example.test"); expect(result).not.toContain("private experience"); expect(result).not.toContain("sk-secret")
  })
  it("uses native Anthropic transport for native and custom Anthropic configs", () => {
    expect(getLangChainChatModel({ providerType: "anthropic", apiKey: "test", model: "test-model" })).toBeInstanceOf(ChatAnthropic)
    expect(getLangChainChatModel({ providerType: "custom-anthropic", apiKey: "test", baseUrl: "https://gateway.example.test", model: "test-model" })).toBeInstanceOf(ChatAnthropic)
  })
  it("rejects concurrent lock acquisition before side effects", async () => {
    db.lock.mockResolvedValue([{ acquired: false }]); const task = vi.fn()
    await expect(withExecutionLock("user", task)).rejects.toThrow("Another action is running")
    expect(task).not.toHaveBeenCalled()
  })
  it("holds a stream lease until explicit release and never fails open on DB errors", async () => {
    const release = await acquireAgentLease("user"); expect(db.transaction).toHaveBeenCalledTimes(1)
    await release()
    db.transaction.mockRejectedValue(new Error("DB unavailable"))
    await expect(acquireAgentLease("user")).rejects.toThrow("DB unavailable")
  })
  it("returns accepted delivery receipt on retry without sending again", async () => {
    const send = vi.fn().mockResolvedValue({ success: true, id: "accepted" })
    const key = sideEffectKey("audit-retry", ["unique@example.test", "Subject", "Body"])
    await deduplicateDelivery(key, send); await deduplicateDelivery(key, send)
    expect(send).toHaveBeenCalledTimes(1)
  })
  it("fails closed when production dedup storage is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const send = vi.fn()
    try { await expect(deduplicateDelivery("key", send)).rejects.toThrow("storage unavailable"); expect(send).not.toHaveBeenCalled() }
    finally { vi.unstubAllEnvs() }
  })
})
