import { describe, it, expect, vi, beforeEach } from "vitest"
import { processProactiveFollowUpsForUser } from "@/inngest/functions/agent-proactive-daemon"
import { prisma } from "@/lib/prisma"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: {
      findMany: vi.fn(),
    },
    applicationAnalysis: {
      update: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
  withDbRetry: vi.fn((cb) => cb()),
}))

describe("Level 5 Proactive Lifecycle Daemon", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("detects stale applications applied > 7 days ago and generates proactive follow-up", async () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)

    const mockStaleApp = {
      id: "app-stale-1",
      userId: "u1",
      companyName: "Figma",
      jobTitle: "Senior Systems Engineer",
      status: "Applied",
      appliedAt: eightDaysAgo,
      updatedAt: eightDaysAgo,
      analysis: {
        id: "analysis-1",
        tailoredResumeJson: {},
      },
    }

    vi.mocked(prisma.application.findMany as any).mockResolvedValueOnce([mockStaleApp])
    vi.mocked(prisma.applicationAnalysis.update as any).mockResolvedValueOnce({})
    vi.mocked(prisma.notification.create as any).mockResolvedValueOnce({})

    const result = await processProactiveFollowUpsForUser("u1")

    expect(result.staleProcessed).toBe(1)
    expect(prisma.applicationAnalysis.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "analysis-1" },
        data: expect.objectContaining({
          tailoredResumeJson: expect.objectContaining({
            proactiveFollowUp: expect.objectContaining({
              subject: expect.stringContaining("Figma"),
            }),
          }),
        }),
      })
    )
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "u1",
          title: expect.stringContaining("Proactive Follow-up Ready"),
        }),
      })
    )
  })

  it("skips applications that already have an existing proactive follow-up draft", async () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)

    const mockAppWithFollowUp = {
      id: "app-stale-2",
      userId: "u1",
      companyName: "Linear",
      jobTitle: "Frontend Architect",
      status: "Applied",
      appliedAt: eightDaysAgo,
      analysis: {
        id: "analysis-2",
        tailoredResumeJson: {
          proactiveFollowUp: {
            subject: "Existing draft",
            body: "Already drafted",
          },
        },
      },
    }

    vi.mocked(prisma.application.findMany as any).mockResolvedValueOnce([mockAppWithFollowUp])

    const result = await processProactiveFollowUpsForUser("u1")

    expect(result.staleProcessed).toBe(0)
    expect(result.skippedAlreadyDrafted).toBe(1)
    expect(prisma.applicationAnalysis.update).not.toHaveBeenCalled()
  })
})
