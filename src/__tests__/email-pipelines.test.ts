import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({
  user: vi.fn(), count: vi.fn(), applications: vi.fn(), matches: vi.fn(), notification: vi.fn(), existing: vi.fn(),
  evaluate: vi.fn(), send: vi.fn(), refresh: vi.fn(), goals: vi.fn(), changes: vi.fn(),
}))
vi.mock("@/lib/prisma", () => ({ prisma: {
  user: { findUnique: mocks.user }, application: { count: mocks.count, findMany: mocks.applications },
  userJobMatch: { findMany: mocks.matches }, notification: { create: mocks.notification, findFirst: mocks.existing },
  weeklyGoal: { findMany: mocks.goals }, statusChange: { count: mocks.changes },
}, withDbRetry: (fn: () => unknown) => fn() }))
vi.mock("@/lib/ai/briefing", () => ({ generateCareerBriefing: mocks.evaluate }))
vi.mock("@/inngest/functions/batch-job-pipeline", () => ({ processUserJobBatch: mocks.refresh }))
vi.mock("@/lib/applications/follow-up-engine", () => ({ generateFollowUpDraft: vi.fn(), stageFollowUpForApplication: vi.fn() }))
vi.mock("@/lib/email", async (original) => ({ ...await original<typeof import("@/lib/email")>(), sendEmail: mocks.send }))
import { processUserAuditBatch } from "@/inngest/functions/daily-job-hunt"
import { interviewReminderPipeline } from "@/inngest/functions/interview-reminder-pipeline"
import { weeklyGoalDigestFunction } from "@/inngest/functions/weekly-goal-digest"
import { PLANNING_ERROR_FALLBACK } from "@/lib/ai/graph/constants"

type Handler = (context: { event: { id: string; data: { userIds: string[] } }; step: { run: (name: string, fn: () => unknown) => Promise<unknown> } }) => Promise<unknown>
const context = () => ({ event: { id: "event-1", data: { userIds: ["user-1"] } }, step: { run: vi.fn(async (_name: string, fn: () => unknown) => fn()) } })
const run = (fn: unknown, ctx = context()) => (fn as { fn: Handler }).fn(ctx)
beforeEach(() => {
  vi.resetAllMocks()
  mocks.user.mockResolvedValue({ id: "user-1", name: "Sam", email: "sam@example.com", profile: { minMatchScore: 95, notifyEmail: true } })
  mocks.count.mockResolvedValue(2); mocks.applications.mockResolvedValue([]); mocks.matches.mockResolvedValue([])
  mocks.evaluate.mockResolvedValue({ success: true, content: PLANNING_ERROR_FALLBACK })
  mocks.send.mockResolvedValue({ success: true, id: "mail-1" }); mocks.existing.mockResolvedValue(null)
})
describe("daily email integration", () => {
  it("replaces planner failure with factual actions and correct filtered counts", async () => {
    mocks.matches.mockResolvedValue([{ fitScore: 90, job: { id: "job-1", title: "Engineer", company: "X" } }])
    await run(processUserAuditBatch)
    expect(mocks.notification).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ message: expect.stringContaining("2 active applications"), title: "Daily Career Pipeline Briefing" }) }))
    expect(mocks.send.mock.calls[0][0].html).not.toContain(PLANNING_ERROR_FALLBACK)
    expect(mocks.send.mock.calls[0][0].idempotencyKey).toBe("daily-briefing/event-1/user-1")
  })
  it("respects opt-out", async () => {
    mocks.user.mockResolvedValue({ id: "user-1", email: "sam@example.com", profile: { notifyEmail: false } })
    await run(processUserAuditBatch); expect(mocks.send).not.toHaveBeenCalled()
  })
  it("surfaces delivery failure from its isolated retry step", async () => {
    mocks.send.mockResolvedValue({ success: false }); const ctx = context()
    await expect(run(processUserAuditBatch, ctx)).rejects.toThrow("email delivery failed")
    expect(ctx.step.run).toHaveBeenCalledWith("email-user-user-1", expect.any(Function))
  })
})
describe("interview delivery integration", () => {
  const interview = (notifyEmail = true) => ({ id: "app-1", userId: "user-1", companyName: "Stripe", jobTitle: "Engineer", interviewDate: new Date(Date.now() + 20 * 60 * 1000), user: { email: "sam@example.com", profile: { notifyEmail } } })
  it("covers the last 30 minutes before an interview", async () => {
    mocks.applications.mockResolvedValue([interview()]); expect(await run(interviewReminderPipeline)).toMatchObject({ remindersSent2h: 1 })
    expect(mocks.send).toHaveBeenCalledOnce()
  })
  it("does not persist a sent marker for rejected delivery", async () => {
    mocks.applications.mockResolvedValue([interview()]); mocks.send.mockResolvedValue({ success: false })
    await expect(run(interviewReminderPipeline)).rejects.toThrow("email delivery failed")
    expect(mocks.notification).not.toHaveBeenCalled()
  })
  it("keeps in-app reminders when email is disabled", async () => {
    mocks.applications.mockResolvedValue([interview(false)]); await run(interviewReminderPipeline)
    expect(mocks.send).not.toHaveBeenCalled(); expect(mocks.notification).toHaveBeenCalledOnce()
  })
  it("does not count already-notified interviews again", async () => {
    mocks.applications.mockResolvedValue([interview()]); mocks.existing.mockResolvedValue({ id: "existing" })
    expect(await run(interviewReminderPipeline)).toMatchObject({ remindersSent2h: 0 }); expect(mocks.send).not.toHaveBeenCalled()
  })
})
describe("weekly email integration", () => {
  it("uses measured progress when AI fails and obeys opt-out", async () => {
    mocks.goals.mockResolvedValue([{ id: "goal-1", userId: "user-1", weekStart: new Date(), goal1: "Apply", goal1Status: "Active", user: { email: "sam@example.com", profile: { notifyEmail: false } } }])
    mocks.changes.mockResolvedValue(1)
    await run(weeklyGoalDigestFunction)
    expect(mocks.notification.mock.calls[0][0].data.message).toContain("Applications logged: 2")
    expect(mocks.send).not.toHaveBeenCalled()
  })
})
